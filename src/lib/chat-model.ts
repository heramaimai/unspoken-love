import { DEFAULT_CHAT_SYSTEM_PROMPT } from "./persona-prompts";
import { chatCompletion } from "./llm";
import type { ChatMessage, PersonaProfile } from "./types";

export async function generatePersonaReply(input: {
  persona: PersonaProfile;
  history: ChatMessage[];
  message: string;
}) {
  const systemPrompt = input.persona.systemPrompt?.trim() || DEFAULT_CHAT_SYSTEM_PROMPT;

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...input.history.map((item) => ({
      role: item.role,
      content: item.content,
    })),
    { role: "user" as const, content: buildUserContext(input.persona, input.message) },
  ];

  return chatCompletion({ messages, temperature: 0.7 });
}

function buildUserContext(persona: PersonaProfile, message: string) {
  return [
    "【回声档案摘要】",
    `称呼：${persona.name}`,
    `关系：${persona.relationship}`,
    `对话模式：${persona.conversationMode}`,
    `材料来源：${persona.materialSourceType}`,
    `拟真程度：${persona.realismLevel}`,
    "",
    "【口头禅】",
    persona.catchphrases || "暂无",
    "",
    "【说话样本】",
    persona.speechTranscript || persona.sourceText || "暂无",
    "",
    "【性格特点】",
    persona.personalityTraits || "暂无",
    "",
    "【希望呈现的样子】",
    persona.desiredPresence || "暂无",
    "",
    "【对待用户的方式】",
    persona.treatmentStyle || "暂无",
    "",
    "【印象深刻片段】",
    persona.memorableMoments || "暂无",
    "",
    "【语言风格】",
    persona.languageStyle || "暂无",
    "",
    "【情绪温度】",
    persona.emotionalPattern || "暂无",
    "",
    "【关系模式】",
    persona.relationshipPattern || "暂无",
    "",
    "【典型回应方式】",
    persona.typicalResponses || "暂无",
    "",
    "【未竟之言】",
    persona.unfinishedWords || persona.description || "暂无",
    "",
    "【边界提醒】",
    persona.boundaries || "这是赛博陪伴，不是真人复活。",
    "",
    "【用户当前输入】",
    message,
  ].join("\n");
}
