// bc.simulator.server.ts
//
// Conversation Simulator server actions — generates the ideal-agent dialogue
// with dual-view (external / internal) for every turn, honoring the requested
// turn count and ending (resolved / unresolved), and returns a summarization
// with tips and guides. An optional "main actor" persona (mode main-actor or
// all) shapes the ideal agent, replacing the old Agent Persona module.
//
// Each training mode resolves its own prompt set from ./prompts/.

"use server";

import type { HelixAIOption } from "@/src/modules/helix";
import { bcContainer } from "../../container/bc.container";
import { bcResolveSimulatorPrompts } from "./bc.simulator.prompt";
import type { BCSimulationResult } from "./bc.simulator.entity";
import type { BCCasePersona } from "../persona-architect/bc.persona.entity";
import type { BCCaseScenario } from "../case-base/bc.case.entity";
import type {
  BCGenAIOptions,
  BCGenAIOptionId,
} from "../generative-ai/bc.generative-ai.entity";
import {
  bcGenAISystemDirectives,
  bcGenAIUserDirectives,
} from "../generative-ai/bc.generative-ai.prompt";
import { bcResolveGenAIOption } from "../generative-ai/bc.generative-ai.entity";

const JSON_ONLY_SYSTEM_SUFFIX = `
  \n\n
  CRITICAL: Return ONLY a valid JSON object matching the requested structure.
  Do not include markdown formatting (like \`\`\`json), explanations, or
  introduction outside of the raw JSON object.
`;

export interface BCSimulateInput {
  persona: BCCasePersona;
  scenario: BCCaseScenario;
  /** Optional main-actor persona that shapes the ideal agent. */
  mainActor?: BCCasePersona;
  /** Optional number of turns (falls back to 6-10 when unset). */
  turns?: number;
  /** How the conversation should end. */
  outcome?: "resolved" | "unresolved";
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

export async function bcSimulateConversation(
  input: BCSimulateInput,
  aiConfig?: HelixAIOption,
): Promise<BCSimulationResult> {
  const scope = bcContainer.createScope();
  const ai = scope.resolve("ai");

  const outcome = input.outcome ?? "resolved";
  const option = bcResolveGenAIOption(input.aiOptions);
  const prompts = bcResolveSimulatorPrompts(option.id as BCGenAIOptionId);

  // Built-in modes ship their own prompts; only custom modes inject directives.
  const isCustom = option.id === "custom";
  const system = isCustom ? bcGenAISystemDirectives(input.aiOptions) : "";
  const user = isCustom ? bcGenAIUserDirectives(input.aiOptions) : "";

  const optionsBlock = [
    `Requested turn count: ${input.turns ? String(input.turns) : "default (6-10)"}`,
    `Requested ending: ${outcome}`,
  ].join("\n");

  const systemPrompt = `${prompts.simulate.systemPrompt}${system}${JSON_ONLY_SYSTEM_SUFFIX}`;
  const userPrompt = `${prompts.simulate.userPrompt(
    formatPersona(input.persona),
    formatScenario(input.scenario),
    optionsBlock,
    input.mainActor ? formatPersona(input.mainActor) : "",
  )}${user}`;

  try {
    const result = await ai.doChatStructuredFallback({
      system: systemPrompt,
      user: userPrompt,
      schema: {
        name: "simulated_conversation",
        description:
          "A dual-view conversation between a persona and an ideal agent, plus its ending and coaching tips.",
        properties: {
          summary: {
            type: "string",
            description: "One-paragraph summary of how the conversation went.",
          },
          outcome: {
            type: "string",
            description: '"resolved" or "unresolved".',
          },
          nextSteps: {
            type: "string",
            description:
              'Only when outcome is "unresolved": the better place the conversation landed and the follow-up plan to close the case.',
          },
          tips: {
            type: "object",
            description: "Summarization with actionable coaching material.",
            properties: {
              keyPhrases: {
                type: "array",
                description: "3-5 short, reusable phrases from the agent that worked.",
                items: {
                  type: "string",
                  description: "A reusable phrase used by the agent.",
                },
              },
              guide: {
                type: "array",
                description: "4-6 step-by-step instructions to handle this type of case.",
                items: {
                  type: "string",
                  description: "One step of the guide.",
                },
              },
              pitfalls: {
                type: "array",
                description: "2-4 mistakes to avoid with this persona.",
                items: {
                  type: "string",
                  description: "A mistake to avoid.",
                },
              },
            },
          },
          turns: {
            type: "array",
            description: "The alternating dialogue turns.",
            items: {
              type: "object",
              description: "A single dialogue turn.",
              properties: {
                speaker: {
                  type: "string",
                  description: '"persona" or "agent".',
                },
                external: {
                  type: "string",
                  description: "What is actually said.",
                },
                internal: {
                  type: "string",
                  description:
                    "Hidden thought (persona emotion) or agent rationale.",
                },
                sentiment: {
                  type: "number",
                  description: "Sentiment score from -1 to 1.",
                },
              },
            },
          },
        },
      },
      temperature: 0.8,
      type: "creative",
      aiConfig,
    });

    return result as unknown as BCSimulationResult;
  } catch (error) {
    console.error("[BunnyCase] Failed to simulate conversation:", error);
    throw error;
  }
}
