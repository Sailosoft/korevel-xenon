import { BunnyFeature } from "@/src/modules/bunny/src/feature/BunnyFeature";
import { bkThinkerDB } from "../database/BKThinkerDatabase";
import type { BKThinker } from "../thinker/BKThinker.Types";
import { BKThinkerRoles } from "../thinker/BKThinker.Types";
import { useBKThinkerFormValidation } from "./BKThinker.Validation";

export const bkThinkerModule = BunnyFeature.create<BKThinker, BKThinker>(
  "Thinker",
  "id",
  (feature) => {
    feature.setModuleUrl("/modules/bunny-thinker/thinkers");
    feature.useDefault();
    feature.setValidationAdapter(useBKThinkerFormValidation());

    feature.configureTable((table) => {
      table.addColumns([
        { field: "name", header: "Name", sortable: true, isRowHeader: true },
        { field: "role", header: "Role", sortable: true },
        { field: "specialization", header: "Specialization", sortable: true },
        { field: "description", header: "Description", sortable: false },
        { field: "createdAt", header: "Created", sortable: true },
      ]);
    });

    feature.configureForm((form) => {
      form.setOnSuccess({ mode: "closeOnly" });
      form.setGridCols(2);
      form.addFields([
        {
          name: "name",
          label: "Name",
          placeholder: "Enter thinker name",
          type: "text",
          required: true,
        },
        {
          name: "role",
          label: "Role",
          type: "select",
          required: true,
          options: BKThinkerRoles.map((r) => ({
            label: r.replace(/([A-Z])/g, " $1").trim(),
            value: r,
          })),
        },
        {
          name: "specialization",
          label: "Specialization",
          placeholder: "e.g. Frontend, Backend, UX",
          type: "text",
        },
        {
          name: "rules",
          label: "Rules (Guard Rails)",
          placeholder: "Optional guard rails for this thinker",
          type: "textarea",
          rows: 3,
        },
        {
          name: "description",
          label: "Description",
          placeholder: "Describe this thinker's perspective...",
          type: "textarea",
          required: true,
          colSpan: 2,
          rows: 4,
        },
      ]);
    });

    feature.useDataLayer(bkThinkerDB.thinkersRepo.dataLayer);
  },
);
