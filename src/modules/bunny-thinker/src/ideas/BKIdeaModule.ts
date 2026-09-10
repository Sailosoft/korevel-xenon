import { createElement } from "react";
import { Sparkles } from "lucide-react";
import { BunnyFeature } from "@/src/modules/bunny/src/feature/BunnyFeature";
import { createBunnyHelixAction } from "@/src/modules/bunny-helix";
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

    feature.configureHeader((header) => {
      header.addAction(
        createBunnyHelixAction<BKIdea, BKIdea>({
          id: "ai-generate-idea",
          label: "AI Generate",
          icon: createElement(Sparkles, { className: "size-4" }),
          variant: "accent",
          ai: async () => {
            const res = await bkThinkerDB.aiSettingsRepo.get("global");
            if (!res.isSuccess || !res.value.provider || !res.value.model) {
              return undefined;
            }
            return { provider: res.value.provider, model: res.value.model };
          },
          inputFields: [
            {
              name: "brief",
              label: "Describe the idea",
              type: "textarea",
              required: true,
              rows: 4,
            },
          ],
          targets: [
            {
              field: "name",
              prompt: "A short, specific name for the idea (max ~60 chars).",
            },
            {
              field: "idea",
              prompt:
                "The complete idea content: clear, actionable, ready to use as a reusable prompt template or reference.",
            },
            {
              field: "tags",
              prompt:
                "Comma-separated tags that categorize the idea (e.g. creative, technical, analysis).",
            },
          ],
          onCreate: "prefill",
          modalTitle: "AI Generate Idea",
          submitLabel: "Generate",
        }),
      );
    });
  },
);
