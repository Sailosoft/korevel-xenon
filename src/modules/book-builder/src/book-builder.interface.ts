export interface IBookBuilderGeneration {
  id?: number;
  title: string;
  description?: string;
  chapters: IBookBuilderChapter[];
  authorId?: number;
}
export interface IBookBuilderChapter {
  id?: number;
  generationId: number;
  number: number;
  title: string;
  description: string;
  content?: string; // Full markdown content
  additionalPrompt?: string; // Optional user prompt for regeneration
  wordCount?: number;
}

export interface IBookBuilderAuthor {
  id?: number;
  name: string;
  description: string;
}

export interface IBookBuilderAuthorSkill {
  id?: number;
  name: string;
  description: string;
  type: string;
}
