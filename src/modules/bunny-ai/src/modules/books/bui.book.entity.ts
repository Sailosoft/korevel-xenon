import { BUIAuthor } from "../authors/bui.author.entity";
import { BUIAuthorSkill } from "../author-skills/bui.author-skills.entity";

export interface BUIBookEntity {
  id?: number;
  title: string;
  description?: string;
  category?: string;
  chapters?: BUIBookChapterEntity[];
  authorId?: number;
  author?: BUIAuthor;
}

export interface BUIBookChapterEntity {
  id?: number;
  bookId?: number;
  number: number;
  title: string;
  description?: string;
  /** Markdown Content */
  content?: string;
  additionalPrompt?: string;
  /** Optional Different Author */
  authorId?: number;
  wordCount?: number;
  status?: "done" | "empty" | "being_generated" | "pending"; // Added status
}

export interface BUIBookChapterParams {
  author: BUIAuthor;
  book: BUIBookEntity;
  currentChapter: BUIBookChapterEntity;
  skills?: BUIAuthorSkill[];
}
