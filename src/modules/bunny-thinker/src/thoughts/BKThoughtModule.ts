import { BunnyFeature } from "@/src/modules/bunny/src/feature/BunnyFeature";
import { createElement } from "react";
import { PlayCircle, GitBranch, Lightbulb } from "lucide-react";
import { v7 as uuidv7 } from "uuid";
import { bkThinkerDB } from "../database/BKThinkerDatabase";
import type { BKThought } from "../thoughts/BKThoughts.Types";
import { useBKThoughtFormValidation } from "./BKThought.Validation";

export const bkThoughtModule = BunnyFeature.create<BKThought, BKThought>(
  "Thought",
  "id",
  (feature) => {
    feature.setModuleUrl("/modules/bunny-thinker/thoughts");
    feature.useDefault();
    feature.setValidationAdapter(useBKThoughtFormValidation());

    feature.configureTable((table) => {
      table.addColumns([
        { field: "name", header: "Name", sortable: true, isRowHeader: true },
        { field: "description", header: "Description", sortable: false },
        {
          field: "createdAt",
          header: "Created",
          sortable: true,
          format: (val) => (val ? new Date(val).toLocaleString() : ""),
        },
      ]);
    });

    feature.configureRow((row) => {
      row.addAction({
        id: "thought-studio",
        icon: createElement(GitBranch),
        variant: "secondary",
        onClick(row, context) {
          const thought = row as BKThought;
          context.router.push(
            `/modules/bunny-thinker/thoughts/${thought.id}`,
          );
        },
      });

      row.addAction({
        id: "run-thought",
        icon: createElement(PlayCircle),
        variant: "primary",
        onClick(row, context) {
          const thought = row as BKThought;
          const thinkId = uuidv7();
          bkThinkerDB.thinksRepo.create({
            id: thinkId,
            slug: thought.name.toLowerCase().replace(/\s+/g, "-"),
            name: `Run: ${thought.name}`,
            thoughtId: thought.id,
            status: "draft",
            thinkConversation: [],
            createdAt: Date.now(),
          }).then(() => {
            context.router.push(`/modules/bunny-thinker/think/${thinkId}`);
          });
        },
      });
    });

    feature.configureForm((form) => {
      form.setOnSuccess({ mode: "closeOnly" });
      form.setGridCols(1);
      form.addFields([
        {
          name: "name",
          label: "Name",
          placeholder: "Enter thought name",
          type: "text",
          required: true,
        },
        {
          name: "patternId",
          label: "Thought Pattern",
          placeholder: "Select a thought pattern (optional)",
          type: "select",
          required: false,
          options: () => bkThinkerDB.thoughtPatternsRepo.toSelectOptions(),
        },
        {
          name: "description",
          label: "Description",
          placeholder: "Optional description",
          type: "text",
        },
        {
          name: "thought",
          label: "Thought Content",
          placeholder: "Enter the main thought / system prompt content...",
          type: "textarea",
          required: true,
          rows: 8,
          // colSpan: 2,
        },
      ]);
    });

    feature.useDataLayer(bkThinkerDB.thoughtsRepo.dataLayer);
  },
);
