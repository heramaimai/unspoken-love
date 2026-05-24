"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { AUDIO_RECORDING_GUIDE, MATERIAL_FIELD_GUIDES } from "@/lib/material-guide";
import {
  CONVERSATION_MODE_LABELS,
  DEPARTURE_TYPE_LABELS,
  getWelcomeMessage,
  LOCAL_STORAGE_HINT,
  MATERIAL_SOURCE_LABELS,
  PRIVACY_NOTICE,
  REALISM_LEVEL_LABELS,
  RELATIONSHIP_OPTIONS,
} from "@/lib/persona-prompts";
import {
  clearPersonaMessages,
  deletePersona,
  loadConversations,
  loadCurrentPersonaId,
  loadPersonas,
  saveCurrentPersonaId,
  savePersonaMessages,
  savePersonas,
} from "@/lib/storage";
import type {
  ConversationMode,
  DepartureType,
  MaterialSourceType,
  PersonaMaterialFields,
  PersonaProfile,
  RealismLevel,
} from "@/lib/types";
import MobiusCanvas from "./MobiusCanvas";
import AmbientSoundscape from "./AmbientSoundscape";

type Screen = "home" | "create" | "chat";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type CreateFormState = {
  name: string;
  relationship: string;
  departureType: DepartureType;
  conversationMode: ConversationMode;
  materialSourceType: MaterialSourceType;
  realismLevel: RealismLevel;
  description: string;
  sourceText: string;
} & PersonaMaterialFields;

const EMPTY_MATERIAL: PersonaMaterialFields = {
  catchphrases: "",
  speechTranscript: "",
  personalityTraits: "",
  desiredPresence: "",
  treatmentStyle: "",
  memorableMoments: "",
  audioTranscript: "",
  additionalNotes: "",
};

const initialForm: CreateFormState = {
  name: "",
  relationship: RELATIONSHIP_OPTIONS[0],
  departureType: "passed_away",
  conversationMode: "companion",
  materialSourceType: "real_record",
  realismLevel: "echo",
  description: "",
  sourceText: "",
  ...EMPTY_MATERIAL,
};

