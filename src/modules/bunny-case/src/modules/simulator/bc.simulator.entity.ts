// bc.simulator.entity.ts
//
// Conversation Simulator types. A simulation is a full dialogue between the
// Persona and an "Ideal Agent". Each turn carries a dual-view: external (what
// is said) and internal (the hidden thought / rationale). The result also
// includes how the conversation ended (resolved / unresolved) plus a
// summarization with actionable tips and guides.
//
// A `BCSimulatorRecord` is a persisted run — generated simulations are saved to
// Dexie so they can be reloaded later (feature: simulator history).

export type BCSimulatorSpeaker = "persona" | "agent";

/** How the simulated conversation is expected to end. */
export type BCSimulationOutcome = "resolved" | "unresolved";

export interface BCSimulatorTurn {
  speaker: BCSimulatorSpeaker;
  /** What is actually said */
  external: string;
  /** Hidden thought (persona emotion) or agent rationale */
  internal?: string;
  /** Sentiment score in [-1, 1] */
  sentiment?: number;
}

/** Summarization with tips and guides distilled from the conversation. */
export interface BCSimulationTips {
  /** Short, reusable phrases that worked well. */
  keyPhrases: string[];
  /** Step-by-step guide for handling this type of case. */
  guide: string[];
  /** Watch-out points / mistakes to avoid. */
  pitfalls: string[];
}

export interface BCSimulationResult {
  turns: BCSimulatorTurn[];
  /** One-paragraph summary of the conversation. */
  summary: string;
  /** How the conversation ended. */
  outcome: BCSimulationOutcome;
  /** Optional closing note when the case is not fully resolved. */
  nextSteps?: string;
  /** Summarization with tips and guides. */
  tips?: BCSimulationTips;
}

/**
 * A persisted simulator run (history record). Flattens the run context
 * (persona / case / optional agent persona) plus the full result so it can be
 * reloaded from the history module or a `simulatorId` query parameter.
 */
export interface BCSimulatorRecord {
  id?: number;
  personaId?: number;
  caseId?: number;
  agentPersonaId?: number;
  personaName?: string;
  caseTitle?: string;
  agentPersonaName?: string;
  /** The full generated result. */
  result: BCSimulationResult;
  createdAt?: number;
}
