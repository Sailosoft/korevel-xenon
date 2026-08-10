// bc.agent-persona.server.ts
//
// Agent Persona Architect server actions — AI generation of the ideal-agent
// persona profile.

"use server";

import type { HelixAIOption } from "@/src/modules/helix";
import { bcContainer } from "../../container/bc.container";
import { bcAgentPersonaPrompt } from "./bc.agent-persona.prompt";
import type { BCGeneratedAgentPersona } from "./bc.agent-persona.entity";
import type { BCGenAIOptions } from "../generative-ai/bc.generative-ai.entity";
import { bcResolveGenAIOption } from "../generative-ai/bc.generative-ai.entity";
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

export async function bcAgentPersonaGenerateProfile(
  name: string,
  traits: string[],
  description: string,
  aiConfig?: HelixAIOption,
  aiOptions?: BCGenAIOptions,
): Promise<BCGeneratedAgentPersona> {
  const scope = bcContainer.createScope();
  const ai = scope.resolve("ai");

  const option = bcResolveGenAIOption(aiOptions);

  const systemPrompt = `${bcAgentPersonaPrompt.profile.systemPrompt}${bcGenAISystemDirectives(aiOptions)}${JSON_ONLY_SYSTEM_SUFFIX}`;
  const userPrompt = `${bcAgentPersonaPrompt.profile.userPrompt(
    name,
    traits,
    description,
    {
      participantLabel: option.participantLabel,
      counterpartLabel: option.counterpartLabel,
    },
  )}${bcGenAIUserDirectives(aiOptions)}`;

  try {
    const profile = await ai.doChatStructuredFallback({
      system: systemPrompt,
      user: userPrompt,
      schema: {
        name: "agent_persona_profile",
        description:
          "AI-generated profile for an ideal agent persona used in training roleplay.",
        properties: {
          psychologicalProfile: {
            type: "string",
            description: "Concise portrait of the agent's mindset and values.",
          },
          principles: {
            type: "array",
            description: "3-6 guiding principles the agent always follows.",
            items: {
              type: "string",
              description: "A guiding principle.",
            },
          },
          communicationStyle: {
            type: "string",
            description: "One paragraph of tone, pacing and empathy guidance.",
          },
          aiSummary: {
            type: "string",
            description: "One-sentence summary of the agent persona.",
          },
        },
      },
      temperature: 0.7,
      type: "balanced",
      aiConfig,
    });

    return profile as BCGeneratedAgentPersona;
  } catch (error) {
    console.error("[BunnyCase] Failed to generate agent persona profile:", error);
    throw error;
  }
}
