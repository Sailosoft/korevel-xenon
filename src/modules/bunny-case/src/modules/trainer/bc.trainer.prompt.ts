// bc.trainer.prompt.ts
//
// Conversation Trainer prompt architecture.
//
// Each training mode (Issue Handling, Job Interview, Discussion, Mental
// Health) has its OWN prompt set in `./prompts/`, all implementing the
// `BCTrainerPromptSet` interface exported here. Server actions resolve the
// prompt set from the selected training mode (`BCGenAIOptionId`).
//
// Roles inside a set:
//  - personaReply:   the counterpart answering the user's message (dual-view).
//  - coachFeedback:  the AI Trainer coaching the user's draft response.
//  - turnGuide:      the AI Trainer's per-turn guide (Trainer Option).
//  - critique:       the AI Trainer's validation of the user's draft.
//  - sessionSummary: the end-of-session review.

import type { BCGenAIOptionId } from "../generative-ai/bc.generative-ai.entity";
import { BC_GEN_AI_DEFAULT_OPTION_ID } from "../generative-ai/bc.generative-ai.entity";
import { bcTrainerIssueHandlingPrompt } from "./prompts/bc.trainer.prompt.issue-handling";
import { bcTrainerJobInterviewPrompt } from "./prompts/bc.trainer.prompt.job-interview";
import { bcTrainerDiscussionPrompt } from "./prompts/bc.trainer.prompt.discussion";
import { bcTrainerMentalHealthPrompt } from "./prompts/bc.trainer.prompt.mental-health";

// ── Interface ──────────────────────────────────────────────────────────────────

/** A single system + user prompt pair for one AI call. */
export interface BCTrainerPromptEntry<TArgs extends string[] = string[]> {
  systemPrompt: string;
  userPrompt: (...args: TArgs) => string;
}

/** The full prompt set one training mode must provide. */
export interface BCTrainerPromptSet {
  /** personaReply(persona, scenario, history, userMsg) */
  personaReply: BCTrainerPromptEntry<
    [persona: string, scenario: string, history: string, userMsg: string]
  >;
  /** coachFeedback(persona, scenario, draft) */
  coachFeedback: BCTrainerPromptEntry<
    [persona: string, scenario: string, draft: string]
  >;
  /** turnGuide(persona, scenario, history) */
  turnGuide: BCTrainerPromptEntry<
    [persona: string, scenario: string, history: string]
  >;
  /** critique(persona, scenario, history, draft) */
  critique: BCTrainerPromptEntry<
    [persona: string, scenario: string, history: string, draft: string]
  >;
  /** sessionSummary(persona, scenario, history) */
  sessionSummary: BCTrainerPromptEntry<
    [persona: string, scenario: string, history: string]
  >;
}

// ── Registry ───────────────────────────────────────────────────────────────────

/**
 * Trainer prompt sets keyed by training mode. The `custom` mode falls back to
 * issue-handling prompts (its directives are injected at the call-site).
 */
export const bcTrainerPrompts: Record<BCGenAIOptionId, BCTrainerPromptSet> = {
  "issue-handling": bcTrainerIssueHandlingPrompt,
  "job-interview": bcTrainerJobInterviewPrompt,
  discussion: bcTrainerDiscussionPrompt,
  "mental-health": bcTrainerMentalHealthPrompt,
  custom: bcTrainerIssueHandlingPrompt,
};

/** Resolve the trainer prompt set for a training mode (default-safe). */
export function bcResolveTrainerPrompts(
  mode?: BCGenAIOptionId | null,
): BCTrainerPromptSet {
  return (
    (mode && bcTrainerPrompts[mode]) ||
    bcTrainerPrompts[BC_GEN_AI_DEFAULT_OPTION_ID]
  );
}
