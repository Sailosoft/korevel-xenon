import { BUIBookEntity, BUIBookChapterEntity } from "../books/bui.book.entity";

export interface BUIOutlineEntity extends BUIBookEntity {
  kind: "outline";
  generationType: string;
  generationMode: string;
  additionalPrompt?: string;
  summary?: string;
  topicId?: number;
  /** Persisted Refine-wizard plan (findings + approval state + passes). */
  refinementPlan?: BUIOutlineRefinementPlan;
  /** Timestamp of the last `refinementPlan` write. */
  refinementPlanUpdatedAt?: number;
}

/** Item = chapter row; no extra fields required. */
export type BUIOutlineItemEntity = BUIBookChapterEntity;

/** A single actionable finding produced by the `critique` mode. */
export type BUIOutlineRefinementFinding =
  | {
      id: string;
      type: "insert";
      title: string;
      description?: string;
      rationale?: string;
    }
  | {
      id: string;
      type: "merge";
      anchorId: number;
      sourceIds: number[];
      rationale?: string;
    }
  | {
      id: string;
      type: "reorder";
      order: number[];
      rationale?: string;
    }
  | {
      id: string;
      type: "refine";
      itemId: number;
      directive: string;
      rationale?: string;
    };

/** Structured refinement plan stored on the outline and reviewed in the wizard. */
export interface BUIOutlineRefinementPlan {
  /** Item ids that were in scope when critique ran. */
  scope: number[];
  findings: BUIOutlineRefinementFinding[];
  /** Finding ids the user approved for apply. */
  approvedIds: string[];
  /** Requested iterative-refine loop pass count. */
  refinePasses?: number;
  generatedAt: number;
  appliedAt?: number;
}

export interface BUIOutlineParams {
  outline: BUIOutlineEntity;
  topic?: { title: string; description?: string };
  items?: {
    id?: number;
    number: number;
    title: string;
    description?: string;
    /** Included (capped) for the whole-map plan modes: critique / consolidate. */
    content?: string;
  }[];
  currentItem?: BUIBookChapterEntity;
  /** iterative_refine only: an extra directive from an approved `refine` finding. */
  refineDirective?: string;
  /** consolidate only: the merge group the current call should resolve. */
  mergeGroup?: { anchorId: number; sourceIds: number[] };
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
