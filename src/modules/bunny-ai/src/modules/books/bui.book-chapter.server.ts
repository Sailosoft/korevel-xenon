"use server";

import { buiContainer } from "../../container/bui.container";
import { BUIAuthor } from "../authors/bui.author.entity";
import {
  buiChapterPrompt,
  BUIChapterPromptType,
} from "./bui.book-chapter.prompt";
import Handlebars from "handlebars";
import { BUIBookEntity } from "./bui.book.entity";
import { BUIAIOption } from "../../modules/ai/bui.ai.interface";
import { BUIAuthorSkill } from "../author-skills/bui.author-skills.entity";

export async function buiChapterServerGenerate(
  params: { book: BUIBookEntity; author?: BUIAuthor },
  type: BUIChapterPromptType = "draft",
  useAuthorProfile: boolean = true,
  aiConfig?: BUIAIOption,
  skills?: BUIAuthorSkill[],
) {
  const container = buiContainer.createScope();
  const ai = container.resolve("ai");

  const selected =
    buiChapterPrompt.generateChapters[type] ||
    buiChapterPrompt.generateChapters.default;

  // Augment params with skills if provided
  const promptParams = {
    ...params,
    skills: skills || [],
  };

  // Choose correct structural layout template injection based on configuration toggle
  const templateSource =
    useAuthorProfile && params.author
      ? buiChapterPrompt.generateUserPrompt
      : buiChapterPrompt.generateUserPromptWithoutAuthor;

  const systemPrompt = `${selected.systemPrompt}\n${buiChapterPrompt.generateChaptersExtraPrompt}`;
  const userPrompt = `${Handlebars.compile(templateSource)(promptParams)}\n${selected.userPrompt}`;

  const result = await ai.doChat({
    system: systemPrompt,
    user: userPrompt,
    temperature: 0.7,
    aiConfig,
  });

  // Returns raw context for structural layout processing pipelines
  return result;
}
