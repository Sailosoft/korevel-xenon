export interface IBGAIChapter {
  id?: string;
  number: number;
  title: string;
  description: string;
  // optional content field that can store the generated chapter text
  content?: string;
  // optional additional prompt instructions for chapter generation
  additionalPrompt?: string;
}

export interface IBGAIOutline {
  title: string;
  description?: string;
  chapters: IBGAIChapter[];
}

export interface IBGAIAuthor {
  name: string;
  description?: string;
}
