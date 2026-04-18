"use server";

import BookBuilderModule from "./book-builder.module";
import { IBookBuilderChapter } from "./book-builder.interface";

const module = new BookBuilderModule();

export async function bookBuilderGenerateChaptersAction(
  title: string,
  description: string,
  authorName: string,
  skills: string[],
): Promise<IBookBuilderChapter[]> {
  const prompt = `
You are an expert book architect. Generate exactly 5 chapters for the book:

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
      model: "gemma3:4b",
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
      model: "gemma3:4b",
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
