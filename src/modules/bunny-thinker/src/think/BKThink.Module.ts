import { BunnyFeature } from "@/src/modules/bunny/src/feature/BunnyFeature";
import { BKThink, BKThinkStatuses } from "./BKThink.Types";
import { getBunnyDefaultRowActions } from "@/src/modules/bunny/src/rows/BunnyRow.Action.Default";
import { bkThinkerDB } from "../database/BKThinkerDatabase";
import { BunnyKernel } from "@/src/modules/bunny/src/Bunny.Interface";
import React from "react";
import { PackageOpen } from "lucide-react";
import { createElement } from "react";

export class BKThinkModule extends BunnyFeature<BKThink, BKThink> {
  private thoughtNameMap: Record<string, string> = {};

  constructor() {
    super("Think", "id");

    // Pre-load thought names for display resolution
    bkThinkerDB.thoughtsRepo.query
      .getAll({ page: 0, pageSize: 500, filters: [] })
      .then((res) => {
        for (const t of res.data) {
          this.thoughtNameMap[t.id] = t.name;
        }
      })
      .catch(() => {
        // Silently fail — table will show truncated IDs as fallback
      });

    this.configureTable((t) => {
      t.addColumns([
        {
          field: "name",
          header: "Name",
          sortable: true,
          isRowHeader: true,
        },
        {
          field: "slug",
          header: "Slug",
          sortable: true,
        },
        {
          field: "description",
          header: "Description",
          sortable: false,
        },
        {
          field: "thoughtId",
          header: "Thought",
          sortable: true,
          format: (_val, row) => {
            const think = row as BKThink;
            return this.thoughtNameMap[think.thoughtId] ?? think.thoughtId.slice(0, 8) + "\u2026";
          },
        },
        {
          field: "status",
          header: "Status",
          sortable: true,
          format: (val) => {
            if (val === "completed") return "✅ Completed";
            if (val === "thinking") return "🔄 Thinking";
            if (val === "consolidating") return "🧩 Consolidating";
            if (val === "error") return "❌ Error";
            return "📝 Draft";
          },
        },
        {
          field: "createdAt",
          header: "Created",
          sortable: true,
          format: (val) => (val ? new Date(val).toLocaleString() : ""),
        },
        {
          field: "updatedAt",
          header: "Updated",
          sortable: true,
          format: (val) => (val ? new Date(val).toLocaleString() : ""),
        },
      ]);
    });

    this.configureForm((form) => {
      form.setOnSuccess({ mode: "closeOnly" });
      form.setGridCols(1);
      form.addFields([
        {
          name: "name",
          label: "Name",
          placeholder: "Enter think name",
          type: "text",
          required: true,
        },
        {
          name: "slug",
          label: "Slug",
          placeholder: "url-friendly identifier",
          type: "text",
          required: true,
        },
        {
          name: "description",
          label: "Description",
          placeholder: "Optional description",
          type: "textarea",
          rows: 3,
        },
        {
          name: "thoughtId",
          label: "Thought",
          placeholder: "Select a thought",
          type: "select",
          required: true,
          options: () => bkThinkerDB.thoughtsRepo.toSelectOptions(),
        },
        {
          name: "status",
          label: "Status",
          type: "select",
          required: true,
          options: BKThinkStatuses.map((s) => ({
            label: s.charAt(0).toUpperCase() + s.slice(1),
            value: s,
          })),
        },
      ]);
    });

    this.configureRow((r) => {
      const action = getBunnyDefaultRowActions<BKThink>();
      r.addAction(action.view);
      r.addAction(action.delete);
      r.addAction({
        id: "open",
        icon: React.createElement(PackageOpen),
        onClick: function (row, context): void | Promise<void> {
          const think = row as BKThink;
          context.router.push(`/modules/bunny-thinker/think/${think.id}`);
        },
      });
    });

    this.useDataLayer(bkThinkerDB.thinksRepo.dataLayer);
  }

  public static make() {
    return new this().build(() => {});
  }
}