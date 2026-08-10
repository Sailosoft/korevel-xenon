// bc.agent-persona.entity.ts
//
// BCAgentPersona — an optional persona for the "ideal agent" used by the
// Simulator. Mirrors the customer Persona Architect but describes the agent
// role: name, traits, service philosophy, communication style and a short AI
// summary. List-ish fields are stored as comma-separated strings (Bunny
// friendly) and parsed into arrays when fed to the AI.

export interface BCAgentPersona {
  id?: number;
  /** Human-readable label, e.g. "Empathetic Senior Support" */
  name: string;
  /** Comma-separated trait labels, e.g. "Calm, Structured, Proactive" */
  traits: string;
  /** Free-form description of the agent persona */
  description?: string;
  /** AI-generated profile: values, boundaries and mindset */
  psychologicalProfile?: string;
  /** Comma-separated principles the agent always follows */
  principles?: string;
  /** AI-generated communication style guidance */
  communicationStyle?: string;
  /** Short AI summary of the agent persona */
  aiSummary?: string;
  createdAt?: number;
  updatedAt?: number;
}

/** Structured output of the Agent Persona AI generation. */
export interface BCGeneratedAgentPersona {
  psychologicalProfile: string;
  principles: string[];
  communicationStyle: string;
  aiSummary: string;
}

/** Parse a comma-separated string into a trimmed list. */
export function bcAgentPersonaParseList(value?: string): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Join an array (or comma-separated string) into a display string. */
export function bcAgentPersonaJoinList(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  return typeof value === "string" ? value : "";
}
