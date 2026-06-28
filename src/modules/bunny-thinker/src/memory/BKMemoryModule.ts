import { BunnyFeature } from "@/src/modules/bunny/src/feature/BunnyFeature";
import { createElement } from "react";
import { Download } from "lucide-react";
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

    feature.configureRow((row) => {
      row.addAction({
        id: "extract-memory",
        icon: createElement(Download),
        variant: "secondary",
        label: "Extract Memory",
        onClick(row, context) {
          const memory = row as BKMemory;
          context.router.push(
            `/modules/bunny-thinker/memories/${memory.id}`,
          );
        },
      });
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
