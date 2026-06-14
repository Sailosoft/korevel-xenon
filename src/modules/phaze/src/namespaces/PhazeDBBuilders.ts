import { PhazeDBContracts } from "./PhazeDBContracts";

export namespace PhazeDBBuilders {
  import Contracts = PhazeDBContracts;

  export class PhazeTableBuilder implements Contracts.IPhazeTableBuilder {
    public primaryKey = "++id"; 
    public indexes: string[] = [];

    public id(propertyName: string = "++id"): this {
      this.primaryKey = propertyName;
      return this;
    }

    public index(propertyName: string): this {
      return this.addIndex(propertyName);
    }

    public addIndex(propertyName: string): this {
      if (!this.indexes.includes(propertyName)) {
        this.indexes.push(propertyName);
      }
      return this;
    }

    public removeIndex(propertyName: string): this {
      this.indexes = this.indexes.filter(idx => idx !== propertyName);
      return this;
    }
  }

  export class PhazeSchemaBuilder implements Contracts.IPhazeSchemaBuilder {
    public currentTables: Record<string, PhazeTableBuilder> = {};
    public upgradeHook: Contracts.PhazeUpgradeHook | null = null;

    constructor(previousTables: Record<string, PhazeTableBuilder>) {
      for (const [tableName, tableBuilder] of Object.entries(previousTables)) {
        const clone = new PhazeTableBuilder();
        clone.primaryKey = tableBuilder.primaryKey;
        clone.indexes = [...tableBuilder.indexes];
        this.currentTables[tableName] = clone;
      }
    }

    public create(tableName: string, configure: (table: Contracts.IPhazeTableBuilder) => void): this {
      const table = new PhazeTableBuilder();
      configure(table);
      this.currentTables[tableName] = table;
      return this;
    }

    public update(tableName: string, configure: (table: Contracts.IPhazeTableBuilder) => void, upgrade?: Contracts.PhazeUpgradeHook): this {
      if (!this.currentTables[tableName]) {
        throw new Error(`PhazeDB Error: Table "${tableName}" does not exist to update.`);
      }
      configure(this.currentTables[tableName]);
      if (upgrade) this.upgradeHook = upgrade;
      return this;
    }

    public removeTable(tableName: string): this {
      delete this.currentTables[tableName];
      return this;
    }

    public compileStores(): Record<string, string | null> {
      const stores: Record<string, string | null> = {};
      for (const [name, table] of Object.entries(this.currentTables)) {
        stores[name] = [table.primaryKey, ...table.indexes].join(", ");
      }
      return stores;
    }
  }
}