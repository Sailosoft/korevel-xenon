import Dexie from "dexie";
import { ElvenAuthor } from "./interfaces/elven.interface";

export default class ElvenDB extends Dexie {
  authors!: Dexie.Table<ElvenAuthor, number>;
  constructor() {
    super("ElvenDB");
    this.version(1).stores({
      authors: "++id, name",
    });
  }
}
