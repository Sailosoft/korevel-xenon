import Dexie from 'dexie';
import { BUIAuthor } from '../modules/authors/bui.author.entity';

export class BUIDatabase extends Dexie {
  authors!: Dexie.Table<BUIAuthor, number>;

  constructor(databaseName: string) {
    super(databaseName);
    this.version(1).stores({
      authors: '++id, name',
    });
  }
}

export const buiDatabase = new BUIDatabase('BunnyAIDatabase');