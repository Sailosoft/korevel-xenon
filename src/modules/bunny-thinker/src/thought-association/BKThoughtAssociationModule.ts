import { BunnyFeature } from "@/src/modules/bunny/src/feature/BunnyFeature";
import { createElement } from "react";
import { Link } from "lucide-react";
import { bkThinkerDB } from "../database/BKThinkerDatabase";
import type { BKThoughtAssociation } from "./BKThoughtAssociation.Types";
import type { BKPatternMemorySlot } from "../thought-pattern/BKThoughtPattern.Types";

export const bkThoughtAssociationModule = BunnyFeature.create<
  BKThoughtAssociation,
  BKThoughtAssociation
>("Thought Association", "id", (feature) => {
  feature.setModuleUrl("/modules/bunny-thinker/thought-associations");
  feature.useDefault();

  feature.configureTable((table) => {
    table.addColumns([
      { field: "name", header: "Name", sortable: true, isRowHeader: true },
      {
        field: "patternId",
        header: "Pattern",
        sortable: true,
        mapping: {
          getRecords: () => bkThinkerDB.thoughtPatterns.toArray(),
          key: "id",
          label: "name",
        },
      },
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
      id: "edit-association",
      icon: createElement(Link),
      variant: "secondary",
      onClick(row, context) {
        const association = row as BKThoughtAssociation;
        context.router.push(
          `/modules/bunny-thinker/thought-associations/${association.id}`,
        );
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
        placeholder: "Enter association name",
        type: "text",
        required: true,
      },
      {
        name: "patternId",
        label: "Thought Pattern",
        type: "select",
        required: true,
        options: () => bkThinkerDB.thoughtPatternsRepo.toSelectOptions(),
      },
      {
        name: "description",
        label: "Description",
        placeholder: "Describe this association",
        type: "textarea",
        // colSpan: 2,
        rows: 3,
      },
    ]);
  });

  feature.useDataLayer(bkThinkerDB.thoughtAssociationsRepo.dataLayer);
});
