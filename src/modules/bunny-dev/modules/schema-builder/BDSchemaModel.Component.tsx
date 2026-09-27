"use client";

// BDSchemaModel.Component — drawer editor for one schema model: columns,
// relations, and indexes. Edits a local draft and saves the whole model.

import { useState } from "react";
import { Plus, Trash2, Save } from "lucide-react";
import type {
  BDSchemaModel,
  BDSchemaProperty,
  BDSchemaRelation,
  BDSchemaIndex,
} from "../../BDDomain.Types";
import { slugifyTable } from "./BDSchemaBuilder.Types";
import BDDrawer from "../../components/BDDrawer";
import BDButton from "../../components/BDButton";
import BDForm from "../../components/BDForm";
import {
  BD_SCHEMA_TYPE_OPTIONS,
  BD_SCHEMA_INDEX_TYPE_OPTIONS,
  createDefaultProperty,
  createDefaultRelation,
  createDefaultIndex,
  toModelForm,
  type BDSchemaModelForm,
} from "./BDSchemaBuilder.Types";

export interface BDSchemaModelComponentProps {
  open: boolean;
  model: BDSchemaModel | null;
  allModels: BDSchemaModel[];
  isSaving?: boolean;
  onClose: () => void;
  onSave: (model: BDSchemaModel) => Promise<void> | void;
  onDelete: () => void;
}

const CELL = "rounded border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-blue-400";

const MODEL_FIELDS = [
  { name: "name", label: "Model name", type: "text" as const, required: true },
  { name: "table", label: "Table", type: "text" as const },
  { name: "description", label: "Description", type: "textarea" as const, columnSpan: "full" as const },
  { name: "timestamps", label: "Timestamps", type: "toggle" as const },
  { name: "softDeletes", label: "Soft deletes", type: "toggle" as const },
];

