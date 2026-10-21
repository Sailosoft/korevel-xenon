"use client";

// BDSchemaModel.Component — modal editor for one schema model: columns,
// relations, and indexes. Edits a local draft and saves the whole model.

import { useState } from "react";
import { Plus, Trash2, Save, Sparkles, Link2, Pencil } from "lucide-react";
import type {
  BDSchemaModel,
  BDSchemaProperty,
  BDSchemaRelation,
  BDSchemaIndex,
} from "../../BDDomain.Types";
import {
  BD_SCHEMA_TYPE_OPTIONS,
  slugifyTable,
  buildRelationColumn,
  suggestRelationName,
  suggestForeignKey,
  createDefaultProperty,
  createDefaultRelation,
  toModelForm,
  type BDSchemaInverseRelationRequest,
  type BDSchemaModelForm,
} from "./BDSchemaBuilder.Types";
import BDModal from "../../components/BDModal";
import BDButton from "../../components/BDButton";
import BDBadge from "../../components/BDBadge";
import BDForm from "../../components/BDForm";
import BDSchemaRelationColumnComponent from "./BDSchemaRelationColumn.Component";
import BDSchemaIndexComponent from "./BDSchemaIndex.Component";

export interface BDSchemaModelComponentProps {
  open: boolean;
  model: BDSchemaModel | null;
  allModels: BDSchemaModel[];
  isSaving?: boolean;
  onClose: () => void;
  onSave: (
    model: BDSchemaModel,
    inverseRequests?: BDSchemaInverseRelationRequest[],
  ) => Promise<boolean>;
}

const CELL = "rounded border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-blue-400";

