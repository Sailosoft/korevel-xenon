export interface BUIAuthor {
  id?: number;
  name: string;
  description?: string;
  // tags?: string[];
}

export interface BUIAuthorPrompt {
  key: string;
  name: string;
  systemPrompt: string;
  userPrompt: string;
}
