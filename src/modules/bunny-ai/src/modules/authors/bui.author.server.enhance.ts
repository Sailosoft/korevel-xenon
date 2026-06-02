"use server";

import Handlebars from "handlebars";
import { buiContainer } from "../../container/bui.container"; // Adjust import path as needed
import { BUIAISchemaOptions } from "../ai-schema/bui.ai-schema.types";
import { buiAuthorPrompt } from "./bui.author.prompt";

export default async function buiAuthorServerEnhance() {
  console.log("Console from server");

  // const ai = buiContainer.resolve("ai");
  return {
    name: "TEST",
    description: "DESCRIPTION",
  };
}

export async function buiAuthorServerEnhanceWithParams(
  name: string,
  description: string,
) {
  const container = buiContainer.createScope();
  const ai = container.resolve("ai"); // Resolves to BUIAIService

  // 1. Define the schema contract for the response
  const authorEnhancementSchema: BUIAISchemaOptions = {
    name: "author_enhancement",
    description:
      "Enhances an author's name and generates a compelling, accurate bio description.",
    properties: {
      name: {
        type: "string",
        description:
          "The validated or enhanced author name (e.g., matching standard well-known spelling if recognizable).",
      },
      description: {
        type: "string",
        description:
          "An enhanced, high-quality description mixing the provided context. If the author is well-known, weave in historical/professional achievements along with recommended highlights.",
      },
    },
  };

  // 2. Draft the system guidelines and user payload
  const systemPrompt = buiAuthorPrompt.enhance.systemPrompt;
  const template = Handlebars.compile(buiAuthorPrompt.enhance.userPrompt);
  const userPrompt = template({
    name: name,
    description: description,
  });

  try {
    // 3. Invoke structured chat.
    // TypeScript will automatically type the result as { name: string; description: string; }
    const enhancedAuthor = await ai.doChatStructured({
      system: systemPrompt,
      user: userPrompt,
      schema: authorEnhancementSchema,
      temperature: 0.7, // Balanced for blending factual knowledge with creative prose
    });

    return enhancedAuthor;
  } catch (error) {
    console.error("Failed to enhance author profile:", error);
    throw error;
  }
}
