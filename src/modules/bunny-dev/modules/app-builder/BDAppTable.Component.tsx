"use client";

// BDAppTable.Component — table designer: edit the ordered column list of a
// resource's index table.

import { Plus, Trash2 } from "lucide-react";
import type { BDAppColumn, BDSchemaModel } from "../../BDDomain.Types";
import { BD_APP_COLUMN_TYPE_OPTIONS, columnFromProperty } from "./BDApp.Types";
import BDButton from "../../components/BDButton";

export interface BDAppTableComponentProps {
  columns: BDAppColumn[];
  models: BDSchemaModel[];
  onChange: (columns: BDAppColumn[]) => void;
}

const CELL =
  "rounded border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-blue-400";

export function BDAppTableComponent({
  columns,
  models,
  onChange,
}: BDAppTableComponentProps) {
  const update = (index: number, patch: Partial<BDAppColumn>) => {
    onChange(columns.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  };

  const deriveFromModel = (modelId: string) => {
    const model = models.find((m) => m.id === modelId);
    if (!model) return;
    onChange(model.properties.map(columnFromProperty));
  };

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">
          Table columns ({columns.length})
        </h3>
        <div className="flex items-center gap-2">
          <select
            className={CELL}
            value=""
            onChange={(e) => {
              if (e.target.value) deriveFromModel(e.target.value);
            }}
          >
            <option value="">Derive from model…</option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <BDButton
            size="sm"
            variant="secondary"
            icon={Plus}
            onClick={() =>
              onChange([...columns, { type: "text", name: `col_${columns.length + 1}` }])
            }
          >
            Add column
          </BDButton>
        </div>
      </div>

      {columns.length === 0 ? (
        <p className="text-xs text-slate-400">
          No columns yet — derive from a model or add manually.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {columns.map((column, index) => (
            <div
              key={index}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 p-2"
            >
              <input
                className={`${CELL} w-36`}
                placeholder="name"
                value={column.name}
                onChange={(e) => update(index, { name: e.target.value })}
              />
              <input
                className={`${CELL} w-36`}
                placeholder="label"
                value={column.label ?? ""}
                onChange={(e) =>
                  update(index, { label: e.target.value || undefined })
                }
              />
              <select
                className={CELL}
                value={column.type}
                onChange={(e) =>
                  update(index, {
                    type: e.target.value as BDAppColumn["type"],
                  })
                }
              >
                {BD_APP_COLUMN_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-1 text-xs text-slate-500">
                <input
                  type="checkbox"
                  checked={!!column.sortable}
                  onChange={(e) =>
                    update(index, { sortable: e.target.checked })
                  }
                />
                sortable
              </label>
              <label className="flex items-center gap-1 text-xs text-slate-500">
                <input
                  type="checkbox"
                  checked={!!column.searchable}
                  onChange={(e) =>
                    update(index, { searchable: e.target.checked })
                  }
                />
                searchable
              </label>
              <button
                type="button"
                className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
                onClick={() => onChange(columns.filter((_, i) => i !== index))}
                aria-label="Remove column"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default BDAppTableComponent;
