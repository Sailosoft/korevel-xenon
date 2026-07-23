import { BunnyFeature } from "@/src/modules/bunny/src/feature/BunnyFeature";
import { BFlowPipelineEntity } from "./BFlowPipeline.Types";
import { bflowDB } from "../database/BFlowDatabase";
import { useBFlowPipelineFormValidation } from "../adapters/BFlowZodAdapter";
import { PlayCircle, Braces, FileCode } from "lucide-react";
import { createElement } from "react";

export const bflowPipelineModule = BunnyFeature.create<
  BFlowPipelineEntity,
  BFlowPipelineEntity
>("Pipeline", "id", (feature) => {
  // ── SSR-safe configuration (runs on both server and client) ──────────
  feature.setModuleUrl("/modules/bunny-flow/*");
  feature.useDefault();

  // ── Validation adapter ─────────────────────────────────────────────────
  feature.setValidationAdapter(useBFlowPipelineFormValidation());
  feature.configureTable((table) => {
    table.addColumns([
      // { field: "id", header: "ID", sortable: true, isRowHeader: true },
      { field: "name", header: "Name", sortable: true, isRowHeader: true },
      { field: "slug", header: "Slug", sortable: true },
      // { field: "status", header: "Status", sortable: true },
      // { field: "version", header: "Version", sortable: true },
      // { field: "createdAt", header: "Created", sortable: true },
      // Add a visual indicator for the prompt builder strategy
      {
        field: "metadata",
        header: "Prompt Strategy",
        sortable: false,
        render: (value: unknown) => {
          const meta = value as Record<string, unknown> | undefined;
          const kind = meta?.promptBuilderKind as string | undefined;
          if (kind === "templatebar") {
            return createElement(
              "span",
              {
                className:
                  "inline-flex items-center gap-1 text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full",
              },
              createElement(FileCode, { className: "w-3 h-3" }),
              "TemplateBar",
            );
          }
          return createElement(
            "span",
            {
              className:
                "inline-flex items-center gap-1 text-xs bg-default-100 text-default-600 px-2 py-0.5 rounded-full",
            },
            createElement(Braces, { className: "w-3 h-3" }),
            "Section",
          );
        },
      } as any,
    ]);
  });

  feature.configureRow((row) => {
    row.addAction({
      id: "run-pipeline",
      // label: "Run",
      icon: createElement(PlayCircle),
      variant: "primary",
      onClick(row, context) {
        const flowId = (row as BFlowPipelineEntity).flowId;
        if (flowId) {
          // Stay within the flow context
          context.router.push(
            `/modules/bunny-flow/flow/${flowId}/pipeline/${row.id}/run`,
          );
        } else {
          context.router.push(`/modules/bunny-flow/pipeline/${row.id}/run`);
        }
      },
    });
  });

  feature.configureForm((form) => {
    form.setOnSuccess({ mode: "closeOnly" });
    form.addFields([
      {
        name: "name",
        label: "Name",
        placeholder: "Enter pipeline name",
        type: "text",
        required: true,
      },
      {
        name: "slug",
        label: "Slug",
        type: "slug",
        required: true,
        slug: { sourceField: "name" },
      },
      {
        name: "description",
        label: "Description",
        placeholder: "Describe the pipeline purpose",
        type: "textarea",
        rows: 4,
      },
      {
        name: "templateId",
        label: "Workflow Template",
        placeholder: "Select workflow template",
        type: "select",
        required: true,
        options: () => bflowDB.workflowTemplatesRepo.toSelectOptions(),
      },
      {
        name: "flowId",
        label: "Flow Definition",
        placeholder: "Select flow definition",
        type: "select",
        required: true,
        options: () => bflowDB.definitionsRepo.toSelectOptions(),
      },
      {
        name: "variableGroupId",
        label: "Variable Group",
        placeholder: "Select variable group",
        type: "select",
        required: true,
        options: () => bflowDB.variableGroupsRepo.toSelectOptions(),
      },
      // {
      //   name: "versionLabel",
      //   label: "Version Label",
      //   placeholder: "e.g. v1.0.0",
      //   type: "text",
      // },
      // {
      //   name: "status",
      //   label: "Status",
      //   type: "select",
      //   options: [
      //     { label: "Running", value: "running" },
      //     { label: "Completed", value: "completed" },
      //     { label: "Failed", value: "failed" },
      //     { label: "Cancelled", value: "cancelled" },
      //   ],
      // },
      {
        name: "prompt",
        label: "Prompt Override",
        placeholder: "Optional prompt that overrides the template prompt",
        type: "textarea",
        rows: 6,
      },
      // ── Prompt Builder Strategy ──────────────────────────────────
      //
      // Determines which prompt builder implementation is used at
      // pipeline execution time. The selected value is stored in
      // the pipeline entity's `metadata.promptBuilderKind` field.
      {
        name: "metadata.promptBuilderKind",
        label: "Prompt Builder",
        placeholder: "Select prompt builder strategy",
        type: "select",
        defaultValue: "section",
        options: [
          {
            label: "Section Builder (default)",
            value: "section",
          },
          {
            label: "TemplateBar (Handlebars)",
            value: "templatebar",
          },
        ],
      },
    ]);
    form.setGridCols(1);
  });

  feature.configureModal((builder) => {
    builder.setSize(1000);
  })

  feature.useDataLayer(bflowDB.pipelinesRepo.dataLayer);
});