export default function CompanionApp() {
  const [screen, setScreen] = useState<Screen>("home");
  const [personas, setPersonas] = useState<PersonaProfile[]>([]);
  const [currentPersonaId, setCurrentPersonaId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [form, setForm] = useState<CreateFormState>(initialForm);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [chatError, setChatError] = useState("");
  const [createError, setCreateError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [archivesOpen, setArchivesOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const currentPersona = personas.find((item) => item.id === currentPersonaId) ?? null;

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    const savedPersonas = loadPersonas();
    const savedCurrentId = loadCurrentPersonaId();
    setPersonas(savedPersonas);
    setCurrentPersonaId(savedCurrentId);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isSending]);

  function refreshPersonas(nextPersonas: PersonaProfile[], nextCurrentId?: string | null) {
    setPersonas(nextPersonas);
    savePersonas(nextPersonas);

    const resolvedId =
      nextCurrentId !== undefined
        ? nextCurrentId
        : nextPersonas.some((item) => item.id === currentPersonaId)
          ? currentPersonaId
          : (nextPersonas[0]?.id ?? null);

    setCurrentPersonaId(resolvedId);
    saveCurrentPersonaId(resolvedId);

    if (resolvedId) {
      setMessages(loadConversations()[resolvedId] || []);
    } else {
      setMessages([]);
    }
  }

  function openChat(personaId: string) {
    setCurrentPersonaId(personaId);
    saveCurrentPersonaId(personaId);
    setMessages(loadConversations()[personaId] || []);
    setScreen("chat");
    setMenuOpen(false);
  }

  function handleDeletePersona(personaId: string) {
    if (!window.confirm("确定删除这份未竟之言档案吗？相关对话也会一并删除。")) {
      return;
    }

    deletePersona(personaId);
    const nextPersonas = loadPersonas();
    const nextCurrentId = loadCurrentPersonaId();
    refreshPersonas(nextPersonas, nextCurrentId);
    setScreen(nextPersonas.length > 0 && nextCurrentId ? "chat" : "home");
    setMenuOpen(false);
  }

  function handleClearConversations() {
    if (!currentPersonaId) {
      return;
    }

    if (!window.confirm("确定删除与TA的全部对话吗？档案会保留。")) {
      return;
    }

    clearPersonaMessages(currentPersonaId);
    setMessages([]);
    setMenuOpen(false);
  }

  async function handleCreatePersona(event: FormEvent) {
    event.preventDefault();
    setCreateError("");
    setIsCreating(true);

    try {
      const roleLabel = form.relationship;

      const response = await fetch("/api/distill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          roleLabel,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "生成档案失败");
      }

      const now = new Date().toISOString();
      const persona: PersonaProfile = {
        id: crypto.randomUUID(),
        name: form.name.trim(),
        relationship: form.relationship,
        roleLabel,
        departureType: form.departureType,
        conversationMode: form.conversationMode,
        materialSourceType: form.materialSourceType,
        realismLevel: form.realismLevel,
        description: form.description.trim(),
        sourceText: form.sourceText.trim(),
        catchphrases: form.catchphrases.trim(),
        speechTranscript: form.speechTranscript.trim(),
        personalityTraits: form.personalityTraits.trim(),
        desiredPresence: form.desiredPresence.trim(),
        treatmentStyle: form.treatmentStyle.trim(),
        memorableMoments: form.memorableMoments.trim(),
        audioTranscript: form.audioTranscript.trim(),
        additionalNotes: form.additionalNotes.trim(),
        ...data.distilled,
        createdAt: now,
        updatedAt: now,
      };

      const nextPersonas = [...loadPersonas(), persona];
      savePersonas(nextPersonas);
      saveCurrentPersonaId(persona.id);
      savePersonaMessages(persona.id, []);

      setPersonas(nextPersonas);
      setCurrentPersonaId(persona.id);
      setMessages([]);
      setForm(initialForm);
      setScreen("chat");
    } catch (error) {
      setCreateError(toFriendlyError(error, "生成档案失败"));
    } finally {
      setIsCreating(false);
    }
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();

    if (!currentPersona) {
      return;
    }

    const cleanMessage = message.trim();
    if (!cleanMessage) {
      return;
    }

    setChatError("");
    setMessage("");
    setIsSending(true);

    const previousMessages = messages;
    const nextHistory = [...messages, { role: "user" as const, content: cleanMessage }];
    setMessages(nextHistory);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          persona: currentPersona,
          history: previousMessages,
          message: cleanMessage,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "聊天失败");
      }

      const finalMessages = [...nextHistory, { role: "assistant" as const, content: data.reply }];
      setMessages(finalMessages);
      savePersonaMessages(currentPersona.id, finalMessages);
    } catch (error) {
      setMessages(previousMessages);
      setChatError(toFriendlyError(error, "聊天失败"));
    } finally {
      setIsSending(false);
    }
  }

  async function handleCreateFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    const texts = await Promise.all(files.map((file) => file.text()));
    const combined = texts.join("\n\n");

    setForm((current) => ({
      ...current,
      sourceText: current.sourceText ? `${current.sourceText}\n\n${combined}` : combined,
    }));
    event.target.value = "";
  }

  function updateMaterial(key: keyof PersonaMaterialFields, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  if (screen === "home") {
    return (
      <main className="app-shell immersive-home">
        <MobiusCanvas />
        <AmbientSoundscape active />
        <section className="home-overlay">
          <header className="home-hero">
            <p className="brand">未竟之言</p>
            <h1>这些未说完的话，是Ta留给你最珍贵的礼物</h1>
            <p className="lead">
              制造一场与逝去的人、离开的人、再也找不回的人的记忆对话，在赛博世界里，你们永远陪伴彼此。
            </p>
            <p className="home-hint">有些话在心里放久了，会变成另一个房间。</p>
          </header>

          <div className="home-actions">
            <button type="button" className="primary-glow" onClick={() => setScreen("create")}>
              进入我们的世界
            </button>
            {personas.length === 0 ? (
              <p className="home-subcopy">
                还没有档案。进入后，我们会引导你整理材料，生成第一份未竟之言。
              </p>
            ) : null}
          </div>

          {personas.length > 0 ? (
            <section className="home-archives">
              <button
                type="button"
                className="archives-toggle"
                onClick={() => setArchivesOpen((open) => !open)}
              >
                {archivesOpen ? "收起已有档案" : `已有 ${personas.length} 份档案`}
              </button>
              {archivesOpen ? (
                <ul className="archives-list">
                  {personas.map((persona) => (
                    <li key={persona.id}>
                      <button type="button" className="persona-card" onClick={() => openChat(persona.id)}>
                        <strong>{persona.name}</strong>
                        <span>
                          {persona.roleLabel} · {CONVERSATION_MODE_LABELS[persona.conversationMode].label}
                        </span>
                      </button>
                      <button
                        type="button"
                        className="secondary danger-text"
                        onClick={() => handleDeletePersona(persona.id)}
                      >
                        删除
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}

          <footer className="home-footer">
            <p className="auxiliary">
              上传聊天记录、信件、逐字稿、日记或回忆片段，系统会提取 TA 的语言风格、情绪温度和你们之间的关系模式。
            </p>
            <aside className="notice-box">
              <p>{PRIVACY_NOTICE}</p>
              <p className="small">{LOCAL_STORAGE_HINT}</p>
            </aside>
          </footer>
        </section>
      </main>
    );
  }

  if (screen === "create") {
    return (
      <main className="app-shell">
        <section className="form-screen">
          <header className="form-header">
            <button type="button" className="secondary" onClick={() => setScreen("home")}>
              返回
            </button>
            <div>
              <h1>创建一份未竟之言</h1>
              <p>
                材料越具体，回声越接近 TA 曾经的方式。下面会引导你整理 TA 的说话习惯、性格与相处方式——不必一次写全，但请尽量给出真实片段。
              </p>
            </div>
          </header>

          <form className="create-form" onSubmit={handleCreatePersona}>
            <section className="form-section">
              <h2>基础信息</h2>

              <div className="field">
                <label htmlFor="name">你想怎样称呼 TA？</label>
                <input
                  id="name"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder="比如：外婆、爸爸、阿宁、我的老师、那个离开的人"
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="relationship">TA 和你的关系是？</label>
                <select
                  id="relationship"
                  value={form.relationship}
                  onChange={(event) => setForm({ ...form, relationship: event.target.value })}
                >
                  {RELATIONSHIP_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <fieldset className="field">
                <legend>TA 为什么无法再和你正常对话？</legend>
                {(Object.entries(DEPARTURE_TYPE_LABELS) as [DepartureType, string][]).map(
                  ([value, label]) => (
                    <label className="radio-row" key={value}>
                      <input
                        type="radio"
                        name="departureType"
                        value={value}
                        checked={form.departureType === value}
                        onChange={() => setForm({ ...form, departureType: value })}
                      />
                      {label}
                    </label>
                  ),
                )}
              </fieldset>

              <fieldset className="field">
                <legend>你想用哪种方式和 TA 对话？</legend>
                {(Object.entries(CONVERSATION_MODE_LABELS) as [ConversationMode, typeof CONVERSATION_MODE_LABELS.companion][]).map(
                  ([value, item]) => (
                    <label className="radio-row" key={value}>
                      <input
                        type="radio"
                        name="conversationMode"
                        value={value}
                        checked={form.conversationMode === value}
                        onChange={() => setForm({ ...form, conversationMode: value })}
                      />
                      {item.label}：{item.description}
                    </label>
                  ),
                )}
              </fieldset>

              <fieldset className="field">
                <legend>你提供的材料主要来自哪里？</legend>
                {(Object.entries(MATERIAL_SOURCE_LABELS) as [MaterialSourceType, typeof MATERIAL_SOURCE_LABELS.real_record][]).map(
                  ([value, item]) => (
                    <label className="radio-row" key={value}>
                      <input
                        type="radio"
                        name="materialSourceType"
                        value={value}
                        checked={form.materialSourceType === value}
                        onChange={() => setForm({ ...form, materialSourceType: value })}
                      />
                      {item.label}：{item.description}
                    </label>
                  ),
                )}
              </fieldset>

              <fieldset className="field">
                <legend>你希望 TA 的回应更接近哪一种？</legend>
                {(Object.entries(REALISM_LEVEL_LABELS) as [RealismLevel, string][]).map(
                  ([value, label]) => (
                    <label className="radio-row" key={value}>
                      <input
                        type="radio"
                        name="realismLevel"
                        value={value}
                        checked={form.realismLevel === value}
                        onChange={() => setForm({ ...form, realismLevel: value })}
                      />
                      {label}
                    </label>
                  ),
                )}
              </fieldset>

              <div className="field">
                <label htmlFor="description">你为什么想再次和 TA 说话？</label>
                <textarea
                  id="description"
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                  placeholder="可以写下你没说完的话、没问出口的问题、没来得及告别的部分。"
                />
              </div>
            </section>

            <section className="form-section material-section">
              <h2>帮助 AI 认识 TA</h2>
              <p className="section-intro">
                回声档案的质量，取决于你提供的语言细节。请尽量使用 TA 的原话，而不是你的概括。
              </p>

              {MATERIAL_FIELD_GUIDES.map((field) => (
                <div className="field" key={field.key}>
                  <label htmlFor={field.key}>{field.label}</label>
                  <p className="field-hint">{field.hint}</p>
                  <textarea
                    id={field.key}
                    rows={field.rows || 4}
                    value={form[field.key]}
                    onChange={(event) => updateMaterial(field.key, event.target.value)}
                    placeholder={field.placeholder}
                  />
                </div>
              ))}

              <div className="field">
                <label htmlFor="sourceText">批量上传或粘贴原始材料</label>
                <p className="field-hint">
                  聊天记录导出、信件、日记等可直接粘贴；也支持上传 .txt / .md 文件。
                </p>
                <textarea
                  id="sourceText"
                  value={form.sourceText}
                  onChange={(event) => setForm({ ...form, sourceText: event.target.value })}
                  placeholder="可以放聊天记录、信件、语音转文字、日记、逐字稿、回忆片段。"
                />
                <input type="file" multiple accept=".txt,.md,.text" onChange={handleCreateFiles} />
              </div>

              <aside className="guide-box">
                <h3>关于录音</h3>
                <pre className="guide-pre">{AUDIO_RECORDING_GUIDE}</pre>
              </aside>
            </section>

            <aside className="notice-box">
              <p>{PRIVACY_NOTICE}</p>
              <p className="small">{LOCAL_STORAGE_HINT}</p>
            </aside>

            <button type="submit" disabled={isCreating || !form.name.trim()}>
              {isCreating ? "正在生成档案..." : "生成未竟之言档案"}
            </button>
            {createError ? <p className="toast error">{createError}</p> : null}
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section className="chat-screen">
        <header className="chat-header">
          <div>
            <button type="button" className="link-button" onClick={() => setScreen("home")}>
              ← 首页
            </button>
            <h1>{currentPersona?.roleLabel || currentPersona?.name || "未竟之言"}</h1>
            <p>
              {currentPersona
                ? `与 ${currentPersona.name} 的赛博陪伴`
                : "为没说完的话，留一个位置"}
            </p>
          </div>
          <button type="button" className="icon-button" onClick={() => setMenuOpen((open) => !open)}>
            更多
          </button>
        </header>

        {menuOpen ? (
          <div className="menu-panel">
            <button type="button" className="secondary" onClick={() => setScreen("create")}>
              新建档案
            </button>
            <button type="button" className="secondary" onClick={handleClearConversations}>
              删除全部对话
            </button>
            {currentPersona ? (
              <button
                type="button"
                className="secondary danger-text"
                onClick={() => handleDeletePersona(currentPersona.id)}
              >
                删除这份档案
              </button>
            ) : null}
            <p className="small">{PRIVACY_NOTICE}</p>
          </div>
        ) : null}

        <div className="message-list" aria-live="polite">
          {messages.length === 0 ? (
            <div className="empty-chat">
              <p>
                {currentPersona
                  ? getWelcomeMessage(currentPersona.conversationMode)
                  : "把没说完的话，说给 TA 听……"}
              </p>
              {currentPersona &&
              (currentPersona.materialSourceType === "memory" ||
                currentPersona.materialSourceType === "mixed") ? (
                <span>这部分更多来自你的回忆，而不是完整原始记录。</span>
              ) : null}
            </div>
          ) : (
            messages.map((item, index) => (
              <div className={`bubble ${item.role}`} key={`${item.role}-${index}`}>
                {item.content}
              </div>
            ))
          )}
          {isSending ? <div className="bubble assistant typing">正在回应...</div> : null}
          <div ref={messagesEndRef} />
        </div>

        <form className="composer" onSubmit={sendMessage}>
          <textarea
            aria-label="发送未竟之言"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder="把没说完的话，说给 TA 听……"
            rows={1}
            disabled={!currentPersona}
          />
          <button type="submit" disabled={isSending || !message.trim() || !currentPersona}>
            发送
          </button>
        </form>
        {chatError ? <p className="toast error">{chatError}</p> : null}
      </section>
    </main>
  );
}

function toFriendlyError(error: unknown, fallback: string) {
  const text = error instanceof Error ? error.message : fallback;

  if (text.includes("OPENAI_API_KEY") || text.includes("Missing API key")) {
    return "还没有配置 AI API Key。请在 .env 中填写后重启服务。";
  }

  return text;
}
