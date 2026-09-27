// bc.trainer.server.ts
//
// Conversation Trainer server actions:
//  - bcTrainerPersonaReply  → the persona's spoken + hidden response.
//  - bcTrainerCoachFeedback → the AI Trainer's correction + explanation.
//  - bcTrainerTurnGuide     → the AI Trainer's per-turn guide.
//  - bcTrainerCritiqueDraft → the AI Trainer's validation of a draft.
//  - bcTrainerSessionSummary→ the end-of-session review.
//
// Each training mode (issue-handling / job-interview / discussion /
// mental-health) has its own prompt set under ./prompts/, resolved by the
// selected Generative AI option.

"use server";

import type { HelixAIOption } from "@/src/modules/helix";
import { bcContainer } from "../../container/bc.container";
import { bcResolveTrainerPrompts } from "./bc.trainer.prompt";
import type {
  BCTrainerCritique,
  BCTrainerFeedback,
  BCTrainerGuide,
  BCTrainerPersonaReply,
  BCTrainerSessionSummary,
} from "./bc.trainer.entity";
import type { BCCasePersona } from "../persona-architect/bc.persona.entity";
import type { BCCaseScenario } from "../case-base/bc.case.entity";
import type { BCGenAIOptions } from "../generative-ai/bc.generative-ai.entity";
import {
  bcGenAISystemDirectives,
  bcGenAIUserDirectives,
} from "../generative-ai/bc.generative-ai.prompt";
import { bcResolveGenAIOption as bcResolveOption } from "../generative-ai/bc.generative-ai.entity";

const JSON_ONLY_SYSTEM_SUFFIX = `
  \n\n
  CRITICAL: Return ONLY a valid JSON object matching the requested structure.
  Do not include markdown formatting (like \`\`\`json), explanations, or
  introduction outside of the raw JSON object.
`;

export interface BCTrainerContextInput {
  persona: BCCasePersona;
  scenario: BCCaseScenario;
  history: Array<{ role: string; external: string }>;
  /** Optional generative AI training-mode option (default: issue handling). */
  aiOptions?: BCGenAIOptions;
}

function formatPersona(persona: BCCasePersona): string {
  return [
    `Name: ${persona.name}`,
    `Traits: ${persona.traits || "(none)"}`,
    `Role-play instruction: ${persona.aiPrompt || "(none)"}`,
  ].join("\n");
}

function formatScenario(scenario: BCCaseScenario): string {
  return [`Title: ${scenario.title}`, scenario.content || "(no content)"].join(
    "\n",
  );
}

function formatHistory(history: Array<{ role: string; external: string }>) {
  return history
    .slice(-8)
    .map((m) => `[${m.role}] ${m.external}`)
    .join("\n");
}

/**
 * Built-in modes ship their own prompts, so no extra directives are appended.
 * Custom modes carry their own system/user directives which are injected here.
 */
function modeDirectives(aiOptions?: BCGenAIOptions) {
  const option = bcResolveOption(aiOptions);
  if (option.id === "custom") {
    return {
      system: bcGenAISystemDirectives(aiOptions),
      user: bcGenAIUserDirectives(aiOptions),
    };
  }
  return { system: "", user: "" };
}

export async function bcTrainerPersonaReply(
  input: BCTrainerContextInput & { userMsg: string },
  aiConfig?: HelixAIOption,
): Promise<BCTrainerPersonaReply> {
  const scope = bcContainer.createScope();
  const ai = scope.resolve("ai");

  const prompts = bcResolveTrainerPrompts(bcResolveOption(input.aiOptions).id);
  const { system, user } = modeDirectives(input.aiOptions);

  const systemPrompt = `${prompts.personaReply.systemPrompt}${system}${JSON_ONLY_SYSTEM_SUFFIX}`;
  const userPrompt = `${prompts.personaReply.userPrompt(
    formatPersona(input.persona),
    formatScenario(input.scenario),
    formatHistory(input.history),
    input.userMsg,
  )}${user}`;

  try {
    const result = await ai.doChatStructuredFallback({
      system: systemPrompt,
      user: userPrompt,
      schema: {
        name: "trainer_persona_reply",
        description: "The persona's spoken and hidden response.",
        properties: {
          external: {
            type: "string",
            description: "What the persona says out loud.",
          },
          internal: {
            type: "string",
            description: "The persona's hidden thought / true emotion.",
          },
          sentiment: {
            type: "number",
            description: "Sentiment score from -1 to 1.",
          },
        },
      },
      temperature: 0.85,
      type: "creative",
      aiConfig,
    });

    return result as BCTrainerPersonaReply;
  } catch (error) {
    console.error("[BunnyCase] Trainer persona reply failed:", error);
    throw error;
  }
}

export async function bcTrainerTurnGuide(
  input: BCTrainerContextInput,
  aiConfig?: HelixAIOption,
): Promise<BCTrainerGuide> {
  const scope = bcContainer.createScope();
  const ai = scope.resolve("ai");

  const prompts = bcResolveTrainerPrompts(bcResolveOption(input.aiOptions).id);
  const { system, user } = modeDirectives(input.aiOptions);

  const systemPrompt = `${prompts.turnGuide.systemPrompt}${system}${JSON_ONLY_SYSTEM_SUFFIX}`;
  const userPrompt = `${prompts.turnGuide.userPrompt(
    formatPersona(input.persona),
    formatScenario(input.scenario),
    formatHistory(input.history),
  )}${user}`;

  try {
    const result = await ai.doChatStructuredFallback({
      system: systemPrompt,
      user: userPrompt,
      schema: {
        name: "trainer_turn_guide",
        description: "A per-turn coaching guide for the trainee.",
        properties: {
          objective: {
            type: "string",
            description: "What this turn should accomplish.",
          },
          steps: {
            type: "array",
            description: "Short steps the trainee should follow.",
            items: { type: "string", description: "A single step." },
          },
          pitfalls: {
            type: "array",
            description: "Mistakes to avoid this turn.",
            items: { type: "string", description: "A mistake to avoid." },
          },
        },
      },
      temperature: 0.6,
      type: "balanced",
      aiConfig,
    });

    return result as BCTrainerGuide;
  } catch (error) {
    console.error("[BunnyCase] Trainer turn guide failed:", error);
    throw error;
  }
}

