// BKProcessModule.ts
//
// BunnyFeature module for BKProcess — binds thought-association, thought,
// and export-to-memory into an automated workflow.

import { BunnyFeature } from "@/src/modules/bunny/src/feature/BunnyFeature";
import { createElement } from "react";
import { PlayCircle, RotateCcw, ExternalLink } from "lucide-react";
import { bkThinkerDB } from "../database/BKThinkerDatabase";
import type { BKProcess } from "./BKProcess.Types";
import { useBKProcessFormValidation } from "./BKProcess.Validation";
import BKProcessAssociationSelect from "./BKProcessAssociationSelect";

export const bkProcessModule = BunnyFeature.create<BKProcess, BKProcess>(
  "Process",
  "id",
  (feature) => {
    feature.setModuleUrl("/modules/bunny-thinker/processes");
    feature.useDefault();
    feature.setValidationAdapter(useBKProcessFormValidation());

    feature.configureTable((table) => {
      table.addColumns([
        { field: "name", header: "Name", sortable: true, isRowHeader: true },
        { field: "associationId", header: "Association", sortable: true },
        {
          field: "status",
          header: "Status",
          sortable: true,
          format: (val) =>
            val
              ? String(val).charAt(0).toUpperCase() + String(val).slice(1)
              : "",
        },
        {
          field: "createdAt",
          header: "Created",
          sortable: true,
          format: (val) => (val ? new Date(val).toLocaleString() : ""),
        },
      ]);
    });

    feature.configureRow((row) => {
      // Run Process action
      row.addAction({
        id: "run-process",
        icon: createElement(PlayCircle),
        variant: "primary",
        onClick(row, context) {
          const process = row as BKProcess;
          context.router.push(
            `/modules/bunny-thinker/processes/${process.id}`,
          );
        },
      });

      // View linked Think session (if completed)
      row.addAction({
        id: "view-think",
        icon: createElement(ExternalLink),
        variant: "secondary",
        onClick(row, context) {
          const process = row as BKProcess;
          if (process.thinkId) {
            context.router.push(
              `/modules/bunny-thinker/think/${process.thinkId}`,
            );
          }
        },
      });
    });

    feature.configureForm((form) => {
      form.setOnSuccess({ mode: "closeOnly" });
      form.setGridCols(2);
      form.addFields([
        {
          name: "name",
          label: "Name",
          placeholder: "Enter process name",
          type: "text",
          required: true,
        },
        {
          name: "thoughtId",
          label: "Thought",
          type: "select",
          required: true,
          options: () => bkThinkerDB.thoughtsRepo.toSelectOptions(),
        },
        {
          name: "associationId",
          label: "Thought Association",
          type: "custom",
          required: true,
          component: BKProcessAssociationSelect,
        },
        {
          name: "description",
          label: "Description",
          placeholder: "Optional description",
          type: "textarea",
          colSpan: 2,
          rows: 3,
        },
      ]);
    });

    feature.useDataLayer(bkThinkerDB.processesRepo.dataLayer);
  },
);
