import { BunnyFeature } from "@/src/modules/bunny/src/feature/BunnyFeature";
import { createElement } from "react";
import { Settings } from "lucide-react";
import { bkThinkerDB } from "../database/BKThinkerDatabase";
import type { BKThoughtPattern } from "../thought-pattern/BKThoughtPattern.Types";
import { BK_PATTERN_GROUPS } from "../thought-pattern/BKThoughtPattern.Types";
import { useBKThoughtPatternFormValidation } from "./BKThoughtPattern.Validation";

export const bkThoughtPatternModule = BunnyFeature.create<
  BKThoughtPattern,
  BKThoughtPattern
>("Thought Pattern", "id", (feature) => {
  feature.setModuleUrl("/modules/bunny-thinker/thought-patterns");
  feature.useDefault();
  feature.setValidationAdapter(useBKThoughtPatternFormValidation());

  feature.configureTable((table) => {
    table.addColumns([
      { field: "name", header: "Name", sortable: true, isRowHeader: true },
      { field: "group", header: "Group", sortable: true },
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
      id: "configure-pattern",
      icon: createElement(Settings),
      variant: "secondary",
      onClick(row, context) {
        const pattern = row as BKThoughtPattern;
        context.router.push(
          `/modules/bunny-thinker/thought-patterns/${pattern.id}`,
        );
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
        placeholder: "Enter pattern name",
        type: "text",
        required: true,
      },
      {
        name: "group",
        label: "Group",
        type: "select",
        options: BK_PATTERN_GROUPS.map((g) => ({ label: g, value: g })),
      },
      {
        name: "description",
        label: "Description",
        placeholder: "What does this pattern represent?",
        type: "textarea",
        colSpan: 2,
        rows: 3,
      },
    ]);
  });

  feature.useDataLayer(bkThinkerDB.thoughtPatternsRepo.dataLayer);
});
