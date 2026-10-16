"use client";

// BDAppTable.Component — table designer: edit the ordered column list of a
// resource's index table. When the resource is tied to a schema model,
// "Add column" opens a property picker — the picked property pre-fills the
// column (name, label, derived type) with a persisted schema link, and the
// column type stays fully adjustable afterwards.

import { useState } from "react";
import { Plus, RefreshCw, Trash2, Wand2 } from "lucide-react";
import type { BDAppColumn, BDSchemaModel } from "../../BDDomain.Types";
import { BD_APP_COLUMN_TYPE_OPTIONS, columnFromProperty } from "./BDApp.Types";
import BDAppModelDerive from "./BDAppModelDerive.Component";
import BDAppPropertyPicker from "./BDAppPropertyPicker.Component";
import BDButton from "../../components/BDButton";

export interface BDAppTableComponentProps {
  columns: BDAppColumn[];
  /**
   * The resource's tied schema model, when its schema/table are tied up. Its
   * properties become the candidates for "Add column".
   */
  model?: BDSchemaModel | null;
  projectId: string;
  onChange: (columns: BDAppColumn[]) => void;
}

const CELL =
  "rounded border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-blue-400";

export function BDAppTableComponent({
  columns,
  model,
  projectId,
  onChange,
}: BDAppTableComponentProps) {
  const [deriveOpen, setDeriveOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const update = (index: number, patch: Partial<BDAppColumn>) => {
    onChange(columns.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  };

  const deriveFromModel = (schemaModel: BDSchemaModel) => {
    onChange(schemaModel.properties.map(columnFromProperty));
  };

  // When a schema model is tied to the resource, picking a property creates a
  // linked column instead of a blank one.
  const addColumn = () => {
    if (model) {
      setPickerOpen(true);
      return;
    }
    onChange([...columns, { type: "text", name: `col_${columns.length + 1}` }]);
  };

  return (
    <>
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">
            Table columns ({columns.length})
          </h3>
          <div className="flex items-center gap-2">
            <BDButton
              size="sm"
              variant="secondary"
              icon={Wand2}
              onClick={() => setDeriveOpen(true)}
            >
              Derive
            </BDButton>
            <BDButton
              size="sm"
              variant="secondary"
              icon={Plus}
              onClick={addColumn}
            >
              {model ? "Add from schema" : "Add column"}
            </BDButton>
          </div>
        </div>

        {columns.length === 0 ? (
          <p className="text-xs text-slate-400">
            {model
              ? "No columns yet — add schema properties one by one, or derive them all at once."
              : "No columns yet — derive from a model or add manually."}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {columns.map((column, index) => {
              const linkedProperty = column.schemaPropertyName
                ? model?.properties.find(
                    (p) => p.name === column.schemaPropertyName,
                  )
                : undefined;
              return (
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

                  {linkedProperty && (
                    <span
                      className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600"
                      title={`Schema property: ${linkedProperty.name}`}
                    >
                      schema · {linkedProperty.type}
                    </span>
                  )}
                  {linkedProperty && (
                    <button
                      type="button"
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      title="Re-sync from schema property (resets name, label and type)"
                      onClick={() =>
                        update(index, columnFromProperty(linkedProperty))
                      }
                      aria-label="Re-sync from schema property"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                  )}

                  <button
                    type="button"
                    className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
                    onClick={() => onChange(columns.filter((_, i) => i !== index))}
                    aria-label="Remove column"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <BDAppModelDerive
        open={deriveOpen}
        onClose={() => setDeriveOpen(false)}
        projectId={projectId}
        kind="columns"
        onSelect={(schemaModel) => {
          deriveFromModel(schemaModel);
          setDeriveOpen(false);
        }}
      />

      <BDAppPropertyPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        model={model ?? null}
        excludeNames={columns.map((c) => c.schemaPropertyName ?? c.name)}
        onSelect={(property) =>
          onChange([...columns, columnFromProperty(property)])
        }
      />
    </>
  );
}

export default BDAppTableComponent;
