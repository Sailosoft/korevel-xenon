// bc.trainer.entity.ts
//
// Shared conversation primitives used by the Trainer, Gauntlet and Simulator.

export type BCSessionMode = "trainer" | "gauntlet" | "simulator";
export type BCSessionStatus = "active" | "completed" | "failed" | "certified";

/** A single training run (trainer or gauntlet) persisted to Dexie. */
export interface BCCaseSession {
  id?: number;
  caseId?: number;
  personaId?: number;
  mode: BCSessionMode;
  status: BCSessionStatus;
  resolved?: boolean;
  /** Number of curveballs introduced during a gauntlet run */
  curveballs?: number;
  startedAt?: number;
  endedAt?: number;
  summary?: string;
  /** Structured end-of-session summary (feature #10). */
  summaryData?: BCTrainerSessionSummary;
}

export type BCMessageRole = "persona" | "agent" | "trainer" | "system";

/** One exchange inside a session. External = spoken, Internal = hidden thought. */
export interface BCCaseMessage {
  id?: number;
  sessionId: number;
  role: BCMessageRole;
  /** What is actually said / shown */
  external: string;
  /** Hidden thought / emotion (dual-view) — persona thoughts, agent rationale */
  internal?: string;
  /** Trainer-suggested correction (trainer mode) */
  correction?: string;
  /** Trainer explanation of why the correction is better */
  correctionReason?: string;
  /** Whether the user accepted the correction */
  accepted?: boolean;
  /** True when this persona message was a curveball (gauntlet mode) */
  curveball?: boolean;
  /** Sentiment score in [-1, 1] */
  sentiment?: number;
  createdAt?: number;
}

/** Persona's spoken + hidden response to the user's message. */
export interface BCTrainerPersonaReply {
  external: string;
  internal: string;
  sentiment: number;
}

/** AI Trainer coaching feedback on the user's response. */
export interface BCTrainerFeedback {
  suggestion: string;
  reason: string;
  score: number;
}

/** AI Trainer's per-turn guide shown in the Trainer Option (feature #5). */
export interface BCTrainerGuide {
  /** Short overview of what this turn expects. */
  objective: string;
  /** Steps the trainee should follow this turn. */
  steps: string[];
  /** Watch-outs specific to this turn. */
  pitfalls: string[];
}

/** AI critique / validation of the user's draft (feature #5). */
export interface BCTrainerCritique {
  /** Score from 0 to 10. */
  score: number;
  /** What the trainee did well. */
  strengths: string[];
  /** What could be improved. */
  improvements: string[];
  /** A rewritten (guided) version the trainee may adopt. */
  suggestion: string;
}

/** Gauntlet persona reply — may carry a curveball. */
export interface BCGauntletReply extends BCTrainerPersonaReply {
  curveball?: { label: string; description: string };
}

/** Final evaluation result for a gauntlet run. */
export interface BCEvaluationResult {
  passed: boolean;
  score: number;
  reason: string;
  feedback: string[];
  summary: string;
}

/** End-of-session AI summary + rating (feature #10). */
export interface BCTrainerSessionSummary {
  /** One-paragraph recap of the whole conversation. */
  summary: string;
  /** Step-by-step guide for this conversation / case. */
  guide: string[];
  /** Overall trainee rating from 0 to 10. */
  score: number;
  /** What the trainee is missing / should work on. */
  missing: string[];
  /** What the trainee did well. */
  strengths: string[];
}
