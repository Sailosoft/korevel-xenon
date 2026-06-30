import { BunnyFeature } from "@/src/modules/bunny/src/feature/BunnyFeature";
import { bkThinkerDB } from "../database/BKThinkerDatabase";
import type { BKIdea } from "../ideas/BKIdeas.Types";
import { useBKIdeaFormValidation } from "./BKIdea.Validation";

export const bkIdeaModule = BunnyFeature.create<BKIdea, BKIdea>(
  "Idea",
  "id",
  (feature) => {
    feature.setModuleUrl("/modules/bunny-thinker/ideas");
    feature.useDefault();
    feature.setValidationAdapter(useBKIdeaFormValidation());

    feature.configureTable((table) => {
      table.addColumns([
        { field: "name", header: "Name", sortable: true, isRowHeader: true },
        { field: "tags", header: "Tags", sortable: true },
        { field: "idea", header: "Content", sortable: false },
        {
          field: "createdAt",
          header: "Created",
          sortable: true,
          format: (val) => (val ? new Date(val).toLocaleString() : ""),
        },
      ]);
    });

    feature.configureForm((form) => {
      form.setOnSuccess({ mode: "closeOnly" });
      form.addFields([
        {
          name: "name",
          label: "Name",
          placeholder: "Enter idea name",
          type: "text",
          required: true,
        },
        {
          name: "tags",
          label: "Tags",
          placeholder: "e.g. creative, technical, analysis",
          type: "text",
        },
        {
          name: "idea",
          label: "Idea Content",
          placeholder: "Enter the reusable idea / prompt template...",
          type: "textarea",
          required: true,
          rows: 6,
          colSpan: 2,
        },
      ]);
    });

    feature.useDataLayer(bkThinkerDB.ideasRepo.dataLayer);
  },
);
