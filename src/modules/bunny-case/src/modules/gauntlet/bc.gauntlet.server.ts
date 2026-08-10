// bc.gauntlet.server.ts
//
// Stress-Test Gauntlet server actions:
//  - bcGauntletPersonaReply → persona reply, optionally with a curveball.
//  - bcGauntletEvaluate      → pass/fail certification evaluation.

"use server";

import type { HelixAIOption } from "@/src/modules/helix";
import { bcContainer } from "../../container/bc.container";
import { bcGauntletPrompt } from "./bc.gauntlet.prompt";
import type {
  BCEvaluationResult,
  BCGauntletReply,
} from "../trainer/bc.trainer.entity";
import type { BCCasePersona } from "../persona-architect/bc.persona.entity";
import type { BCCaseScenario } from "../case-base/bc.case.entity";
import type { BCGenAIOptions } from "../generative-ai/bc.generative-ai.entity";
import {
  bcGenAISystemDirectives,
  bcGenAIUserDirectives,
} from "../generative-ai/bc.generative-ai.prompt";

const JSON_ONLY_SYSTEM_SUFFIX = `
  \n\n
  CRITICAL: Return ONLY a valid JSON object matching the requested structure.
  Do not include markdown formatting (like \`\`\`json), explanations, or
  introduction outside of the raw JSON object.
`;

export interface BCGauntletContextInput {
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
    `Triggers: ${persona.triggers || "(none)"}`,
    `Communication style: ${persona.communicationStyle || "(none)"}`,
    `Psychological profile: ${persona.psychologicalProfile || ""}`,
  ].join("\n");
}

function formatScenario(scenario: BCCaseScenario): string {
  return [
    `Title: ${scenario.title}`,
    `Conflict: ${scenario.conflict || "(none)"}`,
    `Objective: ${scenario.objective || "(resolve the case)"}`,
    `Escalation points: ${scenario.escalationPoints || "(none)"}`,
  ].join("\n");
}

function formatHistory(history: Array<{ role: string; external: string }>) {
  return history
    .slice(-10)
    .map((m) => `[${m.role}] ${m.external}`)
    .join("\n");
}

export async function bcGauntletPersonaReply(
  input: BCGauntletContextInput & { userMsg: string; curveballHint: boolean },
  aiConfig?: HelixAIOption,
): Promise<BCGauntletReply> {
  const scope = bcContainer.createScope();
  const ai = scope.resolve("ai");

  const systemPrompt = `${bcGauntletPrompt.personaReply.systemPrompt}${bcGenAISystemDirectives(input.aiOptions)}${JSON_ONLY_SYSTEM_SUFFIX}`;
  const userPrompt = `${bcGauntletPrompt.personaReply.userPrompt(
    formatPersona(input.persona),
    formatScenario(input.scenario),
    formatHistory(input.history),
    input.userMsg,
    input.curveballHint,
  )}${bcGenAIUserDirectives(input.aiOptions)}`;

  try {
    const result = await ai.doChatStructuredFallback({
      system: systemPrompt,
      user: userPrompt,
      schema: {
        name: "gauntlet_persona_reply",
        description: "The persona's spoken + hidden response with optional curveball.",
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
          curveball: {
            type: "object",
            description: "Present only when a curveball is introduced.",
            properties: {
              label: {
                type: "string",
                description: "Short label for the curveball.",
              },
              description: {
                type: "string",
                description: "What unexpected escalation happens.",
              },
            },
          },
        },
      },
      temperature: 0.85,
      type: "creative",
      aiConfig,
    });

    return result as BCGauntletReply;
  } catch (error) {
    console.error("[BunnyCase] Gauntlet persona reply failed:", error);
    throw error;
  }
}

export async function bcGauntletEvaluate(
  input: BCGauntletContextInput & {
    transcript: Array<{ role: string; external: string }>;
  },
  aiConfig?: HelixAIOption,
): Promise<BCEvaluationResult> {
  const scope = bcContainer.createScope();
  const ai = scope.resolve("ai");

  const systemPrompt = `${bcGauntletPrompt.evaluate.systemPrompt}${bcGenAISystemDirectives(input.aiOptions)}${JSON_ONLY_SYSTEM_SUFFIX}`;
  const userPrompt = `${bcGauntletPrompt.evaluate.userPrompt(
    formatPersona(input.persona),
    formatScenario(input.scenario),
    formatHistory(input.transcript),
  )}${bcGenAIUserDirectives(input.aiOptions)}`;

  try {
    const result = await ai.doChatStructuredFallback({
      system: systemPrompt,
      user: userPrompt,
      schema: {
        name: "gauntlet_evaluation",
        description: "Pass/fail certification evaluation of a gauntlet run.",
        properties: {
          passed: {
            type: "boolean",
            description: "Whether the trainee resolved the case without coaching.",
          },
          score: {
            type: "number",
            description: "Score from 0 to 100.",
          },
          reason: {
            type: "string",
            description: "One-paragraph justification.",
          },
          feedback: {
            type: "array",
            description: "Specific strengths / improvement areas.",
            items: { type: "string", description: "A single feedback point." },
          },
          summary: {
            type: "string",
            description: "Short narrative of how the case was resolved.",
          },
        },
      },
      temperature: 0.5,
      type: "balanced",
      aiConfig,
    });

    return result as BCEvaluationResult;
  } catch (error) {
    console.error("[BunnyCase] Gauntlet evaluation failed:", error);
    throw error;
  }
}
