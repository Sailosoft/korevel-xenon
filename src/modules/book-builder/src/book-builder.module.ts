import OpenAI from "openai";
import BookBuilderAI from "./book-builder.ai";
import { BOOK_BUILDER_CONFIG } from "../config/book-builder.config";

export default class BookBuilderModule {
  ai: OpenAI;
  bookBuilderAI: BookBuilderAI;
  constructor() {
    this.ai = new OpenAI({
      apiKey: BOOK_BUILDER_CONFIG.OPEN_AI_API_KEY,
      baseURL: BOOK_BUILDER_CONFIG.OPEN_AI_BASE_URL,
      // baseURL: "http://localhost:11434/v1",
    });
    this.bookBuilderAI = new BookBuilderAI(BOOK_BUILDER_CONFIG.OPEN_AI_MODEL);
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
