// bc.hot-seat.server.ts
//
// Hot Seat server actions — the REVERSE of the Conversation Trainer:
//  - bcHotSeatPersonaReply → the AI persona's spoken + hidden answer under
//    the trainee's grilling, with a composure score.
//  - bcHotSeatEvaluate      → end-of-run evaluation of the TRAINEE'S
//    questioning craft.
//
// Each training mode resolves its own prompt set from ./prompts/.

"use server";

import type { HelixAIOption } from "@/src/modules/helix";
import { bcContainer } from "../../container/bc.container";
import { bcResolveHotSeatPrompts } from "./bc.hot-seat.prompt";
import type {
  BCHotSeatEvaluation,
  BCHotSeatReply,
} from "./bc.hot-seat.entity";
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

export interface BCHotSeatContextInput {
  /** The persona the AI role-plays while being grilled. */
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
    .slice(-12)
    .map((m) => `[${m.role}] ${m.external}`)
    .join("\n");
}

/** Built-in modes ship their own prompts; only custom modes inject directives. */
function modeDirectives(aiOptions?: BCGenAIOptions) {
  const option = bcResolveGenAIOption(aiOptions);
  if (option.id === "custom") {
    return {
      system: bcGenAISystemDirectives(aiOptions),
      user: bcGenAIUserDirectives(aiOptions),
    };
  }
  return { system: "", user: "" };
}

export async function bcHotSeatPersonaReply(
  input: BCHotSeatContextInput & { userMsg: string },
  aiConfig?: HelixAIOption,
): Promise<BCHotSeatReply> {
  const scope = bcContainer.createScope();
  const ai = scope.resolve("ai");

  const prompts = bcResolveHotSeatPrompts(
    bcResolveGenAIOption(input.aiOptions).id as BCGenAIOptionId,
  );
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
        name: "hot_seat_persona_reply",
        description:
          "The persona's spoken + hidden answer while being grilled, with composure.",
        properties: {
          external: {
            type: "string",
            description: "What the persona says out loud.",
          },
          internal: {
            type: "string",
            description:
              "The persona's hidden thought — what it really thinks of the question.",
          },
          sentiment: {
            type: "number",
            description: "Sentiment score from -1 to 1.",
          },
          composure: {
            type: "number",
            description:
              "How composed the persona feels under pressure, 0-10 (10 = totally calm).",
          },
          cracked: {
            type: "boolean",
            description:
              "True when this answer concedes a fact or contradicts an earlier statement.",
          },
        },
      },
      temperature: 0.85,
      type: "creative",
      aiConfig,
    });

    return result as BCHotSeatReply;
  } catch (error) {
    console.error("[BunnyCase] Hot Seat persona reply failed:", error);
    throw error;
  }
}

export async function bcHotSeatEvaluate(
  input: BCHotSeatContextInput & {
    transcript: Array<{ role: string; external: string }>;
  },
  aiConfig?: HelixAIOption,
): Promise<BCHotSeatEvaluation> {
  const scope = bcContainer.createScope();
  const ai = scope.resolve("ai");

  const prompts = bcResolveHotSeatPrompts(
    bcResolveGenAIOption(input.aiOptions).id as BCGenAIOptionId,
  );
  const { system, user } = modeDirectives(input.aiOptions);

  const systemPrompt = `${prompts.evaluate.systemPrompt}${system}${JSON_ONLY_SYSTEM_SUFFIX}`;
  const userPrompt = `${prompts.evaluate.userPrompt(
    formatPersona(input.persona),
    formatScenario(input.scenario),
    formatHistory(input.transcript),
  )}${user}`;

  try {
    const result = await ai.doChatStructuredFallback({
      system: systemPrompt,
      user: userPrompt,
      schema: {
        name: "hot_seat_evaluation",
        description: "Evaluation of the trainee's questioning craft.",
        properties: {
          score: {
            type: "number",
            description: "Score from 0 to 100 rating the trainee's questioning.",
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
            description: "Short narrative of how the interrogation went.",
          },
          bestQuestion: {
            type: "string",
            description:
              "The single best question the trainee asked, verbatim (empty if none).",
          },
        },
      },
      temperature: 0.5,
      type: "balanced",
      aiConfig,
    });

    return result as BCHotSeatEvaluation;
  } catch (error) {
    console.error("[BunnyCase] Hot Seat evaluation failed:", error);
    throw error;
  }
}
