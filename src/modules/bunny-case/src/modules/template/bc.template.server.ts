// bc.template.server.ts
//
// Template Extraction server action — distills the ideal-agent
// dialogue into a reusable Communication Template / playbook.

"use server";

import type { HelixAIOption } from "@/src/modules/helix";
import { bcContainer } from "../../container/bc.container";
import type { BCSimulatorTurn } from "../simulator/bc.simulator.entity";
import type { BCExtractedPlaybook } from "./bc.template.entity";

const JSON_ONLY_SYSTEM_SUFFIX = `
  \n\n
  CRITICAL: Return ONLY a valid JSON object matching the requested structure.
  Do not include markdown formatting (like \`\`\`json), explanations, or
  introduction outside of the raw JSON object.
`;

export async function bcExtractPlaybook(
  turns: BCSimulatorTurn[],
  personaName: string,
  caseTitle: string,
  aiConfig?: HelixAIOption,
): Promise<BCExtractedPlaybook> {
  const scope = bcContainer.createScope();
  const ai = scope.resolve("ai");

  const transcript = turns
    .map(
      (t) =>
        `[${t.speaker}] ${t.external}${t.internal ? ` (${t.internal})` : ""}`,
    )
    .join("\n");

  const systemPrompt = `
    You are a training-content editor. From the transcript of an ideal-agent
    conversation you extract a reusable Communication Template.

    - title: a short descriptive title.
    - content: the key successful phrases and the logic the ideal agent used,
      written so another agent can reuse it.
    - steps: an ordered list of playbook steps.
    - tags: 3-6 short tags.
  ${JSON_ONLY_SYSTEM_SUFFIX}`;

  const userPrompt = `
    Persona: ${personaName || "(unknown)"}
    Case: ${caseTitle || "(unknown)"}

    Transcript:
    ${transcript}
  `;

  try {
    const result = await ai.doChatStructuredFallback({
      system: systemPrompt,
      user: userPrompt,
      schema: {
        name: "communication_template",
        description: "An extracted communication template / playbook.",
        properties: {
          title: {
            type: "string",
            description: "Short descriptive title for the template.",
          },
          content: {
            type: "string",
            description: "Key successful phrases and logic to reuse.",
          },
          steps: {
            type: "array",
            description: "Ordered playbook steps.",
            items: { type: "string", description: "A single step." },
          },
          tags: {
            type: "array",
            description: "Short tags for the template.",
            items: { type: "string", description: "A tag." },
          },
        },
      },
      temperature: 0.5,
      type: "balanced",
      aiConfig,
    });

    return result as BCExtractedPlaybook;
  } catch (error) {
    console.error("[BunnyCase] Failed to extract playbook:", error);
    throw error;
  }
}
