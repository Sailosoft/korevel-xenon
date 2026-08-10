// bc.case.entity.ts
//
// BCCaseScenario — a concrete conflict a persona brings to the conversation.
// A Case is linked to a Persona to create a specific conflict.
// List-ish fields are stored as comma-separated strings (Bunny-friendly) and
// parsed into arrays when fed to the AI.

export interface BCCaseScenario {
  id?: number;
  /** Title, e.g. "Billing Error on Monthly Subscription" */
  title: string;
  /** Reference to the linked BCCasePersona */
  personaId?: number;
  /** Short description of the conflict */
  description?: string;
  /** The core conflict/objective the agent must resolve */
  conflict?: string;
  /** What "success" looks like for this case */
  objective?: string;
  /** Comma-separated AI-generated escalation points (curveball opportunities) */
  escalationPoints?: string;
  createdAt?: number;
  updatedAt?: number;
}

/** Structured output of the Case Base AI scenario generation. */
export interface BCGeneratedScenario {
  description: string;
  objective: string;
  conflict: string;
  escalationPoints: string[];
}

/** Parse a comma-separated string into a trimmed list. */
export function bcCaseParseList(value?: string): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Join an array (or comma-separated string) into a display string. */
export function bcCaseJoinList(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  return typeof value === "string" ? value : "";
}
