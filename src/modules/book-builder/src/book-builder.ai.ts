import OpenAI from "openai";
import {
  IBookBuilderChapter,
  IBookBuilderGeneration,
} from "./book-builder.interface";
export default class BookBuilderAI {
  private readonly ai;
  model: string;
  constructor(model: string) {
    this.ai = new OpenAI({
      apiKey: "[ENCRYPTION_KEY]",
      baseURL: "http://localhost:11434/v1",
    });
    this.model = model;
  }
  async createBook({
    selectedAuthor,
    selectedSkills,
  }: {
    selectedAuthor: string;
    selectedSkills: string;
  }) {
    const response = await this.ai.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: "system",
          content: `You are an elite book architect and planner.
The user has already chosen:
- Author persona: "${selectedAuthor}" (this is the exact voice, expertise, and tone the entire book must be written in)
- Desired skills / topic: "${selectedSkills}" (the book must be a practical, step-by-step guide that teaches these skills in depth)

Your ONLY job right now is to create a complete, professional book outline.
- The book must feel like a high-quality, human-written guide (very long chapters, rich descriptions, real-world examples, checklists, warnings, pro tips, etc.).
- Title must be catchy, benefit-driven, and professional.
- Chapters must flow logically from beginner to advanced.
- Every chapter must be connected and build upon the previous ones.
- Aim for 8–15 chapters total.

You must respond with NOTHING except valid JSON in this exact format:

{
  "title": "The Perfect Book Title Here",
  "chapters": [
    {
      "number": 1,
      "title": "Chapter One Title",
      "description": "One-sentence summary of what this chapter delivers and why it matters"
    },
    {
      "number": 2,
      "title": "Chapter Two Title",
      "description": "One-sentence summary..."
    }
    // ... continue for all chapters
  ]
}

Do not add any explanation, greeting, or extra text outside the JSON.`,
        },
        {
          role: "user",
          content: `Create the book outline now using the author "${selectedAuthor}" and the desired skills "${selectedSkills}".`,
        },
      ],
      temperature: 0.7,
      max_tokens: 2048,
    });
    return response.choices[0].message.content;
  }

  writeChapterPrompt = async ({
    chapterNumber,
    allChapters,
    selectedAuthor,
    selectedSkills,
    outline,
  }: {
    chapterNumber: number;
    allChapters: IBookBuilderChapter[];
    selectedAuthor: string;
    selectedSkills: string;
    outline: IBookBuilderGeneration;
  }) => {
    const currentChapter = allChapters.find((c) => c.number === chapterNumber);

    return await this.ai.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: "system",
          content: `You are now writing the actual book as ${selectedAuthor}.
You are an extremely skilled, human-like author who writes very long, deeply descriptive, step-by-step guide books.
Your writing style is warm, authoritative, practical, and engaging — exactly like a world-class expert sharing decades of hard-earned wisdom.

Book Title: "${outline.title}"
Overall Topic / Skills to teach: "${selectedSkills}"

Full chapter list for context:
${allChapters.map((c) => `${c.number}. ${c.title} — ${c.description}`).join("\n")}

Rules for every chapter:
- Write 3,000–6,000+ words (very long and detailed)
- Extremely descriptive and step-by-step
- Include real-world examples, checklists, common mistakes, pro tips, warnings, exercises, and personal-style anecdotes that fit the author persona
- Make it feel 100% human-written
- Use rich, flowing language with smooth transitions
- End with a strong summary and teaser for the next chapter

You are now writing Chapter ${chapterNumber}: ${currentChapter?.title}
Write the COMPLETE chapter content only. Do not output JSON, do not say "Chapter X", do not add any meta text. Start directly with the first sentence of the chapter.`,
        },
        {
          role: "user",
          content: `Begin writing Chapter ${chapterNumber} now.`,
        },
      ],
      temperature: 0.75,
      max_tokens: 8192, // Gemma3:4b usually handles this well
    });
  };
}
