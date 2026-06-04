"use server";

import { buiContainer } from "../../container/bui.container";
import { buiChapterPrompt, BUIChapterPromptType } from "./bui.book-chapter.prompt";
import Handlebars from "handlebars";

export async function buiChapterServerGenerate(
  params: { bookTitle?: string; title: string; description?: string; content?: string; additionalPrompt?: string },
  type: BUIChapterPromptType = "draft"
) {
  const container = buiContainer.createScope();
  const ai = container.resolve("ai");

  const selected = buiChapterPrompt.generate[type] || buiChapterPrompt.generate.draft;
  const systemPrompt = selected.systemPrompt;
  const userPrompt = Handlebars.compile(selected.userPrompt)(params);

  const result = await ai.doChat({
    system: systemPrompt,
    user: userPrompt,
    temperature: 0.7,
  });

  return { content: result };
}