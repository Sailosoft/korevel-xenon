/**
 * Bunny Legacy - AI Interface Types
 *
 * Interfaces for AI service communication layer.
 * Renamed from BG prefix to BL prefix for consistency.
 * Moved from ai/ to core/ for better architecture.
 */

export interface IBLAiChapter {
  id?: string;
  number: number;
  title: string;
  description: string;
  content?: string;
  additionalPrompt?: string;
  generationId?: number;
}

export interface IBLAiOutline {
  title: string;
  description?: string;
  chapters: IBLAiChapter[];
}

export interface IBLAiAuthor {
  id?: number;
  name: string;
  description?: string;
}

export interface IBLAiAuthorSkill {
  id?: string;
  name: string;
  description?: string;
  type?: string;
  authorId?: number;
}

export interface IBLAiGeneration {
  id?: number;
  title: string;
  description: string;
  authorId: number;
  chapters?: IBLAiChapter[];
}
