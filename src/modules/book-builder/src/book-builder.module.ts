import OpenAI from "openai";
import BookBuilderAI from "./book-builder.ai";

export default class BookBuilderModule {
  ai: OpenAI;
  bookBuilderAI: BookBuilderAI;
  constructor() {
    this.ai = new OpenAI({
      apiKey: "[ENCRYPTION_KEY]",
      baseURL: "http://localhost:11434/v1",
    });
    this.bookBuilderAI = new BookBuilderAI("gemma3:4b");
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
