// bui.author-skills.server.enhance.ts
"use server";

import Handlebars from "handlebars";
import { buiContainer } from "../../container/bui.container";
import { BUIAISchemaOptions } from "../ai-schema/bui.ai-schema.types";
import { buiAuthorSkillPrompt } from "./bui.author-skills.prompt";
import { BUIAuthorSkillPromptType } from "./bui.author-skills.entity";
import { BUIAIOption } from "../../modules/ai/bui.ai.interface";

export async function buiAuthorSkillServerEnhanceWithParams(
  name: string,
  description: string,
  promptType: BUIAuthorSkillPromptType = "professional",
  aiConfig?: BUIAIOption,
) {
  const container = buiContainer.createScope();
  const ai = container.resolve("ai");

  const skillEnhancementSchema: BUIAISchemaOptions = {
    name: "author_skill_enhancement",
    description:
      "Enhances an author skill's name and generates a compelling, accurate description.",
    properties: {
      name: {
        type: "string",
        description: "The validated or enhanced skill name.",
      },
      description: {
        type: "string",
        description:
          "An enhanced, high-quality description of the skill based on instructions.",
      },
    },
  };

  // Select the prompts dynamically based on promptType
  const selectedPromptGroup =
    buiAuthorSkillPrompt.enhance[promptType] ||
    buiAuthorSkillPrompt.enhance.professional;
  console.log("promptType", promptType);
  const systemPrompt = `${selectedPromptGroup.systemPrompt}
    \n\n
    CRITICAL: Return ONLY a valid JSON object matching the requested structure. Do not include any markdown formatting (like \`\`\`json), explanations, or introduction outside of the raw JSON code.
    \n\n
    PROPERTY CONSTRAINTS YOU MUST FOLLOW:
    { name: string; description: string }
   `;
  const template = Handlebars.compile(selectedPromptGroup.userPrompt);
  const userPrompt = template({ name, description });

  try {
    const enhancedSkill = await ai.doChatStructuredFallback({
      system: systemPrompt,
      user: userPrompt,
      schema: skillEnhancementSchema,
      temperature: promptType === "creative" ? 0.85 : 0.6,
      aiConfig,
    });

    return enhancedSkill;
  } catch (error) {
    console.error("Failed to enhance author skill:", error);
    throw error;
  }
}
