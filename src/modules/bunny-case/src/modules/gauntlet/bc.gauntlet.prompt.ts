// bc.gauntlet.prompt.ts
//
// Stress-Test Gauntlet prompt architecture.
//
// Each training mode (Issue Handling, Job Interview, Discussion, Mental
// Health) has its OWN prompt set in `./prompts/`, all implementing the
// `BCGauntletPromptSet` interface exported here. The gauntlet removes the
// coach; the persona may throw curveballs and the run is evaluated at the
// end (mental-health mode is supportive and ungraded).

import type { BCGenAIOptionId } from "../generative-ai/bc.generative-ai.entity";
import { BC_GEN_AI_DEFAULT_OPTION_ID } from "../generative-ai/bc.generative-ai.entity";
import { bcGauntletIssueHandlingPrompt } from "./prompts/bc.gauntlet.prompt.issue-handling";
import { bcGauntletJobInterviewPrompt } from "./prompts/bc.gauntlet.prompt.job-interview";
import { bcGauntletDiscussionPrompt } from "./prompts/bc.gauntlet.prompt.discussion";
import { bcGauntletMentalHealthPrompt } from "./prompts/bc.gauntlet.prompt.mental-health";

// ── Interface ──────────────────────────────────────────────────────────────────

/** A single system + user prompt pair for one AI call. */
export interface BCGauntletPromptEntry<TArgs extends string[] = string[]> {
  systemPrompt: string;
  userPrompt: (...args: TArgs) => string;
}

/** The prompt set one gauntlet training mode must provide. */
export interface BCGauntletPromptSet {
  /** personaReply(persona, scenario, history, userMsg, curveballHint) */
  personaReply: BCGauntletPromptEntry<
    [
      persona: string,
      scenario: string,
      history: string,
      userMsg: string,
      curveballHint: string,
    ]
  >;
  /** evaluate(persona, scenario, transcript) */
  evaluate: BCGauntletPromptEntry<
    [persona: string, scenario: string, transcript: string]
  >;
}

// ── Registry ───────────────────────────────────────────────────────────────────

/**
 * Gauntlet prompt sets keyed by training mode. The `custom` mode falls back
 * to issue-handling prompts (its directives are injected at the call-site).
 */
export const bcGauntletPrompts: Record<BCGenAIOptionId, BCGauntletPromptSet> = {
  "issue-handling": bcGauntletIssueHandlingPrompt,
  "job-interview": bcGauntletJobInterviewPrompt,
  discussion: bcGauntletDiscussionPrompt,
  "mental-health": bcGauntletMentalHealthPrompt,
  custom: bcGauntletIssueHandlingPrompt,
};

/** Resolve the gauntlet prompt set for a training mode (default-safe). */
export function bcResolveGauntletPrompts(
  mode?: BCGenAIOptionId | null,
): BCGauntletPromptSet {
  return (
    (mode && bcGauntletPrompts[mode]) ||
    bcGauntletPrompts[BC_GEN_AI_DEFAULT_OPTION_ID]
  );
}
