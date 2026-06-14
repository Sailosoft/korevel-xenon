To make the versioning completely automatic and incremental, we can eliminate the explicit `versionNumber` argument from the `schema` method.

Internally, we will change `versionBranches` from a `Map` to an `Array`. The system will automatically compute the Dexie version number based on the **array index** (plus one, since Dexie versions start at 1).

Here is the refactored, auto-incrementing architecture.

---

## 1. Refactored Interfaces & Types

The `IPhazeModelBuilder` interface now accepts just the configuration callback, hiding the version numbers away entirely.

```typescript
import Dexie, { Transaction } from "dexie";

export namespace PhazeDBContracts {
  export type PhazeUpgradeHook = (trans: Transaction) => Promise<any> | void;

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

```

---

## 2. Refactored Core Engine & Auto-Versioning Pipeline

In `PhazeSchemaOrchestrator`, we store callbacks in an array. When `.compile()` runs, it loops through the array, using `index + 1` to target the precise incremental Dexie version.

```typescript
export namespace PhazeDBBuilders {
  import Contracts = PhazeDBContracts;

  export class PhazeTableBuilder implements Contracts.IPhazeTableBuilder {
    public primaryKey = "++id"; 
    public indexes: string[] = [];

    public id(propertyName: string = "id"): this {
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

export namespace PhazeCore {
  import Contracts = PhazeDBContracts;
  import Builders = PhazeDBBuilders;

  export class PhazeSchemaOrchestrator implements Contracts.IPhazeModelBuilder {
    // Array guarantees execution order based strictly on call sequence
    private schemas: ((builder: Contracts.IPhazeSchemaBuilder) => void)[] = [];

    constructor(private db: Dexie) {}

    public schema(configure: (builder: Contracts.IPhazeSchemaBuilder) => void): void {
      this.schemas.push(configure);
    }

    public compile(): void {
      let activeTablesSnapshot: Record<string, Builders.PhazeTableBuilder> = {};

      // Array index naturally computes sequential progression
      for (let i = 0; i < this.schemas.length; i++) {
        const versionNum = i + 1; // Dexie versions start at 1
        const configureFn = this.schemas[i];
        
        const builder = new Builders.PhazeSchemaBuilder(activeTablesSnapshot);
        configureFn(builder);

        const dexieStoresConfiguration: Record<string, string | null> = builder.compileStores();

        // Handle dropped tables relative to previous state snapshot
        for (const oldTable of Object.keys(activeTablesSnapshot)) {
          if (!(oldTable in builder.currentTables)) {
            dexieStoresConfiguration[oldTable] = null; 
          }
        }

        // Register directly with Dexie using the calculated version number
        const dexieVersionInstance = this.db.version(versionNum).stores(dexieStoresConfiguration);

        if (builder.upgradeHook) {
          dexieVersionInstance.upgrade(builder.upgradeHook);
        }

        // Advance baseline snapshot forward for the next iteration
        activeTablesSnapshot = builder.currentTables;
      }
    }
  }

  export abstract class PhazeDB {
    protected db: Dexie;

    constructor() {
      this.db = new Dexie(this.dbName());
      
      const orchestrator = new PhazeSchemaOrchestrator(this.db);
      this.onModelCreating(orchestrator);
      orchestrator.compile();
    }

    protected abstract dbName(): string;

    public set<TEntity, TKey>(table: string) {
      return () => this.db.table<TEntity, TKey>(table);
    }

    protected abstract onModelCreating(model: Contracts.IPhazeModelBuilder): void;
  }
}

```

---

## 3. Simplified Use Case

Now your setup completely avoids manual number management. Writing a new version block underneath an old one naturally forms the next version tier.

```typescript
import { PhazeCore, PhazeDBContracts } from "./PhazeDB";

class AppDatabase extends PhazeCore.PhazeDB {
  protected dbName(): string { return "AutoVersionDB"; }

  protected onModelCreating(model: PhazeDBContracts.IPhazeModelBuilder): void {
    
    // Auto-calculates to Dexie Version 1
    model.schema((builder) => {
      builder.create("author", (table) => {
        table.id("++id");
        table.index("name");
      });
    });

    // Auto-calculates to Dexie Version 2
    model.schema((builder) => {
      builder.update("author", (table) => {
        table.removeIndex("name");
        table.addIndex("category");
      }, async (tx) => {
        // Native upgrade hook run dynamically during v2 execution context
        await tx.table("author").toCollection().modify(a => a.category = "General");
      });
    });

    // Auto-calculates to Dexie Version 3
    model.schema((builder) => {
      builder.create("books", (table) => {
        table.id("++id");
        table.index("title");
      });
    });
  }
}

```