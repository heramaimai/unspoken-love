import { generatePersonaReply } from "./chat-model";
import type { PersonaProfile } from "./types";

/**
 * Legacy entry point for Telegram webhook and old Supabase-based routes.
 * Uses a minimal default persona when no profile is available.
 */
export async function runLegacyChatTurn(input: {
  message: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  persona?: PersonaProfile | null;
}) {
  const persona =
    input.persona ||
    ({
      id: "legacy",
      name: "未竟之言",
      relationship: "重要的人",
      roleLabel: "未竟之言",
      departureType: "other",
      conversationMode: "companion",
      materialSourceType: "mixed",
      realismLevel: "echo",
      description: "",
      sourceText: "",
      catchphrases: "",
      speechTranscript: "",
      personalityTraits: "",
      desiredPresence: "",
      treatmentStyle: "",
      memorableMoments: "",
      audioTranscript: "",
      additionalNotes: "",
      transcriptSummary: "",
      languageStyle: "",
      emotionalPattern: "",
      relationshipPattern: "",
      typicalResponses: "",
      unfinishedWords: "",
      boundaries: "",
      systemPrompt: "",
      createdAt: "",
      updatedAt: "",
    } satisfies PersonaProfile);

  const reply = await generatePersonaReply({
    persona,
    history: input.history || [],
    message: input.message,
  });

  return { reply };
}
