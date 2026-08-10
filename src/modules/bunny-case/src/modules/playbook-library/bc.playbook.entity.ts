// bc.playbook.entity.ts
//
// BCPlaybook — a successful interaction archived in the searchable Playbook
// Library. Represents organizational knowledge: the transcript of a
// resolved case plus the sentiment/word-level analytics that turned the
// customer's mood from negative to positive. List-ish fields are stored as
// comma-separated strings (Bunny-friendly).

export interface BCPlaybook {
  id?: number;
  title: string;
  /** Reference to the originating case */
  caseId?: number;
  /** Reference to the persona */
  personaId?: number;
  /** One-paragraph summary of the successful interaction */
  summary: string;
  /** Full transcript of the interaction */
  transcript: string;
  /** Comma-separated per-message sentiment series ([-1, 1]) */
  sentimentTrend?: string;
  /** Comma-separated words/phrases that caused the mood shift */
  keyPhrases?: string;
  /** Comma-separated recommended phrasing */
  recommendedPhrases?: string;
  /** Comma-separated tags */
  tags?: string;
  /** Company "brand voice" refinements from peer-review */
  brandVoice?: string;
  status: "draft" | "published";
  createdAt?: number;
  updatedAt?: number;
}
