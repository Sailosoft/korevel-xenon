import Dexie from 'dexie';
import { BAIAuthor } from '../modules/authors/bai.author.entity';

export class BAIDatabase extends Dexie {
  authors!: Dexie.Table<BAIAuthor, number>;

  constructor(databaseName: string) {
    super(databaseName);
    this.version(1).stores({
      authors: '++id, name',
    });
  }
}

export const baiDatabase = new BAIDatabase('BunnyAIDatabase');