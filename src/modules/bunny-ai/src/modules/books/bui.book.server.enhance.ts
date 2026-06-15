// bui.book.server.enhance.ts
"use server";

import Handlebars from "handlebars";
import { buiContainer } from "../../container/bui.container";
import { BUIAISchemaOptions } from "../ai-schema/bui.ai-schema.types";
import { buiBookPrompt } from "./bui.book.prompt";
import type { HelixAIOption } from "@/src/modules/helix";

export async function buiBookServerEnhanceWithParams(
  title: string,
  description: string,
  promptType: string = "comprehensive",
  aiConfig?: HelixAIOption,
) {
  const container = buiContainer.createScope();
  const ai = container.resolve("ai");

  // A unified schema capable of holding any of the 5 option patterns gracefully
  const bookEnhancementSchema: BUIAISchemaOptions = {
    name: "book_enhancement",
    description:
      "Enhances a book's title and generates structured conceptual metadata, chapters, or pitches.",
    properties: {
      title: {
        type: "string",
        description: "The newly enhanced and optimized book title.",
      },
      content: {
        type: "string",
        description:
          "The comprehensive structured breakdown (descriptions, chapters, or marketing segments) formatted exactly as requested.",
      },
    },
  };

  // Fall back to 'comprehensive' (Option 1) if the prompt type isn't recognized
  const selectedPromptGroup =
    buiBookPrompt.enhance.find((p) => p.key === promptType) ||
    buiBookPrompt.enhance[0];

  // Merge the prompt patterns with explicit JSON structural guidance
  const systemPrompt = `${selectedPromptGroup.systemPrompt}
    \n\n
    CRITICAL JSON FORMATTING RULES:
    1. Place the generated enhanced title inside the "title" field.
    2. Place all other requested structural pattern fields (e.g., Description, Detailed Description, Chapters, Tags, or Loglines) entirely inside the "content" field using clean text breaks.
    3. Return ONLY a valid JSON object matching the requested structure. Do not include any markdown syntax wrappers (like \`\`\`json), conversational filler, or external explanations.
    \n\n
    PROPERTY CONSTRAINTS YOU MUST FOLLOW:
    { "title": string, "content": string }
   `;

  const template = Handlebars.compile(selectedPromptGroup.userPrompt);
  const userPrompt = template({ title, description });

  try {
    const enhancedBook = await ai.doChatStructuredFallback({
      system: systemPrompt,
      user: userPrompt,
      schema: bookEnhancementSchema,
      // Give creative and marketing templates a slightly higher temperature for flair!
      temperature: ["marketing", "cinematic"].includes(promptType) ? 0.85 : 0.6,
      aiConfig,
    });

    return enhancedBook;
  } catch (error) {
    console.error("Failed to enhance book profile:", error);
    throw error;
  }
}
