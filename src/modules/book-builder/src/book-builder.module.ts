import OpenAI from "openai";
import BookBuilderAI from "./book-builder.ai";
import { HELIX_AI_PROVIDERS } from "@/src/modules/helix";

export default class BookBuilderModule {
  ai: OpenAI;
  bookBuilderAI: BookBuilderAI;
  constructor() {
    // Subscribe to Helix configuration for AI settings
    const defaultProvider = HELIX_AI_PROVIDERS.find(
      (p) => p.provider === "default",
    )!;
    this.ai = new OpenAI({
      apiKey: defaultProvider.apiKey,
      baseURL: defaultProvider.endpoint,
    });
    this.bookBuilderAI = new BookBuilderAI(defaultProvider.model);
  }

  async generateBook() {
    const response = await this.bookBuilderAI.createBook({
      selectedAuthor: "Stephen King",
      selectedSkills: "Horror Writing",
    });
    console.log(response);

    return response;
  }
}
