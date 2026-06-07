// bui.book-chapter.server.ts
"use server";

import Handlebars from "handlebars";
import { buiContainer } from "../../container/bui.container";
import {
  buiChapterPromptContent,
  BUIChapterPromptContypeType,
} from "./bui.book-chapter.prompt.content";
import { BUIBookChapterParams } from './bui.book.entity';


/**
 * Server Action to compile Chapter prompts and execute AI narrative generation
 */
export async function buiChapterServerContent(
  params: BUIBookChapterParams,
  promptType: BUIChapterPromptContypeType = "default",
) {
  const container = buiContainer.createScope();
  const ai = container.resolve("ai");

  // Pick the specified pattern variant or fallback safely to default
  const selectedPromptGroup =
    buiChapterPromptContent.prompt[promptType] ||
    buiChapterPromptContent.prompt.default;

  // Compile Handlebars templates
  const systemTemplate = Handlebars.compile(selectedPromptGroup.systemPrompt);
  const userTemplate = Handlebars.compile(selectedPromptGroup.userPrompt);

  const systemPrompt = systemTemplate(params);
  const userPrompt = userTemplate(params);

  try {
    const response = await ai.doChat({
      system: systemPrompt,
      user: userPrompt,
      temperature: 0.7,
    });

    return {
      success: true,
      content: response.trim(),
    };
  } catch (error) {
    console.error("AI Chapter Generation failed at server layer:", error);
    throw new Error("Failed to process chapter execution with AI.");
  }
}