export function BDSchemaModelComponent({
  open,
  model,
  allModels,
  isSaving,
  onClose,
  onSave,
  onDelete,
}: BDSchemaModelComponentProps) {
  const [draft, setDraft] = useState<BDSchemaModel | null>(model);
  const [form, setForm] = useState<BDSchemaModelForm | null>(
    model ? toModelForm(model) : null,
  );

  // Load the selected model into the local draft when the drawer opens or the
  // target changes (render-time adjustment, not a setState-in-effect).
  const drawerKey = `${open}:${model?.id ?? "none"}`;
  const [prevKey, setPrevKey] = useState(drawerKey);
  if (drawerKey !== prevKey) {
    setPrevKey(drawerKey);
    setDraft(model);
    setForm(model ? toModelForm(model) : null);
  }

  if (!draft || !form) {
    return (
      <BDDrawer open={open} onClose={onClose} title="Model">
        <p className="text-sm text-slate-500">Select a model to edit.</p>
      </BDDrawer>
    );
  }

  const update = (patch: Partial<BDSchemaModel>) =>
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));

  const handleFormChange = (values: Record<string, unknown>) => {
    const next = values as unknown as BDSchemaModelForm;
    setForm(next);
    update({
      name: next.name,
      table: next.table,
      description: next.description,
      timestamps: next.timestamps,
      softDeletes: next.softDeletes,
    });
  };

  // ── Properties ──────────────────────────────────────────────────────────
  const updateProperty = (index: number, patch: Partial<BDSchemaProperty>) => {
    const properties = draft.properties.map((p, i) =>
      i === index ? { ...p, ...patch } : p,
    );
    update({ properties });
  };

  // ── Relations ───────────────────────────────────────────────────────────
  const updateRelation = (index: number, patch: Partial<BDSchemaRelation>) => {
    const relations = draft.relations.map((r, i) =>
      i === index ? { ...r, ...patch } : r,
    );
    update({ relations });
  };

  // ── Indexes ─────────────────────────────────────────────────────────────
  const updateIndex = (index: number, patch: Partial<BDSchemaIndex>) => {
    const indexes = draft.indexes.map((x, i) =>
      i === index ? { ...x, ...patch } : x,
    );
    update({ indexes });
  };

  const relationTargets = allModels.filter((m) => m.id !== draft.id);

  return (
    <BDDrawer
      open={open}
      onClose={onClose}
      width="46rem"
      title={draft.name || "Model"}
      description={draft.table}
      footer={
        <>
          <BDButton variant="danger" icon={Trash2} onClick={onDelete}>
            Delete model
          </BDButton>
          <div className="flex-1" />
          <BDButton variant="ghost" onClick={onClose}>
            Close
          </BDButton>
          <BDButton
            icon={Save}
            isLoading={isSaving}
            onClick={() => onSave(draft)}
          >
            Save model
          </BDButton>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <BDForm
          fields={MODEL_FIELDS}
          value={form as unknown as Record<string, unknown>}
          onChange={handleFormChange}
        />

        {/* Properties */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">
              Columns ({draft.properties.length})
            </h3>
            <BDButton
              size="sm"
              variant="secondary"
              icon={Plus}
              onClick={() =>
                update({ properties: [...draft.properties, createDefaultProperty()] })
              }
            >
              Add column
            </BDButton>
          </div>
          <div className="bd-scroll overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full border-collapse text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-2 py-1.5 text-left">Name</th>
                  <th className="px-2 py-1.5 text-left">Type</th>
                  <th className="px-2 py-1.5">Null</th>
                  <th className="px-2 py-1.5">PK</th>
                  <th className="px-2 py-1.5">Uq</th>
                  <th className="px-2 py-1.5 text-left">Default</th>
                  <th className="px-2 py-1.5" />
                </tr>
              </thead>
              <tbody>
                {draft.properties.map((property, index) => (
                  <tr key={index} className="border-t border-slate-100">
                    <td className="px-2 py-1">
                      <input
                        className={CELL}
                        value={property.name}
                        onChange={(e) =>
                          updateProperty(index, { name: e.target.value })
                        }
                      />
                    </td>
                    <td className="px-2 py-1">
                      <select
                        className={CELL}
                        value={property.type}
                        onChange={(e) =>
                          updateProperty(index, {
                            type: e.target.value as BDSchemaProperty["type"],
                          })
                        }
                      >
                        {BD_SCHEMA_TYPE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1 text-center">
                      <input
                        type="checkbox"
                        checked={property.nullable}
                        onChange={(e) =>
                          updateProperty(index, { nullable: e.target.checked })
                        }
                      />
                    </td>
                    <td className="px-2 py-1 text-center">
                      <input
                        type="checkbox"
                        checked={!!property.primary}
                        onChange={(e) => {
                          updateProperty(index, {
                            primary: e.target.checked,
                            nullable: e.target.checked
                              ? false
                              : property.nullable,
                          });
                          if (e.target.checked) {
                            update({
                              primaryKey: [property.name],
                              properties: draft.properties.map((p, i) =>
                                i === index
                                  ? { ...p, primary: true, nullable: false }
                                  : p,
                              ),
                            });
                          }
                        }}
                      />
                    </td>
                    <td className="px-2 py-1 text-center">
                      <input
                        type="checkbox"
                        checked={!!property.unique}
                        onChange={(e) =>
                          updateProperty(index, { unique: e.target.checked })
                        }
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        className={CELL}
                        value={
                          property.default === undefined
                            ? ""
                            : String(property.default)
                        }
                        onChange={(e) =>
                          updateProperty(index, {
                            default: e.target.value === "" ? undefined : e.target.value,
                          })
                        }
                      />
                    </td>
                    <td className="px-2 py-1 text-right">
                      <button
                        type="button"
                        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
                        onClick={() =>
                          update({
                            properties: draft.properties.filter(
                              (_, i) => i !== index,
                            ),
                          })
                        }
                        aria-label="Remove column"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Relations */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">
              Relations ({draft.relations.length})
            </h3>
            <BDButton
              size="sm"
              variant="secondary"
              icon={Plus}
              onClick={() =>
                update({ relations: [...draft.relations, createDefaultRelation()] })
              }
            >
              Add relation
            </BDButton>
          </div>
          {draft.relations.length === 0 ? (
            <p className="text-xs text-slate-400">No relations.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {draft.relations.map((relation, index) => (
                <div
                  key={index}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 p-2"
                >
                  <input
                    className={CELL}
                    placeholder="name"
                    value={relation.name}
                    onChange={(e) =>
                      updateRelation(index, { name: e.target.value })
                    }
                  />
                  <select
                    className={CELL}
                    value={relation.type}
                    onChange={(e) =>
                      updateRelation(index, {
                        type: e.target.value as BDSchemaRelation["type"],
                      })
                    }
                  >
                    {[
                      "belongsTo",
                      "hasOne",
                      "hasMany",
                      "belongsToMany",
                      "hasManyThrough",
                      "morphOne",
                      "morphMany",
                      "morphTo",
                    ].map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <select
                    className={CELL}
                    value={relation.targetModelId}
                    onChange={(e) =>
                      updateRelation(index, { targetModelId: e.target.value })
                    }
                  >
                    <option value="">Target…</option>
                    {relationTargets.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                  <input
                    className={CELL}
                    placeholder="foreign key"
                    value={relation.foreignKey ?? ""}
                    onChange={(e) =>
                      updateRelation(index, {
                        foreignKey: e.target.value || undefined,
                      })
                    }
                  />
                  <button
                    type="button"
                    className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
                    onClick={() =>
                      update({
                        relations: draft.relations.filter((_, i) => i !== index),
                      })
                    }
                    aria-label="Remove relation"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Indexes */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">
              Indexes ({draft.indexes.length})
            </h3>
            <BDButton
              size="sm"
              variant="secondary"
              icon={Plus}
              onClick={() =>
                update({ indexes: [...draft.indexes, createDefaultIndex()] })
              }
            >
              Add index
            </BDButton>
          </div>
          {draft.indexes.length === 0 ? (
            <p className="text-xs text-slate-400">No indexes.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {draft.indexes.map((index, i) => (
                <div
                  key={i}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 p-2"
                >
                  <input
                    className={CELL}
                    placeholder="columns (comma separated)"
                    value={index.columns.join(", ")}
                    onChange={(e) =>
                      updateIndex(i, {
                        columns: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                  <select
                    className={CELL}
                    value={index.type}
                    onChange={(e) =>
                      updateIndex(i, {
                        type: e.target.value as BDSchemaIndex["type"],
                      })
                    }
                  >
                    {BD_SCHEMA_INDEX_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
                    onClick={() =>
                      update({
                        indexes: draft.indexes.filter((_, idx) => idx !== i),
                      })
                    }
                    aria-label="Remove index"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
          Table name suggestion:{" "}
          <strong>{slugifyTable(form.name || "model")}</strong>
        </div>
      </div>
    </BDDrawer>
  );
}

export default BDSchemaModelComponent;