export async function bcTrainerCritiqueDraft(
  input: BCTrainerContextInput & { draft: string },
  aiConfig?: HelixAIOption,
): Promise<BCTrainerCritique> {
  const scope = bcContainer.createScope();
  const ai = scope.resolve("ai");

  const prompts = bcResolveTrainerPrompts(bcResolveOption(input.aiOptions).id);
  const { system, user } = modeDirectives(input.aiOptions);

  const systemPrompt = `${prompts.critique.systemPrompt}${system}${JSON_ONLY_SYSTEM_SUFFIX}`;
  const userPrompt = `${prompts.critique.userPrompt(
    formatPersona(input.persona),
    formatScenario(input.scenario),
    formatHistory(input.history),
    input.draft,
  )}${user}`;

  try {
    const result = await ai.doChatStructuredFallback({
      system: systemPrompt,
      user: userPrompt,
      schema: {
        name: "trainer_critique",
        description: "AI critique and guide for a trainee's draft response.",
        properties: {
          score: {
            type: "number",
            description: "Rating from 0 to 10.",
          },
          strengths: {
            type: "array",
            description: "Things the trainee did well.",
            items: { type: "string", description: "A strength." },
          },
          improvements: {
            type: "array",
            description: "Specific actionable improvements.",
            items: { type: "string", description: "An improvement." },
          },
          suggestion: {
            type: "string",
            description: "A rewritten (guided) response.",
          },
        },
      },
      temperature: 0.6,
      type: "balanced",
      aiConfig,
    });

    return result as BCTrainerCritique;
  } catch (error) {
    console.error("[BunnyCase] Trainer critique failed:", error);
    throw error;
  }
}

export async function bcTrainerCoachFeedback(
  input: BCTrainerContextInput & { draft: string },
  aiConfig?: HelixAIOption,
): Promise<BCTrainerFeedback> {
  const scope = bcContainer.createScope();
  const ai = scope.resolve("ai");

  const prompts = bcResolveTrainerPrompts(bcResolveOption(input.aiOptions).id);
  const { system, user } = modeDirectives(input.aiOptions);

  const systemPrompt = `${prompts.coachFeedback.systemPrompt}${system}${JSON_ONLY_SYSTEM_SUFFIX}`;
  const userPrompt = `${prompts.coachFeedback.userPrompt(
    formatPersona(input.persona),
    formatScenario(input.scenario),
    input.draft,
  )}${user}`;

  try {
    const result = await ai.doChatStructuredFallback({
      system: systemPrompt,
      user: userPrompt,
      schema: {
        name: "trainer_coach_feedback",
        description: "Coaching feedback on a trainee's draft response.",
        properties: {
          suggestion: {
            type: "string",
            description: "The improved response to send.",
          },
          reason: {
            type: "string",
            description: "Why the correction is better.",
          },
          score: {
            type: "number",
            description: "Rating of the trainee's draft from 0 to 10.",
          },
        },
      },
      temperature: 0.6,
      type: "balanced",
      aiConfig,
    });

    return result as BCTrainerFeedback;
  } catch (error) {
    console.error("[BunnyCase] Trainer coaching failed:", error);
    throw error;
  }
}

/**
 * End-of-session review. Given the full conversation, produce a final summary
 * of the conversation, a guide, and a rating of what the trainee is missing.
 */
export async function bcTrainerSessionSummary(
  input: BCTrainerContextInput,
  aiConfig?: HelixAIOption,
): Promise<BCTrainerSessionSummary> {
  const scope = bcContainer.createScope();
  const ai = scope.resolve("ai");

  const prompts = bcResolveTrainerPrompts(bcResolveOption(input.aiOptions).id);
  const { system, user } = modeDirectives(input.aiOptions);

  const systemPrompt = `${prompts.sessionSummary.systemPrompt}${system}${JSON_ONLY_SYSTEM_SUFFIX}`;
  const userPrompt = `${prompts.sessionSummary.userPrompt(
    formatPersona(input.persona),
    formatScenario(input.scenario),
    formatHistory(input.history),
  )}${user}`;

  try {
    const result = await ai.doChatStructuredFallback({
      system: systemPrompt,
      user: userPrompt,
      schema: {
        name: "trainer_session_summary",
        description:
          "A final summary and rating of a completed training session.",
        properties: {
          summary: {
            type: "string",
            description: "One-paragraph recap of the whole conversation.",
          },
          guide: {
            type: "array",
            description: "Step-by-step guide for handling this conversation.",
            items: { type: "string", description: "A single guide step." },
          },
          score: {
            type: "number",
            description: "Overall trainee rating from 0 to 10.",
          },
          missing: {
            type: "array",
            description: "What the trainee is missing / should work on.",
            items: { type: "string", description: "A missing skill." },
          },
          strengths: {
            type: "array",
            description: "What the trainee did well.",
            items: { type: "string", description: "A strength." },
          },
        },
      },
      temperature: 0.6,
      type: "balanced",
      aiConfig,
    });

    return result as BCTrainerSessionSummary;
  } catch (error) {
    console.error("[BunnyCase] Trainer session summary failed:", error);
    throw error;
  }
}
