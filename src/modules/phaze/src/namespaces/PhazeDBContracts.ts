import Dexie, { Transaction } from "dexie";

export namespace PhazeDBContracts {
  export type PhazeUpgradeHook = (
    trans: Transaction,
  ) => Promise<unknown> | void;

  export interface IPhazeTableBuilder {
    /** Set a custom primary key expression (e.g. "++id" for auto-increment). */
    id(propertyName?: string): this;
    /**
     * Configure the table to use a plain string primary key stored in the
     * entity's `id` field.  Dexie will NOT auto-generate the key — the caller
     * is responsible for supplying a UUID v7 value before inserting.
     */
    uuid(propertyName?: string): this;
    index(propertyName: string): this;
    removeIndex(propertyName: string): this;
    addIndex(propertyName: string): this;
  }

  export interface IPhazeSchemaBuilder {
    create(
      tableName: string,
      configure: (table: IPhazeTableBuilder) => void,
    ): this;
    update(
      tableName: string,
      configure: (table: IPhazeTableBuilder) => void,
      upgrade?: PhazeUpgradeHook,
    ): this;
    removeTable(tableName: string): this;
  }

  export interface IPhazeModelBuilder {
    // The explicit version number has been removed
    schema(configure: (builder: IPhazeSchemaBuilder) => void): void;
  }
}
