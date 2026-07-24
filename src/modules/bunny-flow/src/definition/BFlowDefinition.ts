import { BunnyFeature } from "@/src/modules/bunny/src/feature/BunnyFeature";
import { BFlowDefinitionEntity } from "./BFlowDefinition.Types";
import { bflowDB } from "../database/BFlowDatabase";
import { useBFlowDefinitionFormValidation } from "../adapters/BFlowZodAdapter";
import { GitBranch } from "lucide-react";
import { createElement } from "react";

export const bflowDefinitionModule = BunnyFeature.create<
  BFlowDefinitionEntity,
  BFlowDefinitionEntity
>("Flow", "id", (feature) => {
  // ── SSR-safe configuration (runs on both server and client) ──────────
  feature.setModuleUrl("/modules/bunny-flow");
  feature.useDefault();

  // ── Validation adapter ─────────────────────────────────────────────────
  feature.setValidationAdapter(useBFlowDefinitionFormValidation());
  feature.configureTable((table) => {
    table.addColumns([
      // { field: "id", header: "ID", sortable: true, isRowHeader: true },
      // { field: "code", header: "Code", sortable: true },
      { field: "name", header: "Name", sortable: true, isRowHeader: true },
      { field: "slug", header: "Slug", sortable: true },
      // { field: "status", header: "Status", sortable: true },
      // { field: "version", header: "Version", sortable: true },
    ]);
  });

  feature.configureRow((row) => {
    row.addAction({
      id: "open-flow",
      icon: createElement(GitBranch),
      onClick(row, context) {
        context.router.push(`/modules/bunny-flow/flow/${row.id}`);
      },
    });
  });

  feature.configureModal((modal) => {
    modal.setSize("lg")
  })

  feature.configureForm((form) => {
    form.setOnSuccess({ mode: "redirect", route: "/modules/bunny-flow/flow" });
    form.addFields([
      {
        name: "name",
        label: "Name",
        placeholder: "Enter flow name",
        type: "text",
        required: true,
      },
      // {
      //   name: "code",
      //   label: "Code",
      //   type: "slug",
      //   required: true,
      //   slug: { sourceField: "name", prefix: "FLOW-" },
      // },
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
        placeholder: "Describe the flow purpose",
        type: "textarea",
        rows: 4,
      },
      // {
      //   name: "version",
      //   label: "Version",
      //   placeholder: "e.g. 1.0.0",
      //   type: "text",
      // },
      // {
      //   name: "status",
      //   label: "Status",
      //   type: "select",
      //   options: [
      //     { label: "Draft", value: "draft" },
      //     { label: "Published", value: "published" },
      //     { label: "Archived", value: "archived" },
      //   ],
      // },
    ]);
    form.setGridCols(1);
  });

  feature.useDataLayer(bflowDB.definitionsRepo.dataLayer);
});
