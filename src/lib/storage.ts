import type { ChatMessage, PersonaConversations, PersonaProfile } from "./types";
import { normalizePersona } from "./persona-normalize";

export const STORAGE_KEYS = {
  personas: "unfinished_words_personas",
  currentPersonaId: "current_unfinished_words_persona_id",
  conversations: "unfinished_words_conversations",
} as const;

export function loadPersonas(): PersonaProfile[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.personas);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as PersonaProfile[];
    return Array.isArray(parsed) ? parsed.map((item) => normalizePersona(item)) : [];
  } catch {
    return [];
  }
}

export function savePersonas(personas: PersonaProfile[]) {
  window.localStorage.setItem(STORAGE_KEYS.personas, JSON.stringify(personas));
}

export function loadCurrentPersonaId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(STORAGE_KEYS.currentPersonaId);
}

export function saveCurrentPersonaId(id: string | null) {
  if (id) {
    window.localStorage.setItem(STORAGE_KEYS.currentPersonaId, id);
  } else {
    window.localStorage.removeItem(STORAGE_KEYS.currentPersonaId);
  }
}

export function loadConversations(): PersonaConversations {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.conversations);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as PersonaConversations;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveConversations(conversations: PersonaConversations) {
  window.localStorage.setItem(STORAGE_KEYS.conversations, JSON.stringify(conversations));
}

export function getPersonaMessages(personaId: string): ChatMessage[] {
  return loadConversations()[personaId] || [];
}

export function savePersonaMessages(personaId: string, messages: ChatMessage[]) {
  const conversations = loadConversations();
  conversations[personaId] = messages;
  saveConversations(conversations);
}

export function clearPersonaMessages(personaId: string) {
  const conversations = loadConversations();
  delete conversations[personaId];
  saveConversations(conversations);
}

export function deletePersona(personaId: string) {
  const personas = loadPersonas().filter((item) => item.id !== personaId);
  savePersonas(personas);
  clearPersonaMessages(personaId);

  const currentId = loadCurrentPersonaId();
  if (currentId === personaId) {
    saveCurrentPersonaId(personas[0]?.id ?? null);
  }
}
