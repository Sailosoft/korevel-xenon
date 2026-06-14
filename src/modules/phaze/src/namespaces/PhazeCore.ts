import Dexie from "dexie";
import { PhazeDBBuilders } from "./PhazeDBBuilders";
import { PhazeDBContracts } from "./PhazeDBContracts";

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
}