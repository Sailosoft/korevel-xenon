import { BUIBookEntity, BUIBookChapterEntity } from "../books/bui.book.entity";

export interface BUIOutlineEntity extends BUIBookEntity {
  kind: "outline";
  generationType: string;
  generationMode: string;
  additionalPrompt?: string;
  summary?: string;
  topicId?: number;
}

/** Item = chapter row; no extra fields required. */
export type BUIOutlineItemEntity = BUIBookChapterEntity;

export interface BUIOutlineParams {
  outline: BUIOutlineEntity;
  topic?: { title: string; description?: string };
  items?: { number: number; title: string; description?: string }[];
  currentItem?: BUIBookChapterEntity;
  /**
   * Control mode only: the items chosen as references for this row.
   * Rendered as a dedicated context message (with any existing draft content).
   */
  siblingContext?: {
    number: number;
    title: string;
    description?: string;
    content?: string;
  }[];
  /**
   * Ordered prior item turns used to reconstruct a multi-turn
   * conversation. Each entry carries the original request fields (so the user
   * turn can be rebuilt) plus the assistant response (`content`).
   */
  priorResponses?: {
    number: number;
    title: string;
    description?: string;
    additionalPrompt?: string;
    content: string;
  }[];
  author?: { name: string; description: string };
  skills?: { name: string; description?: string }[];
}
