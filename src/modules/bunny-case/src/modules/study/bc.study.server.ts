// bc.study.server.ts
//
// Study module server actions — generates the 1000-2000 word handbook from a
// case and persona (feature #8). The "generate type" selects the handbook
// flavour (feature #12) and the training mode (case handling / job interview)
// uses the shared Generative AI options as the single source of truth
// (feature #5), so every module applies the same directives.

"use server";

import type { HelixAIOption } from "@/src/modules/helix";
import { bcContainer } from "../../container/bc.container";
import { bcStudyPrompt } from "./bc.study.prompt";
import type {
  BCGeneratedStudy,
  BCStudyGenerateType,
} from "./bc.study.entity";
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

export interface BCStudyInput {
  /** Optional persona — when omitted the handbook focuses on the case alone. */
  persona?: BCCasePersona;
  scenario: BCCaseScenario;
  /** Handbook flavour (feature #12). Defaults to "default". */
  generateType?: BCStudyGenerateType;
  /** Training mode (issue-handling / job-interview) — single source of truth (feature #5). */
  aiOptions?: BCGenAIOptions;
}

export async function bcGenerateStudy(
  input: BCStudyInput,
  aiConfig?: HelixAIOption,
): Promise<BCGeneratedStudy> {
  const scope = bcContainer.createScope();
  const ai = scope.resolve("ai");

  const prompt =
    bcStudyPrompt.types[input.generateType ?? "default"] ??
    bcStudyPrompt.types.default;

  const systemPrompt = `${prompt.systemPrompt}${bcGenAISystemDirectives(input.aiOptions)}${JSON_ONLY_SYSTEM_SUFFIX}`;
  const personaNote = input.persona
    ? ""
    : "\n\nNOTE: No persona was provided. Base the handbook on the case itself and on general best practices for this type of interaction.";
  const userPrompt = `${prompt.userPrompt(
    {
      name: input.persona?.name ?? "",
      traits: input.persona?.traits ?? "",
      profile:
        input.persona?.psychologicalProfile ||
        input.persona?.description ||
        "",
      triggers: input.persona?.triggers ?? "",
      preferences: input.persona?.preferences ?? "",
    },
    {
      title: input.scenario.title,
      description: input.scenario.description || "",
      conflict: input.scenario.conflict || "",
      objective: input.scenario.objective || "",
    },
  )}${personaNote}${bcGenAIUserDirectives(input.aiOptions)}`;

  try {
    const result = await ai.doChatStructuredFallback({
      system: systemPrompt,
      user: userPrompt,
      schema: {
        name: "case_study_handbook",
        description:
          "A 1000-2000 word handbook / guide book for handling a training case, plus quick-memorize outline points.",
        properties: {
          title: {
            type: "string",
            description: "Short engaging handbook title.",
          },
          content: {
            type: "string",
            description:
              "The full handbook body in markdown, 1000-2000 words.",
          },
          outline: {
            type: "array",
            description: "Quick memorization points by section.",
            items: {
              type: "object",
              description: "One outline point.",
              properties: {
                title: {
                  type: "string",
                  description: "Section title.",
                },
                summary: {
                  type: "string",
                  description: "One-to-two sentence recap.",
                },
              },
            },
          },
        },
      },
      temperature: 0.7,
      type: "balanced",
      aiConfig,
    });

    return result as unknown as BCGeneratedStudy;
  } catch (error) {
    console.error("[BunnyCase] Failed to generate study handbook:", error);
    throw error;
  }
}
