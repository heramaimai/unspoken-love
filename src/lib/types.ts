export type DepartureType =
  | "passed_away"
  | "left"
  | "lost_contact"
  | "unable_to_talk"
  | "other";

export type ConversationMode = "companion" | "reflection" | "farewell";

export type MaterialSourceType =
  | "real_record"
  | "transcription"
  | "memory"
  | "mixed";

export type RealismLevel = "high_similarity" | "echo" | "guide";

export type PersonaMaterialFields = {
  catchphrases: string;
  speechTranscript: string;
  personalityTraits: string;
  desiredPresence: string;
  treatmentStyle: string;
  memorableMoments: string;
  audioTranscript: string;
  additionalNotes: string;
};

export type PersonaProfile = {
  id: string;
  name: string;
  relationship: string;
  roleLabel: string;
  departureType: DepartureType;
  conversationMode: ConversationMode;
  materialSourceType: MaterialSourceType;
  realismLevel: RealismLevel;
  description: string;
  sourceText: string;
  catchphrases: string;
  speechTranscript: string;
  personalityTraits: string;
  desiredPresence: string;
  treatmentStyle: string;
  memorableMoments: string;
  audioTranscript: string;
  additionalNotes: string;
  transcriptSummary: string;
  languageStyle: string;
  emotionalPattern: string;
  relationshipPattern: string;
  typicalResponses: string;
  unfinishedWords: string;
  boundaries: string;
  systemPrompt: string;
  createdAt: string;
  updatedAt: string;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type PersonaConversations = Record<string, ChatMessage[]>;

export type DistilledProfileFields = {
  transcriptSummary: string;
  languageStyle: string;
  emotionalPattern: string;
  relationshipPattern: string;
  typicalResponses: string;
  unfinishedWords: string;
  boundaries: string;
  systemPrompt: string;
};

export type CreatePersonaInput = {
  name: string;
  relationship: string;
  roleLabel: string;
  departureType: DepartureType;
  conversationMode: ConversationMode;
  materialSourceType: MaterialSourceType;
  realismLevel: RealismLevel;
  description: string;
  sourceText: string;
} & PersonaMaterialFields;

/** @deprecated Legacy Supabase transcript types */
export type SegmentLabel =
  | "therapist_speech"
  | "client_speech"
  | "relationship_event"
  | "case_memory"
  | "style_sample";

/** @deprecated Legacy Supabase transcript types */
export type TranscriptSegment = {
  label: SegmentLabel;
  speaker: string | null;
  content: string;
  metadata: Record<string, unknown>;
};

/** @deprecated Legacy Supabase transcript types */
export type RetrievedSegment = {
  id: string;
  label: SegmentLabel;
  speaker: string | null;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
};

/** @deprecated Legacy Supabase transcript types */
export type RetrievedMemory = {
  id: string;
  label: SegmentLabel;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
};

/** @deprecated Legacy Supabase therapist profile context */
export type TherapistProfileContext = {
  style_summary: string;
  language_markers: Record<string, unknown>;
  thinking_patterns: Record<string, unknown>;
  response_guidelines: string[];
  sample_quotes: Array<{ content: string; label?: string }>;
};
