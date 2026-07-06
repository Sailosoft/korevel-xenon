import { OpenAI } from "openai";
import type { IBGAIChapter, IBGAIOutline } from "./BGAI.interface";
import { BGAI_OUTLINE_PROMPT, CHAPTER_WRITE_PROMPT } from "./BGAIManagementPrompt";

export default class BGAIManagement {
  private readonly ai: OpenAI;
  model: string;

  constructor(model: string) {
    this.ai = new OpenAI({
      // Keep your real key retrieval here; placeholder encrypted key used in development
      apiKey: "[ENCRYPTION_KEY]",
      baseURL: "http://localhost:11434/v1",
    });
    this.model = model;
  }

  async createOutline({
    selectedAuthor,
    selectedSkills,
  }: {
    selectedAuthor: string;
    selectedSkills: string;
  }): Promise<string> {
    const response: any = await this.ai.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: "system",
          content: BGAI_OUTLINE_PROMPT.system(selectedAuthor, selectedSkills),
        },
        {
          role: "user",
          content: BGAI_OUTLINE_PROMPT.user(selectedAuthor, selectedSkills),
        },
      ],
      temperature: 0.7,
      max_tokens: 2048,
    });

    // The prompt enforces a JSON-only response. Return the raw content so caller can parse.
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
    allChapters: IBGAIChapter[];
    selectedAuthor: string;
    selectedSkills: string;
    outline: IBGAIOutline;
  }): Promise<any> => {
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
