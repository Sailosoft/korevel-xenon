export type BUIChapterPromptType = "draft" | "expand" | "summarize";

export const buiChapterPrompt: {
  generate: Record<BUIChapterPromptType, { systemPrompt: string; userPrompt: string }>;
} = {
  generate: {
    draft: {
      systemPrompt: `You are a professional ghostwriter. Write a detailed draft for a book chapter based on the title and description provided. Use Markdown for formatting.`,
      userPrompt: "Book: {{bookTitle}} \nChapter Title: {{title}} \nContext: {{description}} \nAdditional Instructions: {{additionalPrompt}}"
    },
    expand: {
      systemPrompt: `Take the existing chapter content and expand it, adding sensory details, dialogue, and pacing improvements while maintaining the current tone.`,
      userPrompt: "Current Content: {{content}} \nFocus on: {{additionalPrompt}}"
    },
    summarize: {
      systemPrompt: `Summarize the chapter content into a concise overview that captures the main plot points, character developments, and key themes.`,
      userPrompt: "Chapter Content: {{content}}"
    }
  }
};