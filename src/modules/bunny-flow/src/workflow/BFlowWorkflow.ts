import React from "react";
import { BunnyFeature } from "@/src/modules/bunny/src/feature/BunnyFeature";
import {
  BFlowWorkflowTemplateEntity,
  BFlowWorkflowTemplateForm,
} from "./BFlowWorkflow.Types";
import { bflowDB } from "../database/BFlowDatabase";
import { useBFlowWorkflowFormValidation } from "../adapters/BFlowZodAdapter";
import { BookOpenIcon } from "lucide-react";
import BFlowWorkflowGuidePanel from "./BFlowWorkflow.Guide.Panel";
import { AdminPanelFormActionState } from "@/src/modules/admin-panel/features/form-fields/admin-panel-form-field.interface";

export const bflowWorkflowModule = BunnyFeature.create<
  BFlowWorkflowTemplateEntity,
  BFlowWorkflowTemplateForm
>("Workflow", "id", (feature) => {
  // ── SSR-safe configuration (runs on both server and client) ──────────
  feature.setModuleUrl("/modules/bunny-flow/*");
  feature.useDefault();

  // ── Validation adapter ─────────────────────────────────────────────────
  feature.setValidationAdapter(useBFlowWorkflowFormValidation());
  feature.setModalSize("lg");

  // ── Header display (detailed variant with description) ───────────────
  feature.configureHeader((header) => {
    header.setConfig({
      description:
        "Create and manage workflow templates. Each workflow defines a YAML-based orchestration pipeline.",
    });
  });

  // ── Modal header action: YAML Structure Guide toggle ────────────────
  feature.configureModal((modal) => {
    modal.addModalHeaderAction({
      id: "yaml-guide-toggle",
      label: "YAML Structure Guide",
      icon: React.createElement(BookOpenIcon, { className: "size-4" }),
      onClick: (context) => {
        context?.adminPanel.dialog.openDialog({
          title: "YAML Structure Guide",
          contentOnly: true,
          children: React.createElement(BFlowWorkflowGuidePanel, {
            show: true,
            onClose: () => context?.adminPanel.dialog.closeDialog(),
          }),
          actionId: "open-yaml-guide",
          onConfirm: function (options: {
            prevState?: AdminPanelFormActionState;
            form: FormData;
            context: unknown;
          }): AdminPanelFormActionState | Promise<AdminPanelFormActionState> {
            // throw new Error("Function not implemented.");
            return {};
          },
        });
      },
      hide: ["update", "view", "plain"],
    });
  });

  feature.configureTable((table) => {
    table.addColumns([
      // { field: "id", header: "ID", sortable: true, isRowHeader: true },
      { field: "name", header: "Name", sortable: true, isRowHeader: true },
      { field: "slug", header: "Slug", sortable: true },
      { field: "version", header: "Version", sortable: true },
      { field: "status", header: "Status", sortable: true },
      { field: "createdAt", header: "Created", sortable: true },
    ]);
  });

  feature.configureForm((form) => {
    form.setOnSuccess({ mode: "closeOnly" });
    form.setFormDefaultData({
      status: "draft",
      templateYaml: `# v{{VERSION_PLACEHOLDER}}
name: ""
description: ""
semanticVersion: 1.0.0
variables: []
agentPools: []
agents: []
jobs:
  - id: job-001
    name: job-1
    prompt: ""
    steps:
      - id: step-001
        name: step-1
        prompts: ""
`,
    });
    form.addFields([
      {
        name: "flowId",
        label: "Flow Definition",
        placeholder: "Select flow definition",
        type: "select",
        // required: true,
        options: () => bflowDB.definitionsRepo.toSelectOptions(),
      },
      {
        name: "name",
        label: "Name",
        placeholder: "Enter workflow name",
        type: "text",
        // required: true,
      },
      {
        name: "slug",
        label: "Slug",
        type: "slug",
        // required: true,
        slug: { sourceField: "name" },
      },
      {
        name: "description",
        label: "Description",
        placeholder: "Describe the workflow purpose",
        type: "textarea",
        rows: 4,
      },
      {
        name: "version",
        label: "Version",
        placeholder: "e.g. 1.0.0",
        type: "text",
      },
      {
        name: "status",
        label: "Status",
        type: "select",
        options: [
          { label: "Draft", value: "draft" },
          { label: "Published", value: "published" },
          { label: "Archived", value: "archived" },
        ],
      },
      {
        name: "templateYaml",
        label: "Template YAML",
        placeholder: "YAML workflow definition",
        type: "code-editor",
        language: "yaml",
        rows: 12,
      },
    ]);
    form.setGridCols(1);
  });

  feature.useDataLayer(bflowDB.workflowTemplatesRepo.dataLayer);
});
