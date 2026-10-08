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
  /** Discriminator. Legacy and new books leave this undefined; outlines store "outline". */
  kind?: "book" | "outline";
  /** Optional single seed Topic referenced by an outline. */
  topicId?: number;
  /** One of the 11 generation type keys. */
  generationType?: string;
  /** One of the 7 generation mode keys (default for item content writing). */
  generationMode?: string;
  /** Outline-level AI instruction. */
  additionalPrompt?: string;
  /** User-editable markdown summary; topics may be inserted here. */
  summary?: string;
  /** Optional requested minimum number of items for structure generation. */
  minItems?: number;
  /** Optional requested maximum number of items for structure generation. */
  maxItems?: number;
  /** Optional requested minimum number of words per generated item. */
  minWords?: number;
  /** Optional requested maximum number of words per generated item. */
  maxWords?: number;
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
  /**
   * Control-mode references: ids of sibling items whose written content is read
   * and injected into this item's input context during generation.
   */
  referenceIds?: number[];
}

export interface BUIBookChapterParams {
  author: BUIAuthor;
  book: BUIBookEntity;
  currentChapter: BUIBookChapterEntity;
  skills?: BUIAuthorSkill[];
}
