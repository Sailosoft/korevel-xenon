"use server";

import { buiContainer } from "../../container/bui.container";
import { BUIAuthor } from "../authors/bui.author.entity";
import { buiChapterPrompt } from "./bui.book-chapter.prompt";
import Handlebars from "handlebars";
import { BUIBookChapterEntity, BUIBookEntity } from "./bui.book.entity";
import type { HelixAIOption } from "@/src/modules/helix";
import { BUIAuthorSkill } from "../author-skills/bui.author-skills.entity";

export async function buiChapterServerGenerate(
  params: {
    book: BUIBookEntity;
    author?: BUIAuthor;
    existingChapters?: BUIBookChapterEntity[];
  },
  type: string = "draft",
  useAuthorProfile: boolean = true,
  aiConfig?: HelixAIOption,
  skills?: BUIAuthorSkill[],
) {
  const container = buiContainer.createScope();
  const ai = container.resolve("ai");

  const selected =
    buiChapterPrompt.generateChapters.find((p) => p.key === type) ||
    buiChapterPrompt.generateChapters[0];

  // Augment params with skills and existing chapters if provided
  const promptParams = {
    ...params,
    skills: skills || [],
    hasExistingChapters:
      Array.isArray(params.existingChapters) &&
      params.existingChapters.length > 0,
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
