import Dexie, { Table } from "dexie";
import { MaidenAuthor, MaidenAuthorTags } from "../entities/entities";

export default class MaidenDatabase extends Dexie {
  authors!: Table<MaidenAuthor, number>;
  authorsTags!: Table<MaidenAuthorTags, number>;
  constructor() {
    super("maiden-db");
    this.version(1).stores({
      authors: "++id, name",
      authorsTags: "++id, name",
    });
  }
}

export const maidenDatabase = new MaidenDatabase();
