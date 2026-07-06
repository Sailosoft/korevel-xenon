/**
 * Bunny Legacy - Domain Entity Classes
 *
 * OOP Domain models with encapsulated behavior.
 * Implements SOLID principles: Single Responsibility, Open/Closed.
 */

export interface IBLAuthor {
  id?: number;
  name: string;
  description: string;
}

export interface IBLAuthorSkill {
  id?: number;
  name: string;
  description: string;
  type: string;
  authorId?: number;
}

export interface IBLChapter {
  id?: number;
  generationId: number;
  number: number;
  title: string;
  description: string;
  content?: string;
  additionalPrompt?: string;
  wordCount?: number;
}

export interface IBLGeneration {
  id?: number;
  title: string;
  description: string;
  authorId: number;
  chapters?: IBLChapter[];
}

export interface IBLBookOutline {
  title: string;
  description?: string;
  chapters: IBLChapter[];
}

/**
 * Value Object: Author Profile
 * Encapsulates author data with validation.
 */
export class BLAuthorProfile {
  constructor(
    public readonly name: string,
    public readonly description: string,
    public readonly id?: number,
  ) {
    if (!name || name.trim().length === 0) {
      throw new Error("Author name is required");
    }
  }

  get isValid(): boolean {
    return this.name.trim().length > 0;
  }

  toEntity(): IBLAuthor {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
    };
  }

  static fromEntity(entity: IBLAuthor): BLAuthorProfile {
    return new BLAuthorProfile(entity.name, entity.description, entity.id);
  }
}

/**
 * Value Object: Chapter Content Status
 */
export class BLChapterStatus {
  constructor(private readonly chapter: IBLChapter) {}

  get hasContent(): boolean {
    return !!this.chapter.content && this.chapter.content.trim().length > 0;
  }

  get contentLength(): number {
    return this.chapter.content?.length ?? 0;
  }

  get isEmpty(): boolean {
    return !this.hasContent;
  }

  get label(): string {
    return this.hasContent
      ? `✓ Content generated (${this.contentLength} characters)`
      : "No content yet";
  }
}

/**
 * Enum: Regeneration strategy
 */
export enum BLRegenerationMode {
  EMPTY = "empty",
  ALL = "all",
}
