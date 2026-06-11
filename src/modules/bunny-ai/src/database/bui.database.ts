import Dexie from "dexie";
import { BUIAuthor } from "../modules/authors/bui.author.entity";
import {
  BUIBookChapterEntity,
  BUIBookEntity,
} from "../modules/books/bui.book.entity";
import { BUISetting } from "../modules/settings/bui.settings.entity";
import { BUIAuthorSkill } from "../modules/author-skills/bui.author-skills.entity";
import { BUIAuthorSkillRelation } from "../modules/author-skills/bui.author-skills.relation.entity";

export class BUIDatabase extends Dexie {
  authors!: Dexie.Table<BUIAuthor, number>;
  books!: Dexie.Table<BUIBookEntity, number>;
  chapters!: Dexie.Table<BUIBookChapterEntity, number>;
  settings!: Dexie.Table<BUISetting, string>;
  authorSkills!: Dexie.Table<BUIAuthorSkill, number>;
  authorSkillRelations!: Dexie.Table<BUIAuthorSkillRelation, number>;

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
  }
}

export const buiDatabase = new BUIDatabase("BunnyAIDatabase");
