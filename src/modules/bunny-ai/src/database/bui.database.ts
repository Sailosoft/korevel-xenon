import Dexie from "dexie";
import { BUIAuthor } from "../modules/authors/bui.author.entity";
import {
  BUIBookChapterEntity,
  BUIBookEntity,
} from "../modules/books/bui.book.entity";

export class BUIDatabase extends Dexie {
  authors!: Dexie.Table<BUIAuthor, number>;
  books!: Dexie.Table<BUIBookEntity, number>;
  chapters!: Dexie.Table<BUIBookChapterEntity, number>;

  constructor(databaseName: string) {
    super(databaseName);
    this.version(1).stores({
      authors: "++id, name",
    });

    this.version(2).stores({
      books: `++id, title, authorId, category`,
      chapters: `++id, bookId, title`,
    });
  }
}

export const buiDatabase = new BUIDatabase("BunnyAIDatabase");
