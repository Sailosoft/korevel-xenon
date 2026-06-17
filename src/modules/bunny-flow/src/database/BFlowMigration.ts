// BFlowMigration.ts
//
// Database schema migrations for BFlowDatabase.
// Each `model.schema()` call maps to a sequential Dexie version for
// proper IndexedDB schema migration without data loss.

import { IPhazeModelBuilder } from "@/src/modules/phaze/src/PhazeDB";

export function configureBFlowMigrations(model: IPhazeModelBuilder): void {
  // ── Version 1 — initial schema ──────────────────────────────────
  model.schema((config) => {
    // Flow Definitions
    config.create("definitions", (table) => {
      table.index("id");
      table.index("code");
      table.index("slug");
      table.index("status");
    });

    // Workflow Templates
    config.create("workflowTemplates", (table) => {
      table.index("id");
      table.index("definitionId");
      table.index("slug");
      table.index("status");
    });

    // Pipelines
    config.create("pipelines", (table) => {
      table.index("id");
      table.index("templateId");
      table.index("flowId");
      table.index("slug");
      table.index("status");
    });

    // Pipeline Stores
    config.create("pipelineStores", (table) => {
      table.index("id");
      table.index("pipelineId");
    });

    // Pipeline Store Data
    config.create("pipelineStoreData", (table) => {
      table.index("id");
      table.index("storeId");
      table.index("key");
    });

    // Report Templates
    config.create("reportTemplates", (table) => {
      table.index("id");
      table.index("workflowId");
      table.index("flowId");
    });

    // Pipeline Reports
    config.create("pipelineReports", (table) => {
      table.index("id");
      table.index("pipelineId");
      table.index("templateId");
      table.index("flowId");
    });

    // Report Snapshots
    config.create("reportSnapshots", (table) => {
      table.index("id");
      table.index("pipelineId");
    });

    // Variable Groups
    config.create("variableGroups", (table) => {
      table.index("id");
      table.index("flowId");
      table.index("slug");
    });
  });

  // ── Version 2 — add global variables ───────────────────────────
  model.schema((config) => {
    config.create("globalVariables", (table) => {
      table.index("id");
      table.index("name");
      table.index("group");
    });
  });

  // ── Version 3 — add flow variables (individual vars in groups) ─
  model.schema((config) => {
    config.create("flowVariables", (table) => {
      table.index("id");
      table.index("groupId");
      table.index("name");
    });
  });
}
