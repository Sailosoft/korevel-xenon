// bui.author.server.enhance.ts
"use server";

import Handlebars from "handlebars";
import { buiContainer } from "../../container/bui.container";
import { BUIAISchemaOptions } from "../ai-schema/bui.ai-schema.types";
import { buiAuthorPrompt } from "./bui.author.prompt";
import { BUIAuthorPromptType } from "./bui.author.entity";

export async function buiAuthorServerEnhanceWithParams(
  name: string,
  description: string,
  promptType: BUIAuthorPromptType = "professional",
) {
  const container = buiContainer.createScope();
  const ai = container.resolve("ai");

  const authorEnhancementSchema: BUIAISchemaOptions = {
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
    buiAuthorPrompt.enhance[promptType] || buiAuthorPrompt.enhance.professional;

  const systemPrompt = selectedPromptGroup.systemPrompt;
  const template = Handlebars.compile(selectedPromptGroup.userPrompt);
  const userPrompt = template({ name, description });

  try {
    const enhancedAuthor = await ai.doChatStructured({
      system: systemPrompt,
      user: userPrompt,
      schema: authorEnhancementSchema,
      temperature: promptType === "creative" ? 0.85 : 0.6, // Tweak temperature per style choice!
    });

    return enhancedAuthor;
  } catch (error) {
    console.error("Failed to enhance author profile:", error);
    throw error;
  }
}
