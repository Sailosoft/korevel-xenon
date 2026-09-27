// bc.hot-seat.prompt.ts
//
// Hot Seat prompt architecture — the REVERSE of the Conversation Trainer.
// The AI role-plays the persona inside a case while the trainee is the one
// challenging, questioning and grilling it. Each training mode (Issue
// Handling, Job Interview, Discussion, Mental Health) has its OWN prompt set
// in `./prompts/`, all implementing the `BCHotSeatPromptSet` interface
// exported here. Server actions resolve the set by the selected Generative AI
// training mode.
//
// Roles inside a set:
//  - personaReply: the AI persona answering the trainee's question, with its
//    hidden thought and composure under pressure.
//  - evaluate:     the end-of-run evaluation of the TRAINEE'S questioning
//    craft (not the persona's).

import type { BCGenAIOptionId } from "../generative-ai/bc.generative-ai.entity";
import { BC_GEN_AI_DEFAULT_OPTION_ID } from "../generative-ai/bc.generative-ai.entity";
import { bcHotSeatIssueHandlingPrompt } from "./prompts/bc.hot-seat.prompt.issue-handling";
import { bcHotSeatJobInterviewPrompt } from "./prompts/bc.hot-seat.prompt.job-interview";
import { bcHotSeatDiscussionPrompt } from "./prompts/bc.hot-seat.prompt.discussion";
import { bcHotSeatMentalHealthPrompt } from "./prompts/bc.hot-seat.prompt.mental-health";

// ── Interface ──────────────────────────────────────────────────────────────────

/** A single system + user prompt pair for one AI call. */
export interface BCHotSeatPromptEntry<TArgs extends string[] = string[]> {
  systemPrompt: string;
  userPrompt: (...args: TArgs) => string;
}

/** The prompt set one Hot Seat training mode must provide. */
export interface BCHotSeatPromptSet {
  /** personaReply(persona, scenario, history, userMsg) */
  personaReply: BCHotSeatPromptEntry<
    [persona: string, scenario: string, history: string, userMsg: string]
  >;
  /** evaluate(persona, scenario, transcript) */
  evaluate: BCHotSeatPromptEntry<
    [persona: string, scenario: string, transcript: string]
  >;
}

// ── Registry ───────────────────────────────────────────────────────────────────

/**
 * Hot Seat prompt sets keyed by training mode. The `custom` mode falls back
 * to issue-handling prompts (its directives are injected at the call-site).
 */
export const bcHotSeatPrompts: Record<BCGenAIOptionId, BCHotSeatPromptSet> = {
  "issue-handling": bcHotSeatIssueHandlingPrompt,
  "job-interview": bcHotSeatJobInterviewPrompt,
  discussion: bcHotSeatDiscussionPrompt,
  "mental-health": bcHotSeatMentalHealthPrompt,
  custom: bcHotSeatIssueHandlingPrompt,
};

/** Resolve the Hot Seat prompt set for a training mode (default-safe). */
export function bcResolveHotSeatPrompts(
  mode?: BCGenAIOptionId | null,
): BCHotSeatPromptSet {
  return (
    (mode && bcHotSeatPrompts[mode]) ||
    bcHotSeatPrompts[BC_GEN_AI_DEFAULT_OPTION_ID]
  );
}
