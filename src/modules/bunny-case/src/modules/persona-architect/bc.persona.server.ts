// bc.persona.server.ts
//
// Persona Architect server actions — AI profile generation.

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
  traits: string[],
  description: string,
  aiConfig?: HelixAIOption,
): Promise<BCGeneratedPersonaProfile> {
  const scope = bcContainer.createScope();
  const ai = scope.resolve("ai");

  const systemPrompt = `${bcPersonaPrompt.profile.systemPrompt}${JSON_ONLY_SYSTEM_SUFFIX}`;
  const userPrompt = bcPersonaPrompt.profile.userPrompt(name, traits, description);

  try {
    const profile = await ai.doChatStructuredFallback({
      system: systemPrompt,
      user: userPrompt,
      schema: {
        name: "persona_profile",
        description:
          "AI-generated psychological profile for a customer persona used in training roleplay.",
        properties: {
          psychologicalProfile: {
            type: "string",
            description: "Concise portrait of the persona's mindset and motivations.",
          },
          triggers: {
            type: "array",
            description: "Behaviours that escalate this persona.",
            items: {
              type: "string",
              description: "A behaviour that escalates the persona.",
            },
          },
          preferences: {
            type: "array",
            description: "Things this persona values in a conversation.",
            items: {
              type: "string",
              description: "Something the persona values.",
            },
          },
          communicationStyle: {
            type: "string",
            description: "One paragraph of tone, pacing and empathy guidance.",
          },
          aiSummary: {
            type: "string",
            description: "One-sentence summary of the persona.",
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
