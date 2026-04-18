import { Dexie, Table } from "dexie";
import {
  IBookBuilderAuthor,
  IBookBuilderAuthorSkill,
  IBookBuilderChapter,
  IBookBuilderGeneration,
} from "./book-builder.interface";

export default class BookBuilderDB extends Dexie {
  generations!: Table<IBookBuilderGeneration>;
  chapters!: Table<IBookBuilderChapter>;
  authors!: Table<IBookBuilderAuthor>;
  authorSkills!: Table<IBookBuilderAuthorSkill>;

  constructor() {
    super("book-builder");
    this.version(1).stores({
      generations: "++id, title",
      chapters: "++id, generationId, number, title, description",
      authors: "++id, name, description",
      authorSkills: "++id, authorId, name, description, type",
    });

    this.version(2).stores({
      authors: "++id, name",
      authorSkills: "++id, authorId, name",
      generations: "++id, authorId, title",
      chapters: "++id, generationId, number",
    });
  }
}
