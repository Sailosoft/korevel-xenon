/**
 * Bunny Legacy - Repository Layer
 *
 * Data access abstraction using Dexie (IndexedDB).
 * Implements Repository pattern for SOLID Dependency Inversion.
 * No direct dependency on book-builder or shadcn/ui.
 */

import Dexie, { type Table } from "dexie";
import type {
  IBLAuthor,
  IBLAuthorSkill,
  IBLChapter,
  IBLGeneration,
} from "./BLEntity";

/**
 * IndexedDB database for Bunny Legacy.
 * Encapsulates all schema definitions and versioning.
 */
export class BLDatabase extends Dexie {
  authors!: Table<IBLAuthor, number>;
  authorSkills!: Table<IBLAuthorSkill, number>;
  generations!: Table<IBLGeneration, number>;
  chapters!: Table<IBLChapter, number>;

  constructor() {
    super("bunny-legacy");

    this.version(1).stores({
      authors: "++id, name",
      authorSkills: "++id, authorId, name",
      generations: "++id, authorId, title",
      chapters: "++id, generationId, number",
    });
  }
}

/**
 * Repository: Authors
 * Single responsibility: CRUD operations for authors and their skills.
 */
export class BLAuthorRepository {
  constructor(private readonly db: BLDatabase) {}

  async getAll(): Promise<IBLAuthor[]> {
    return this.db.authors.toArray();
  }

  async getById(id: number): Promise<IBLAuthor | undefined> {
    return this.db.authors.get(id);
  }

  async save(author: IBLAuthor): Promise<number> {
    if (author.id) {
      await this.db.authors.update(author.id, author);
      return author.id;
    }
    return this.db.authors.add(author) as Promise<number>;
  }

  async delete(id: number): Promise<void> {
    await this.db.authors.delete(id);
    await this.db.authorSkills.where("authorId").equals(id).delete();
  }

  async getSkills(authorId: number): Promise<IBLAuthorSkill[]> {
    return this.db.authorSkills.where("authorId").equals(authorId).toArray();
  }

  async saveSkills(skills: IBLAuthorSkill[]): Promise<void> {
    await this.db.authorSkills.bulkAdd(skills);
  }

  async replaceSkills(
    authorId: number,
    skills: IBLAuthorSkill[],
  ): Promise<void> {
    await this.db.authorSkills.where("authorId").equals(authorId).delete();
    if (skills.length > 0) {
      await this.db.authorSkills.bulkAdd(skills);
    }
  }
}

/**
 * Repository: Generations (Books)
 * Single responsibility: CRUD for book generations and their chapters.
 */
export class BLGenerationRepository {
  constructor(private readonly db: BLDatabase) {}

  async getAll(): Promise<IBLGeneration[]> {
    return this.db.generations.toArray();
  }

  async getById(id: number): Promise<IBLGeneration | undefined> {
    return this.db.generations.get(id);
  }

  async save(generation: IBLGeneration): Promise<number> {
    return this.db.generations.add(generation) as Promise<number>;
  }

  async update(id: number, data: Partial<IBLGeneration>): Promise<void> {
    await this.db.generations.update(id, data);
  }

  async delete(id: number): Promise<void> {
    await this.db.generations.delete(id);
    await this.db.chapters.where("generationId").equals(id).delete();
  }
}

/**
 * Repository: Chapters
 * Single responsibility: CRUD for chapters.
 */
export class BLChapterRepository {
  constructor(private readonly db: BLDatabase) {}

  async getByGenerationId(generationId: number): Promise<IBLChapter[]> {
    const chapters = await this.db.chapters
      .where("generationId")
      .equals(generationId)
      .toArray();
    return chapters.sort((a, b) => a.number - b.number);
  }

  async getById(id: number): Promise<IBLChapter | undefined> {
    return this.db.chapters.get(id);
  }

  async bulkAdd(chapters: IBLChapter[]): Promise<void> {
    await this.db.chapters.bulkAdd(chapters);
  }

  async update(id: number, data: Partial<IBLChapter>): Promise<void> {
    await this.db.chapters.update(id, data);
  }
}
