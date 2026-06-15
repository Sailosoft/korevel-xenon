// bui.author.server.enhance.ts
"use server";

import Handlebars from "handlebars";
import { buiContainer } from "../../container/bui.container";
import type { HelixAISchemaOptions } from "@/src/modules/helix";
import { buiAuthorPrompt } from "./bui.author.prompt";
import type { HelixAIOption } from "@/src/modules/helix";

export async function buiAuthorServerEnhanceWithParams(
  name: string,
  description: string,
  promptType: string = "professional",
  aiConfig?: HelixAIOption,
) {
  const container = buiContainer.createScope();
  const ai = container.resolve("ai");

  const authorEnhancementSchema: HelixAISchemaOptions = {
    name: "author_enhancement",
    description:
      "Enhances an author's name and generates a compelling, accurate bio description.",
    properties: {
      name: {
        type: "string",
        description: "The validated or enhanced author name.",
      },
      description: {
        type: "string",
        description:
          "An enhanced, high-quality description mixing the provided context based on instructions.",
      },
    },
  };

  // Select the prompts dynamically based on promptType
  const selectedPromptGroup =
    buiAuthorPrompt.enhance.find((p) => p.key === promptType) ||
    buiAuthorPrompt.enhance[0];
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
    const enhancedAuthor = await ai.doChatStructuredFallback({
      system: systemPrompt,
      user: userPrompt,
      schema: authorEnhancementSchema,
      temperature: promptType === "creative" ? 0.85 : 0.6, // Tweak temperature per style choice!
      aiConfig,
    });

    return enhancedAuthor;
  } catch (error) {
    console.error("Failed to enhance author profile:", error);
    throw error;
  }
}
