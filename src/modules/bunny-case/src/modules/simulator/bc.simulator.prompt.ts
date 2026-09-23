// bc.simulator.prompt.ts
//
// Conversation Simulator prompt architecture.
//
// Each training mode (Issue Handling, Job Interview, Discussion, Mental
// Health) has its OWN prompt set in `./prompts/`, all implementing the
// `BCSimulatorPromptSet` interface exported here. The simulator generates the
// ideal dialogue demonstrating "what good looks like" — with dual-view turns,
// a requested ending (resolved / unresolved) and a summarization with tips
// and guides. An optional "main actor" persona (mode main-actor / all) shapes
// the ideal agent, replacing the old Agent Persona module.

import type { BCGenAIOptionId } from "../generative-ai/bc.generative-ai.entity";
import { BC_GEN_AI_DEFAULT_OPTION_ID } from "../generative-ai/bc.generative-ai.entity";
import { bcSimulatorIssueHandlingPrompt } from "./prompts/bc.simulator.prompt.issue-handling";
import { bcSimulatorJobInterviewPrompt } from "./prompts/bc.simulator.prompt.job-interview";
import { bcSimulatorDiscussionPrompt } from "./prompts/bc.simulator.prompt.discussion";
import { bcSimulatorMentalHealthPrompt } from "./prompts/bc.simulator.prompt.mental-health";

// ── Interface ──────────────────────────────────────────────────────────────────

/** A single system + user prompt pair for one AI call. */
export interface BCSimulatorPromptEntry<TArgs extends string[] = string[]> {
  systemPrompt: string;
  userPrompt: (...args: TArgs) => string;
}

/** The prompt set one simulator training mode must provide. */
export interface BCSimulatorPromptSet {
  /**
   * simulate(persona, scenario, options, mainActor)
   * All arguments are pre-formatted strings built by the server action.
   */
  simulate: BCSimulatorPromptEntry<
    [persona: string, scenario: string, options: string, mainActor: string]
  >;
}

// ── Registry ───────────────────────────────────────────────────────────────────

/**
 * Simulator prompt sets keyed by training mode. The `custom` mode falls back
 * to issue-handling prompts (its directives are injected at the call-site).
 */
export const bcSimulatorPrompts: Record<BCGenAIOptionId, BCSimulatorPromptSet> =
  {
    "issue-handling": bcSimulatorIssueHandlingPrompt,
    "job-interview": bcSimulatorJobInterviewPrompt,
    discussion: bcSimulatorDiscussionPrompt,
    "mental-health": bcSimulatorMentalHealthPrompt,
    custom: bcSimulatorIssueHandlingPrompt,
  };

/** Resolve the simulator prompt set for a training mode (default-safe). */
export function bcResolveSimulatorPrompts(
  mode?: BCGenAIOptionId | null,
): BCSimulatorPromptSet {
  return (
    (mode && bcSimulatorPrompts[mode]) ||
    bcSimulatorPrompts[BC_GEN_AI_DEFAULT_OPTION_ID]
  );
}