const MODEL_FIELDS = [
  {
    name: "name",
    label: "Model name",
    type: "text" as const,
    required: true,
    placeholder: "e.g. User",
  },
  {
    name: "table",
    label: "Table",
    type: "text" as const,
    placeholder: "e.g. users",
  },
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
}: BDSchemaModelComponentProps) {
  const [draft, setDraft] = useState<BDSchemaModel | null>(model);
  const [form, setForm] = useState<BDSchemaModelForm | null>(
    model ? toModelForm(model) : null,
  );
  // The table name follows the model name while it is still blank; a table
  // that already exists is never overwritten by a rename.
  const [tableTouched, setTableTouched] = useState(!!model?.table);
  const [relationColumnOpen, setRelationColumnOpen] = useState(false);
  const [pendingInverses, setPendingInverses] = useState<
    BDSchemaInverseRelationRequest[]
  >([]);
  const [indexEditor, setIndexEditor] = useState<{
    open: boolean;
    index: BDSchemaIndex | null;
    editIndex: number | null;
  }>({ open: false, index: null, editIndex: null });

  // Load the selected model into the local draft when the drawer opens or the
  // target changes (render-time adjustment, not a setState-in-effect).
  const drawerKey = `${open}:${model?.id ?? "none"}`;
  const [prevKey, setPrevKey] = useState(drawerKey);
  if (drawerKey !== prevKey) {
    setPrevKey(drawerKey);
    setDraft(model);
    setForm(model ? toModelForm(model) : null);
    setTableTouched(!!model?.table);
    setRelationColumnOpen(false);
    setPendingInverses([]);
    setIndexEditor({ open: false, index: null, editIndex: null });
  }

  if (!draft || !form) {
    return (
      <BDModal open={open} onClose={onClose} title="Model">
        <p className="text-sm text-slate-500">Select a model to edit.</p>
      </BDModal>
    );
  }

  const update = (patch: Partial<BDSchemaModel>) =>
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));

  const handleFormChange = (values: Record<string, unknown>) => {
    const next = { ...(values as unknown as BDSchemaModelForm) };
    if (next.table !== form.table) {
      setTableTouched(true);
    } else if (!tableTouched && next.name !== form.name) {
      next.table = next.name.trim() ? slugifyTable(next.name) : "";
    }
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
  const closeIndexEditor = () =>
    setIndexEditor({ open: false, index: null, editIndex: null });

  const saveIndex = (next: BDSchemaIndex) => {
    if (indexEditor.editIndex === null) {
      update({ indexes: [...draft.indexes, next] });
    } else {
      update({
        indexes: draft.indexes.map((entry, index) =>
          index === indexEditor.editIndex ? next : entry,
        ),
      });
    }
    closeIndexEditor();
  };

  // Relations are always resolved inside the current schema group. A model may
  // point at itself (self reference), so the edited model stays selectable.
  const relationTargets = allModels.filter((m) => m.groupId === draft.groupId);
  const modelById = new Map(allModels.map((m) => [m.id, m]));
  const ownColumns = draft.properties.map((p) => p.name);

  const columnsOf = (targetModelId: string): string[] =>
    modelById.get(targetModelId)?.properties.map((p) => p.name) ?? [];

  /** Preferred referenced column on the target: primary key, else first column. */
  const defaultOwnerKey = (target: BDSchemaModel | undefined): string => {
    if (!target) return "";
    const declared = target.primaryKey?.[0];
    if (declared && target.properties.some((p) => p.name === declared)) {
      return declared;
    }
    const primary = target.properties.find((p) => p.primary);
    return primary?.name ?? target.properties[0]?.name ?? "";
  };

  // Relation name, referenced key, and foreign key derive from the target model.
  const applyRelationSuggestion = (index: number) => {
    const relation = draft.relations[index];
    const target = modelById.get(relation.targetModelId);
    if (!target) return;
    updateRelation(index, {
      name: suggestRelationName(relation.type, target.name),
      ownerKey: relation.ownerKey || defaultOwnerKey(target),
      foreignKey: suggestForeignKey(target.name),
    });
  };

  const addRelationColumn = (target: BDSchemaModel) => {
    const built = buildRelationColumn(draft, target);
    if (!built) return;
    update({
      properties: [...draft.properties, built.property],
      relations: [...draft.relations, built.relation],
    });
    setPendingInverses((prev) =>
      prev.some(
        (request) =>
          request.targetModelId === target.id &&
          request.foreignKey === built.property.name,
      )
        ? prev
        : [
            ...prev,
            {
              targetModelId: target.id,
              foreignKey: built.property.name,
            },
          ],
    );
    setRelationColumnOpen(false);
  };

  const removeRelation = (index: number) => {
    const relation = draft.relations[index];
    update({
      relations: draft.relations.filter((_, position) => position !== index),
    });
    if (relation.foreignKey) {
      setPendingInverses((prev) =>
        prev.filter(
          (request) =>
            !(
              request.targetModelId === relation.targetModelId &&
              request.foreignKey === relation.foreignKey
            ),
        ),
      );
    }
  };

  const handleSave = async () => {
    const ok = await onSave(draft, pendingInverses);
    if (ok) setPendingInverses([]);
  };

  return (
    <BDModal
      open={open}
      onClose={onClose}
      size="lg"
      closeOnBackdrop={false}
      closeOnEscape={!relationColumnOpen && !indexEditor.open}
      title={draft.name || (draft.id ? "Model" : "New model")}
      description={draft.table}
      footer={
        <>
          <div className="flex-1" />
          <BDButton variant="ghost" onClick={onClose}>
            Close
          </BDButton>
          <BDButton
            icon={Save}
            isLoading={isSaving}
            onClick={() => void handleSave()}
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
            <div className="flex items-center gap-2">
              <BDButton
                size="sm"
                variant="secondary"
                icon={Link2}
                onClick={() => setRelationColumnOpen(true)}
              >
                Add relation column
              </BDButton>
              <BDButton
                size="sm"
                variant="secondary"
                icon={Plus}
                onClick={() =>
                  update({
                    properties: [
                      ...draft.properties,
                      createDefaultProperty(),
                    ],
                  })
                }
              >
                Add column
              </BDButton>
            </div>
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
                        placeholder="name"
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
            <div className="bd-scroll overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[860px] border-collapse text-xs">
                <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-2 py-1.5 font-medium">Type</th>
                    <th className="px-2 py-1.5 font-medium">Target model</th>
                    <th className="px-2 py-1.5 font-medium">Name</th>
                    <th className="px-2 py-1.5 font-medium">References</th>
                    <th className="px-2 py-1.5 font-medium">Foreign key</th>
                    <th className="w-px px-2 py-1.5 text-right font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {draft.relations.map((relation, index) => {
                    const target = modelById.get(relation.targetModelId);
                    const targetColumns = columnsOf(relation.targetModelId);
                    const ownerKeyOptions =
                      relation.ownerKey &&
                      !targetColumns.includes(relation.ownerKey)
                        ? [relation.ownerKey, ...targetColumns]
                        : targetColumns;
                    const fkOptions =
                      relation.foreignKey &&
                      !ownColumns.includes(relation.foreignKey)
                        ? [relation.foreignKey, ...ownColumns]
                        : ownColumns;
                    return (
                      <tr
                        key={index}
                        className="border-t border-slate-100 align-top"
                      >
                        <td className="px-2 py-1.5">
                          <select
                            className={`${CELL} w-full`}
                            value={relation.type}
                            onChange={(e) =>
                              updateRelation(index, {
                                type: e.target
                                  .value as BDSchemaRelation["type"],
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
                            ].map((type) => (
                              <option key={type} value={type}>
                                {type}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-1.5">
                          <select
                            className={`${CELL} w-full min-w-[140px]`}
                            value={relation.targetModelId}
                            onChange={(e) => {
                              const targetModelId = e.target.value;
                              const nextTarget = modelById.get(targetModelId);
                              const nextColumns = nextTarget
                                ? nextTarget.properties.map((p) => p.name)
                                : [];
                              updateRelation(index, {
                                targetModelId,
                                name: relation.name.trim()
                                  ? relation.name
                                  : nextTarget
                                    ? suggestRelationName(
                                        relation.type,
                                        nextTarget.name,
                                      )
                                    : "",
                                ownerKey:
                                  relation.ownerKey &&
                                  nextColumns.includes(relation.ownerKey)
                                    ? relation.ownerKey
                                    : nextTarget
                                      ? defaultOwnerKey(nextTarget)
                                      : undefined,
                                foreignKey: relation.foreignKey
                                  ? relation.foreignKey
                                  : nextTarget
                                    ? suggestForeignKey(nextTarget.name)
                                    : undefined,
                              });
                            }}
                          >
                            <option value="">Target model…</option>
                            {relation.targetModelId &&
                            target &&
                            !relationTargets.some(
                              (model) => model.id === relation.targetModelId,
                            ) ? (
                              <option value={relation.targetModelId}>
                                {target.name || "Untitled model"} (other group)
                              </option>
                            ) : null}
                            {relationTargets.map((model) => (
                              <option key={model.id} value={model.id}>
                                {model.id === draft.id
                                  ? `${model.name || "Untitled model"} (this model)`
                                  : model.name || "Untitled model"}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-1.5">
                          <div className="flex items-center gap-1">
                            <input
                              className={`${CELL} w-full min-w-[120px]`}
                              placeholder="name"
                              value={relation.name}
                              onChange={(e) =>
                                updateRelation(index, {
                                  name: e.target.value,
                                })
                              }
                            />
                            <BDButton
                              size="sm"
                              variant="ghost"
                              icon={Sparkles}
                              title="Suggest name, referenced key, and foreign key"
                              aria-label="Suggest name, referenced key, and foreign key"
                              onClick={() => applyRelationSuggestion(index)}
                            />
                          </div>
                        </td>
                        <td className="px-2 py-1.5">
                          <select
                            className={`${CELL} w-full min-w-[120px]`}
                            value={relation.ownerKey ?? ""}
                            disabled={!target}
                            onChange={(e) =>
                              updateRelation(index, {
                                ownerKey: e.target.value || undefined,
                              })
                            }
                          >
                            <option value="">
                              {target
                                ? targetColumns.length
                                  ? `${target.name || "Target"} key…`
                                  : "No columns in target"
                                : "Select a target first"}
                            </option>
                            {ownerKeyOptions.map((column) => (
                              <option key={column} value={column}>
                                {column}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-1.5">
                          <select
                            className={`${CELL} w-full min-w-[120px]`}
                            value={relation.foreignKey ?? ""}
                            disabled={ownColumns.length === 0}
                            onChange={(e) =>
                              updateRelation(index, {
                                foreignKey: e.target.value || undefined,
                              })
                            }
                          >
                            <option value="">
                              {ownColumns.length
                                ? `${draft.name || "This model"} column…`
                                : "No columns in this model"}
                            </option>
                            {fkOptions.map((column) => (
                              <option key={column} value={column}>
                                {column}
                              </option>
                            ))}
                          </select>
                          {target ? (
                            <p
                              className="mt-1 truncate text-[10px] text-slate-400"
                              title={`${target.name || "target"}.${relation.ownerKey || "?"} ← ${draft.name || "this"}.${relation.foreignKey || "?"}`}
                            >
                              {target.name || "target"}.
                              {relation.ownerKey || "?"} ←{" "}
                              {draft.name || "this"}.
                              {relation.foreignKey || "?"}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          <button
                            type="button"
                            className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
                            onClick={() => removeRelation(index)}
                            aria-label="Remove relation"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
                setIndexEditor({ open: true, index: null, editIndex: null })
              }
            >
              Add index
            </BDButton>
          </div>
          {draft.indexes.length === 0 ? (
            <p className="text-xs text-slate-400">No indexes.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {draft.indexes.map((index, position) => (
                <div
                  key={position}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 p-2"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-slate-700">
                        {index.name || `Index ${position + 1}`}
                      </span>
                      <BDBadge color="warning">{index.type}</BDBadge>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {index.columns.length === 0 ? (
                        <span className="text-[11px] text-slate-400">
                          No columns
                        </span>
                      ) : (
                        index.columns.map((column) => (
                          <span
                            key={column}
                            className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600"
                          >
                            {column}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <BDButton
                      size="sm"
                      variant="ghost"
                      icon={Pencil}
                      aria-label="Edit index"
                      title="Edit index"
                      onClick={() =>
                        setIndexEditor({
                          open: true,
                          index,
                          editIndex: position,
                        })
                      }
                    />
                    <button
                      type="button"
                      className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
                      onClick={() =>
                        update({
                          indexes: draft.indexes.filter(
                            (_, idx) => idx !== position,
                          ),
                        })
                      }
                      aria-label="Remove index"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <BDSchemaRelationColumnComponent
          open={relationColumnOpen}
          draft={draft}
          models={relationTargets}
          onClose={() => setRelationColumnOpen(false)}
          onAdd={addRelationColumn}
        />

        <BDSchemaIndexComponent
          open={indexEditor.open}
          index={indexEditor.index}
          columns={ownColumns.filter((column) => column.trim())}
          onClose={closeIndexEditor}
          onSave={saveIndex}
        />
      </div>
    </BDModal>
  );
}

export default BDSchemaModelComponent;
