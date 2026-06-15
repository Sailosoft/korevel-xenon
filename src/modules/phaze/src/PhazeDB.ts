import Dexie, { Table, Version } from "dexie";
import { PhazeDBContracts } from "./namespaces/PhazeDBContracts";
import { PhazeCore } from "./namespaces/PhazeCore";

export type IPhazeModelBuilder = PhazeDBContracts.IPhazeModelBuilder;

export default abstract class PhazeDB {
  protected db: Dexie;
  constructor() {
    this.db = new Dexie(this.dbName());

    const orchestrator = new PhazeCore.PhazeSchemaOrchestrator(this.db);

    this.onModelCreating(orchestrator);
  }

  protected abstract dbName(): string;

  public set<TEntity, TKey>(table: string): () => Table<TEntity, TKey> {
    return () => this.db.table<TEntity, TKey>(table);
  }

  public table<TEntity, TKey>(table: string) {
    return this.set<TEntity, TKey>(table)();
  }

  protected abstract onModelCreating(model: IPhazeModelBuilder): void;
}
