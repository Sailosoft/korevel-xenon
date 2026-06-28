import { BunnyFeature } from "@/src/modules/bunny/src/feature/BunnyFeature";
import { bkThinkerDB } from "../database/BKThinkerDatabase";
import type { BKMemory } from "./BKMemory.Types";

export const bkMemoryModule = BunnyFeature.create<BKMemory, BKMemory>(
  "Memory",
  "id",
  (feature) => {
    feature.setModuleUrl("/modules/bunny-thinker/memories");
    feature.useDefault();

    feature.configureTable((table) => {
      table.addColumns([
        { field: "name", header: "Name", sortable: true, isRowHeader: true },
        { field: "format", header: "Format", sortable: true },
        { field: "createdAt", header: "Created", sortable: true },
      ]);
    });

    feature.configureForm((form) => {
      form.addFields([
        {
          name: "name",
          label: "Name",
          type: "text",
          required: true,
        },
        {
          name: "format",
          label: "Format",
          type: "text",
        },
      ]);
    });

    feature.useDataLayer(bkThinkerDB.memoriesRepo.dataLayer);
  },
);
