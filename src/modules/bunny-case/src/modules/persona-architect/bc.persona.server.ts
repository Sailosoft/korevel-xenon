// bc.persona.server.ts
//
// Persona Architect server actions — AI role-play instruction generation.
// Only the persona name and the author's instruction are used; the result is a
// single `aiPrompt` string.

"use server";

import type { HelixAIOption } from "@/src/modules/helix";
import { bcContainer } from "../../container/bc.container";
import { bcPersonaPrompt } from "./bc.persona.prompt";
import type { BCGeneratedPersonaProfile } from "./bc.persona.entity";

const JSON_ONLY_SYSTEM_SUFFIX = `
  \n\n
  CRITICAL: Return ONLY a valid JSON object matching the requested structure.
  Do not include markdown formatting (like \`\`\`json), explanations, or
  introduction outside of the raw JSON object.
`;

export async function bcPersonaGenerateProfile(
  name: string,
  instruction: string,
  aiConfig?: HelixAIOption,
): Promise<BCGeneratedPersonaProfile> {
  const scope = bcContainer.createScope();
  const ai = scope.resolve("ai");

  const systemPrompt = `${bcPersonaPrompt.profile.systemPrompt}${JSON_ONLY_SYSTEM_SUFFIX}`;
  const userPrompt = bcPersonaPrompt.profile.userPrompt(name, instruction);

  try {
    const profile = await ai.doChatStructuredFallback({
      system: systemPrompt,
      user: userPrompt,
      schema: {
        name: "persona_profile",
        description:
          "A single role-play instruction an AI follows to behave consistently as a persona.",
        properties: {
          aiPrompt: {
            type: "string",
            description:
              "The role-play instruction, in second person ('You are ...'), covering mindset, speaking style, escalation/calm triggers and what the persona wants.",
          },
        },
      },
      temperature: 0.7,
      type: "balanced",
      aiConfig,
    });

    return profile as BCGeneratedPersonaProfile;
  } catch (error) {
    console.error("[BunnyCase] Failed to generate persona profile:", error);
    throw error;
  }
}
