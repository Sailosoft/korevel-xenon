export interface BUIAuthor {
  id?: number;
  name: string;
  description?: string;
  // tags?: string[];
}

export type BUIAuthorPromptType = "professional" | "creative" | "short";
