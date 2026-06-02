import { BUIAuthor } from "../authors/bui.author.entity";

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
}
