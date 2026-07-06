"use server";

import { HELIX_AI_PROVIDERS, HelixAISchemaService, HelixAIService } from "@/src/modules/helix";
import type { HelixAIServiceType } from "@/src/modules/helix";
import type {
  IBGAIChapter,
  IBGAIOutline,
  IBGAIAuthor,
} from "./BGAI.interface";


const defaultProvider = HELIX_AI_PROVIDERS.find(
  (p) => p.provider === "default",
)!;
const model = defaultProvider.model;

const aiService: HelixAIServiceType = new HelixAIService({
  config: {
    ai: {
      providers: HELIX_AI_PROVIDERS,
      activeProvider: defaultProvider.provider
    }
  },
  aiSchema: new HelixAISchemaService()
});

export async function bgaiGenerateChaptersAction(
  title: string,
  description: string,
  authorName: string,
  skills: string[],
): Promise<IBGAIChapter[]> {
  const system = "You are an expert book architect. Always respond with valid JSON.";
  const user = `Generate chapters for the book:

Title: "${title}"
Description: ${description}
Author: ${authorName}
Expertise: ${skills.join(", ") || "general writing"}

Return ONLY a valid JSON array (no extra text) with this structure:
[
  {"number": 1, "title": "Chapter Title", "description": "Detailed 2-3 sentence summary"}
]`;

  try {
    const content = await aiService.doChat({
      system,
      user,
      model,
      temperature: 0.7,
    });

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    const jsonString = jsonMatch ? jsonMatch[0] : content;

    const parsed = JSON.parse(jsonString);
    return Array.isArray(parsed) ? parsed : parsed.chapters || [];
  } catch (error) {
    console.error("Chapter outline generation failed:", error);
    throw new Error("Failed to generate chapter outline");
  }
}

export async function bgaiGenerateChapterContentAction(
  chapter: IBGAIChapter,
  authorName: string,
  skills: string[],
  additionalPrompt: string = "",
): Promise<string> {
  const system = `You are ${authorName}, a skilled author with expertise in: ${skills.join(", ") || "creative writing"}.`;
  const user = `Write the **full content** for this chapter in clean, engaging Markdown format.

Chapter ${chapter.number}: ${chapter.title}

Chapter Goal: ${chapter.description}

${additionalPrompt ? `Additional instructions: ${additionalPrompt}` : ""}

Requirements:
- Use proper Markdown (headings, paragraphs, lists, bold, italic, etc.)
- Make it engaging and consistent with the author's style
- Aim for 800–1500 words
- Do not include chapter number in the content itself

Return ONLY the Markdown content. No explanations, no JSON, no extra text.`;

  try {
    const content = await aiService.doChat({
      system,
      user,
      model,
      temperature: 0.8,
      maxToken: 4000,
    });

    return content.trim();
  } catch (error) {
    console.error("Chapter content generation failed:", error);
    throw new Error("Failed to generate chapter content");
  }
}

export async function bgaiGenerateChapterContentWithContextAction({
  book,
  chapter,
  author,
  skills,
}: {
  book: IBGAIOutline;
  chapter: IBGAIChapter;
  author: IBGAIAuthor;
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

  const system = "You are a professional book architect. You write cohesive, well-structured chapters based on a provided outline.";
  const user = `You are ${author.name}, an expert with skills in: ${skills.join(", ")}.
${author.description || ""}

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
- **Return ONLY THE CONTENT.** No conversational filler or meta-commentary`;

  try {
    const content = await aiService.doChat({
      system,
      user,
      model,
      temperature: 0.75,
    });

    return content.trim();
  } catch (error) {
    console.error(
      `Failed to generate content for chapter ${currentChapter.number}:`,
      error,
    );
    throw new Error("Failed to generate chapter content with context.");
  }
}
