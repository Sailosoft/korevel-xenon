"use server";

import BookBuilderModule from "./book-builder.module";
import {
  IBookBuilderAuthor,
  IBookBuilderChapter,
  IBookBuilderGeneration,
} from "./book-builder.interface";
import { BOOK_BUILDER_CONFIG } from "../config/book-builder.config";

const module = new BookBuilderModule();
// const model = "gemma3:4b";
// const model = "gemma4:31b-cloud";
const model = BOOK_BUILDER_CONFIG.OPEN_AI_MODEL;

// You are an expert book architect. Generate exactly 5 chapters for the book:
export async function bookBuilderGenerateChaptersAction(
  title: string,
  description: string,
  authorName: string,
  skills: string[],
): Promise<IBookBuilderChapter[]> {
  const prompt = `
You are an expert book architect. Generate any number of chapters for the book:

Title: "${title}"
Description: ${description}
Author: ${authorName}
Expertise: ${skills.join(", ") || "general writing"}

Return ONLY a valid JSON array (no extra text) with this structure:
[
  {"number": 1, "title": "Chapter Title", "description": "Detailed 2-3 sentence summary"}
]
`;

  try {
    const response = await module.ai.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content || "[]";
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    const jsonString = jsonMatch ? jsonMatch[0] : content;

    const parsed = JSON.parse(jsonString);
    return Array.isArray(parsed) ? parsed : parsed.chapters || [];
  } catch (error) {
    console.error("Chapter outline generation failed:", error);
    throw new Error("Failed to generate chapter outline");
  }
}

export async function bookBuilderGenerateChapterContentAction(
  chapter: IBookBuilderChapter,
  authorName: string,
  skills: string[],
  additionalPrompt: string = "",
): Promise<string> {
  const prompt = `
You are ${authorName}, a skilled author with expertise in: ${skills.join(", ") || "creative writing"}.

Write the **full content** for this chapter in clean, engaging Markdown format.

Book Title: ${chapter.title} (wait, no — use the real book title if passed, but for now:)
Chapter ${chapter.number}: ${chapter.title}

Chapter Goal: ${chapter.description}

${additionalPrompt ? `Additional instructions: ${additionalPrompt}` : ""}

Requirements:
- Use proper Markdown (headings, paragraphs, lists, bold, italic, etc.)
- Make it engaging and consistent with the author's style
- Aim for 800–1500 words
- Do not include chapter number in the content itself

Return ONLY the Markdown content. No explanations, no JSON, no extra text.
`;

  try {
    const response = await module.ai.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      max_tokens: 4000,
    });

    return response.choices[0]?.message?.content?.trim() || "";
  } catch (error) {
    console.error("Chapter content generation failed:", error);
    throw new Error("Failed to generate chapter content");
  }
}

export async function bookBuilderGenerateChapterContentWithContextAction({
  book,
  chapter,
  author,
  skills,
}: {
  book: IBookBuilderGeneration;
  chapter: IBookBuilderChapter;
  author: IBookBuilderAuthor;
  skills: string[];
}): Promise<string> {
  const currentChapter = book.chapters.find((ch) => ch.id === chapter.id);

  if (!currentChapter) {
    throw new Error("Chapter not found");
  }

  // Create a summary of the book structure for the AI
  const outlineContext = book.chapters
    .map((ch) => `Chapter ${ch.number}: ${ch.title} - ${ch.description}`)
    .join("\n");

  const prompt = `
You are ${author.name}, an expert with skills in: ${skills.join(", ")}.
${author.description}

You are writing a book titled "${book.title}".

### FULL BOOK OUTLINE:
${outlineContext}

### YOUR CURRENT TASK:
Write the full content for **Chapter ${currentChapter.number}: ${currentChapter.title}**.

### CONTEXT:
- **Chapter Goal:** ${currentChapter.description}
- **Placement:** This is chapter ${currentChapter.number} of ${book.chapters.length}. 
- **Flow:** Ensure this chapter transitions naturally from the previous chapters and sets up the following chapters without repeating their specific content.

${currentChapter.additionalPrompt ? `### ADDITIONAL INSTRUCTIONS:\n${currentChapter.additionalPrompt}` : ""}

### REQUIREMENTS:
- Use clean, engaging Markdown (headers, lists, bolding).
- Maintain a consistent professional yet accessible tone.
- Aim for 800–1500 words.
- **Return ONLY THE CONTENT.** No conversational filler or meta-commentary
`;
  // - **Return ONLY the Markdown content.** No conversational filler or meta-commentary.

  try {
    const response = await module.ai.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are a professional book architect. You write cohesive, well-structured chapters based on a provided outline.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.75,
    });

    return response.choices[0]?.message?.content?.trim() || "";
  } catch (error) {
    console.error(
      `Failed to generate content for chapter ${currentChapter.number}:`,
      error,
    );
    throw new Error("Failed to generate chapter content with context.");
  }
}
