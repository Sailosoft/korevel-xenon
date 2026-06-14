import Dexie, { Transaction } from "dexie";

export namespace PhazeDBContracts {
  export type PhazeUpgradeHook = (trans: Transaction) => Promise<unknown> | void;

  export interface IPhazeTableBuilder {
    id(propertyName?: string): this;
    index(propertyName: string): this;
    removeIndex(propertyName: string): this;
    addIndex(propertyName: string): this;
  }

  export interface IPhazeSchemaBuilder {
    create(tableName: string, configure: (table: IPhazeTableBuilder) => void): this;
    update(tableName: string, configure: (table: IPhazeTableBuilder) => void, upgrade?: PhazeUpgradeHook): this;
    removeTable(tableName: string): this;
  }

  export interface IPhazeModelBuilder {
    // The explicit version number has been removed
    schema(configure: (builder: IPhazeSchemaBuilder) => void): void;
  }
}
