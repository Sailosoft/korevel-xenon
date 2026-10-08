import Dexie from "dexie";
import { BUIAuthor } from "../modules/authors/bui.author.entity";
import {
  BUIBookChapterEntity,
  BUIBookEntity,
} from "../modules/books/bui.book.entity";
import { BUISetting } from "../modules/settings/bui.settings.entity";
import { BUIAuthorSkill } from "../modules/author-skills/bui.author-skills.entity";
import { BUIAuthorSkillRelation } from "../modules/author-skills/bui.author-skills.relation.entity";
import { BUITopicEntity } from "../modules/topics/bui.topic.entity";

export class BUIDatabase extends Dexie {
  authors!: Dexie.Table<BUIAuthor, number>;
  books!: Dexie.Table<BUIBookEntity, number>;
  chapters!: Dexie.Table<BUIBookChapterEntity, number>;
  settings!: Dexie.Table<BUISetting, string>;
  authorSkills!: Dexie.Table<BUIAuthorSkill, number>;
  authorSkillRelations!: Dexie.Table<BUIAuthorSkillRelation, number>;
  topics!: Dexie.Table<BUITopicEntity, number>;

  constructor(databaseName: string) {
    super(databaseName);
    this.version(1).stores({
      authors: "++id, name",
    });

    this.version(2).stores({
      books: `++id, title, authorId, category`,
      chapters: `++id, bookId, title`,
    });

    this.version(3).stores({
      settings: "key",
    });

    this.version(4).stores({
      settings: null,
    });

    this.version(5).stores({
      settings: "id",
    });

    this.version(6).stores({
      authorSkills: "++id, name",
    });

    this.version(7).stores({
      authorSkillRelations: "++id, authorId, skillId",
    });

    this.version(8).stores({
      topics: "++id, title",
    });

    // Delete Book/Outline cascade — when a book or outline row is deleted, also
    // remove all of its chapters/items (chapters where bookId === deleted id).
    // Registered on the shared `books` table so both real books and outlines
    // (kind: "outline") are covered from a single hook, and so every delete path
    // (repository, panelDelete, or direct db access) cascades.
    this.books.hook("deleting", (pk) => {
      return this.chapters.where("bookId").equals(pk).delete();
    });
  }
}

export const buiDatabase = new BUIDatabase("BunnyAIDatabase");
