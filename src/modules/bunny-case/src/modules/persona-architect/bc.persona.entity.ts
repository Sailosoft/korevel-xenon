// bc.persona.entity.ts
//
// BCCasePersona — a flexible participant profile used across BunnyCase.
// A persona is just: Name, Mode (where it can be used), Traits (multi-select)
// and an AI Prompt (the instruction the AI follows when role-playing it).
//
// Modes:
//  - "person"     → the counterpart in conversations (Trainer / Gauntlet /
//                   Simulator persona side).
//  - "trainer"    → the AI coach persona.
//  - "main-actor" → the ideal agent in the Simulator (replaces the old
//                   Agent Persona module).
//  - "all"        → usable anywhere.
//
// Traits are stored as a comma-separated string (Bunny-friendly) and parsed
// into arrays when fed to the AI.

export type BCPersonaMode = "all" | "person" | "trainer" | "main-actor";

export interface BCPersonaModeOption {
  value: BCPersonaMode;
  label: string;
  description: string;
}

/** Select options for the persona Mode field. */
export const BC_PERSONA_MODE_OPTIONS: BCPersonaModeOption[] = [
  {
    value: "all",
    label: "All",
    description: "Usable anywhere — counterpart, coach, or main actor.",
  },
  {
    value: "person",
    label: "Person",
    description: "The counterpart in conversations (Trainer / Gauntlet / Simulator).",
  },
  {
    value: "trainer",
    label: "Trainer",
    description: "The AI coach persona that guides and critiques.",
  },
  {
    value: "main-actor",
    label: "Main Actor",
    description: "The ideal agent performed by the Simulator.",
  },
];

export interface BCCasePersona {
  id?: number;
  /** Human-readable label, e.g. "Impatient VIP" */
  name: string;
  /** Where this persona can be used. */
  mode: BCPersonaMode;
  /** Comma-separated trait labels, e.g. "Impatient, Confused, High-Value" */
  traits: string;
  /** Free-form instruction the AI follows when role-playing this persona. */
  aiPrompt: string;
  createdAt?: number;
  updatedAt?: number;
}

/** Structured output of the Persona Architect AI generation. */
export interface BCGeneratedPersonaProfile {
  /** The generated role-play instruction, stored into `aiPrompt`. */
  aiPrompt: string;
}

/** True when the persona may be used in the given role. */
export function bcPersonaMatchesMode(
  persona: Pick<BCCasePersona, "mode">,
  mode: Exclude<BCPersonaMode, "all">,
): boolean {
  return persona.mode === "all" || persona.mode === mode;
}

/** Parse a comma-separated string into a trimmed list. */
export function bcPersonaParseList(value?: string): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Join an array (or comma-separated string) into a display string. */
export function bcPersonaJoinList(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  return typeof value === "string" ? value : "";
}
