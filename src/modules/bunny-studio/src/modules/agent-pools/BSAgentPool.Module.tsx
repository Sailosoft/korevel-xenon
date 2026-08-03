// BSAgentPool.Module — BunnyFeature module for Bunny AI Studio Agent Pools.
//
// Replaces the bespoke BSAgentPool.Component CRUD UI with the reusable Bunny
// feature framework (feature: "use BunnyFeature instead of creating your own
// component"). Provides table columns + form fields + the Phaze data layer.
//
// Agent pools group agents. Ungrouped agents (no agentPoolId) are global.

import { BunnyFeature } from "@/src/modules/bunny/src/feature/BunnyFeature";
import { bsDB } from "../../BSDatabase";
import type { BSAgentPool } from "./BSAgentPool.Types";

// ─── Module ─────────────────────────────────────────────────────────────

export const bsAgentPoolModule = BunnyFeature.create<BSAgentPool, BSAgentPool>(
  "Agent Pool",
  "id",
  (feature) => {
    feature.setModuleUrl("/modules/bunny-studio/agent-pools*");
    feature.useDefault();

    feature.configureTable((table) => {
      table.addColumns([
        {
          field: "name",
          header: "Name",
          sortable: true,
          isRowHeader: true,
        },
        {
          field: "description",
          header: "Description",
          sortable: false,
          render: (row) => row.description || "—",
        },
        {
          field: "createdDate",
          header: "Created",
          sortable: true,
          render: (row) => new Date(row.createdDate).toLocaleDateString(),
        },
      ]);
    });

    feature.configureForm((form) => {
      form.setOnSuccess({ mode: "closeOnly" });
      form.addFields([
        {
          name: "name",
          label: "Name",
          placeholder: "e.g. Code Agents",
          type: "text",
          required: true,
        },
        {
          name: "description",
          label: "Description",
          placeholder: "What is this pool for?",
          type: "textarea",
          required: false,
          rows: 2,
        },
      ]);
      form.setGridCols(1);
    });

    // Data layer. The generic Phaze create() would skip the required
    // createdDate, so the create mutation routes through createPool().
    feature.useDataLayer({
      query: bsDB.agentPoolsRepo.dataLayer.query,
      mutation: {
        create: async (data) => {
          const created = await bsDB.agentPoolsRepo.createPool({
            name: data.name,
            description: data.description,
          });
          return { status: "success", data: created };
        },
        update: bsDB.agentPoolsRepo.dataLayer.mutation.update,
        delete: bsDB.agentPoolsRepo.dataLayer.mutation.delete,
      },
    });
  },
);
