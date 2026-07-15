// BFlowMigration.ts
//
// Database schema migrations for BFlowDatabase.
// Each `model.schema()` call maps to a sequential Dexie version for
// proper IndexedDB schema migration without data loss.

import { IPhazeModelBuilder } from "@/src/modules/phaze/src/PhazeDB";

export function configureBFlowMigrations(model: IPhazeModelBuilder): void {
  // ── Version 1 — initial schema ──────────────────────────────────
  //
  // All tables use a plain string primary key ("id") so that UUID v7 values
  // supplied by PhazeRepository.create() are stored as-is.  The "uuid()"
  // helper sets the Dexie primary-key expression to "id" (no "++" prefix),
  // which tells Dexie to use the value already present on the entity object.
  model.schema((config) => {
    // Flow Definitions
    config.create("definitions", (table) => {
      table.uuid();
      table.index("code");
      table.index("slug");
      table.index("status");
    });

    // Workflow Templates
    config.create("workflowTemplates", (table) => {
      table.uuid();
      table.index("flowId");
      table.index("slug");
      table.index("status");
    });

    // Pipelines
    config.create("pipelines", (table) => {
      table.uuid();
      table.index("templateId");
      table.index("flowId");
      table.index("slug");
      table.index("status");
    });

    // Pipeline Stores
    config.create("pipelineStores", (table) => {
      table.uuid();
      table.index("pipelineId");
    });

    // Pipeline Store Data
    config.create("pipelineStoreData", (table) => {
      table.uuid();
      table.index("storeId");
      table.index("key");
    });

    // Report Templates
    config.create("reportTemplates", (table) => {
      table.uuid();
      table.index("workflowId");
      table.index("flowId");
    });

    // Pipeline Reports
    config.create("pipelineReports", (table) => {
      table.uuid();
      table.index("pipelineId");
      table.index("templateId");
      table.index("flowId");
    });

    // Report Snapshots
    config.create("reportSnapshots", (table) => {
      table.uuid();
      table.index("pipelineId");
    });

    // Variable Groups
    config.create("variableGroups", (table) => {
      table.uuid();
      table.index("flowId");
      table.index("slug");
    });
  });

  // ── Version 2 — add global variables ───────────────────────────
  model.schema((config) => {
    config.create("globalVariables", (table) => {
      table.uuid();
      table.index("name");
      table.index("group");
    });
  });

  // ── Version 3 — add flow variables (individual vars in groups) ─
  model.schema((config) => {
    config.create("flowVariables", (table) => {
      table.uuid();
      table.index("groupId");
      table.index("name");
    });
  });

  // ── Version 4 — add AI config tables ───────────────────────────
  model.schema((config) => {
    // Global AI Config (single record with fixed id "global")
    config.create("globalAIConfig", (table) => {
      table.uuid("id");
      table.index("active");
    });

    // Flow-level AI Config (one per definition flow)
    config.create("flowAIConfig", (table) => {
      table.uuid();
      table.index("flowId");
      table.index("active");
    });

    // Pipeline-level AI Config (one per pipeline, with job overrides)
    config.create("pipelineAIConfig", (table) => {
      table.uuid();
      table.index("pipelineId");
      table.index("active");
    });
  });

  // ── Version 5 — add pipeline run tracking tables ──────────────
  model.schema((config) => {
    // Pipeline Runs — tracks overall pipeline execution
    config.create("pipelineRuns", (table) => {
      table.uuid();
      table.index("pipelineId");
      table.index("flowId");
      table.index("templateId");
      table.index("status");
    });

    // Job Runs — tracks individual job execution within a pipeline run
    config.create("jobRuns", (table) => {
      table.uuid();
      table.index("runId");
      table.index("jobId");
      table.index("status");
    });

    // Step Runs — tracks individual step execution within a job run
    config.create("stepRuns", (table) => {
      table.uuid();
      table.index("jobRunId");
      table.index("runId");
      table.index("stepId");
      table.index("status");
    });
  });

  // ── Version 6 — add agent pools table ───────────────────────────
  model.schema((config) => {
    config.create("agentPools", (table) => {
      table.uuid();
      table.index("code");
      table.index("slug");
      table.index("status");
    });
  });

  // ── Version 7 — add pool agents table ───────────────────────────
  model.schema((config) => {
    config.create("poolAgents", (table) => {
      table.uuid();
      table.index("poolId");
      table.index("name");
    });
  });
}
