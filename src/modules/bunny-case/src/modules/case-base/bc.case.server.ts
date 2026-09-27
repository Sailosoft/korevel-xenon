// bc.case.server.ts
//
// Case Base server actions — AI scenario generation. Produces a single
// markdown `content` body from a title + raw instructions.

"use server";

import type { HelixAIOption } from "@/src/modules/helix";
import { bcContainer } from "../../container/bc.container";
import { bcCasePrompt } from "./bc.case.prompt";
import type { BCGeneratedScenario } from "./bc.case.entity";
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

export async function bcCaseGenerateScenario(
  title: string,
  instructions: string,
  aiConfig?: HelixAIOption,
  aiOptions?: BCGenAIOptions,
): Promise<BCGeneratedScenario> {
  const scope = bcContainer.createScope();
  const ai = scope.resolve("ai");

  const systemPrompt = `${bcCasePrompt.scenario.systemPrompt}${bcGenAISystemDirectives(aiOptions)}${JSON_ONLY_SYSTEM_SUFFIX}`;
  const userPrompt = `${bcCasePrompt.scenario.userPrompt(
    title,
    instructions,
  )}${bcGenAIUserDirectives(aiOptions)}`;

  try {
    const scenario = await ai.doChatStructuredFallback({
      system: systemPrompt,
      user: userPrompt,
      schema: {
        name: "case_scenario",
        description:
          "A complete, free-form training case written as markdown content.",
        properties: {
          content: {
            type: "string",
            description:
              "The full case body in markdown: situation, conflict/topic, success outcome and possible escalations.",
          },
        },
      },
      temperature: 0.6,
      type: "balanced",
      aiConfig,
    });

    return scenario as BCGeneratedScenario;
  } catch (error) {
    console.error("[BunnyCase] Failed to generate scenario:", error);
    throw error;
  }
}
