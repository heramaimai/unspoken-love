import type { PersonaProfile } from "./types";

const EMPTY_MATERIAL = {
  catchphrases: "",
  speechTranscript: "",
  personalityTraits: "",
  desiredPresence: "",
  treatmentStyle: "",
  memorableMoments: "",
  audioTranscript: "",
  additionalNotes: "",
};

export function normalizePersona(raw: Partial<PersonaProfile>): PersonaProfile {
  return {
    ...EMPTY_MATERIAL,
    ...raw,
    id: raw.id || crypto.randomUUID(),
    name: raw.name || "未命名",
    relationship: raw.relationship || "重要的人",
    roleLabel: raw.roleLabel || raw.relationship || "重要的人",
    departureType: raw.departureType || "other",
    conversationMode: raw.conversationMode || "companion",
    materialSourceType: raw.materialSourceType || "mixed",
    realismLevel: raw.realismLevel || "echo",
    description: raw.description || "",
    sourceText: raw.sourceText || "",
    transcriptSummary: raw.transcriptSummary || "",
    languageStyle: raw.languageStyle || "",
    emotionalPattern: raw.emotionalPattern || "",
    relationshipPattern: raw.relationshipPattern || "",
    typicalResponses: raw.typicalResponses || "",
    unfinishedWords: raw.unfinishedWords || "",
    boundaries: raw.boundaries || "",
    systemPrompt: raw.systemPrompt || "",
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };
}
