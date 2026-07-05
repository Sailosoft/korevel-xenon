import OpenAI from "openai";
import {
  IBookBuilderChapter,
  IBookBuilderGeneration,
} from "./book-builder.interface";
import { BOOK_OUTLINE_PROMPT, CHAPTER_WRITE_PROMPT } from "./book-builder.ai.prompt";

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
          content: BOOK_OUTLINE_PROMPT.system(selectedAuthor, selectedSkills),
        },
        {
          role: "user",
          content: BOOK_OUTLINE_PROMPT.user(selectedAuthor, selectedSkills),
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
    return await this.ai.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: "system",
          content: CHAPTER_WRITE_PROMPT.system(
            selectedAuthor,
            selectedSkills,
            outline,
            allChapters,
            chapterNumber
          ),
        },
        {
          role: "user",
          content: CHAPTER_WRITE_PROMPT.user(chapterNumber),
        },
      ],
      temperature: 0.75,
      max_tokens: 8192,
    });
  };
}