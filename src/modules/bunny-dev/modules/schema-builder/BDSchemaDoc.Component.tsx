"use client";

// BDSchemaDoc.Component — read-only, documentation-style view of one schema
// group: every model with its columns, relations, indexes, and table options.

import { Database } from "lucide-react";
import type { BDSchemaGroup, BDSchemaModel } from "../../BDDomain.Types";
import BDBadge from "../../components/BDBadge";
import BDEmptyState from "../../components/BDEmptyState";
import BDModal from "../../components/BDModal";

export interface BDSchemaDocComponentProps {
  open: boolean;
  onClose: () => void;
  group: BDSchemaGroup | null;
  models: BDSchemaModel[];
}

export function BDSchemaDocComponent({
  open,
  onClose,
  group,
  models,
}: BDSchemaDocComponentProps) {
  const byId = new Map(models.map((model) => [model.id, model]));
  const totalColumns = models.reduce(
    (count, model) => count + model.properties.length,
    0,
  );
  const totalRelations = models.reduce(
    (count, model) => count + model.relations.length,
    0,
  );
  const totalIndexes = models.reduce(
    (count, model) => count + model.indexes.length,
    0,
  );

  return (
    <BDModal
      open={open}
      onClose={onClose}
      size="xl"
      title={`Schema${group ? ` — ${group.name}` : ""}`}
      description={
        group?.description ||
        "Documented view of this schema group's models and their relationships."
      }
    >
      {models.length === 0 ? (
        <BDEmptyState
          icon={Database}
          title="No models to document"
          description="Add at least one model to this group to see its schema documentation."
        />
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <BDBadge color="primary">{models.length} models</BDBadge>
            <BDBadge color="info">{totalColumns} columns</BDBadge>
            <BDBadge color="success">{totalRelations} relations</BDBadge>
            <BDBadge color="gray">{totalIndexes} indexes</BDBadge>
          </div>

          {models.map((model) => (
            <section
              key={model.id}
              className="overflow-hidden rounded-xl border border-slate-200"
            >
              <header className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">
                    {model.name || "Untitled model"}
                  </h3>
                  <p className="font-mono text-xs text-slate-500">
                    {model.table || "no table name"}
                  </p>
                  {model.description ? (
                    <p className="mt-1 max-w-2xl text-xs text-slate-500">
                      {model.description}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <BDBadge>{model.properties.length} columns</BDBadge>
                  <BDBadge>{model.relations.length} relations</BDBadge>
                  <BDBadge>{model.indexes.length} indexes</BDBadge>
                </div>
              </header>

              <div className="flex flex-col gap-3 px-4 py-3">
                <div>
                  <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Columns
                  </h4>
                  {model.properties.length === 0 ? (
                    <p className="text-xs text-slate-400">No columns.</p>
                  ) : (
                    <div className="bd-scroll overflow-x-auto rounded-lg border border-slate-200">
                      <table className="w-full border-collapse text-xs">
                        <thead className="bg-slate-50 text-left text-slate-500">
                          <tr>
                            <th className="px-2 py-1.5 font-medium">Column</th>
                            <th className="px-2 py-1.5 font-medium">Type</th>
                            <th className="px-2 py-1.5 font-medium">Nullable</th>
                            <th className="px-2 py-1.5 font-medium">Keys</th>
                            <th className="px-2 py-1.5 font-medium">Default</th>
                            <th className="px-2 py-1.5 font-medium">Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {model.properties.map((property, index) => {
                            const isPrimary =
                              property.primary ||
                              model.primaryKey.includes(property.name);
                            return (
                              <tr
                                key={`${property.name}-${index}`}
                                className="border-t border-slate-100"
                              >
                                <td className="px-2 py-1.5 font-mono text-slate-800">
                                  {property.name || "—"}
                                </td>
                                <td className="px-2 py-1.5 text-slate-600">
                                  {property.type}
                                </td>
                                <td className="px-2 py-1.5 text-slate-600">
                                  {property.nullable ? "yes" : "no"}
                                </td>
                                <td className="px-2 py-1.5">
                                  <div className="flex flex-wrap gap-1">
                                    {isPrimary ? (
                                      <BDBadge color="primary">PK</BDBadge>
                                    ) : null}
                                    {property.unique ? (
                                      <BDBadge color="info">UQ</BDBadge>
                                    ) : null}
                                    {!isPrimary && !property.unique ? (
                                      <span className="text-slate-400">—</span>
                                    ) : null}
                                  </div>
                                </td>
                                <td className="px-2 py-1.5 font-mono text-slate-600">
                                  {property.default === undefined
                                    ? "—"
                                    : String(property.default)}
                                </td>
                                <td className="px-2 py-1.5 text-slate-500">
                                  {property.comment || "—"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Relations
                    </h4>
                    {model.relations.length === 0 ? (
                      <p className="text-xs text-slate-400">No relations.</p>
                    ) : (
                      <ul className="flex flex-col gap-1.5">
                        {model.relations.map((relation, index) => {
                          const target = byId.get(relation.targetModelId);
                          return (
                            <li
                              key={`${relation.name}-${index}`}
                              className="rounded-lg border border-slate-200 px-2.5 py-2 text-xs"
                            >
                              <div className="flex flex-wrap items-center gap-1.5">
                                <BDBadge color="success">
                                  {relation.type}
                                </BDBadge>
                                <span className="font-mono text-slate-800">
                                  {relation.name || "(unnamed)"}
                                </span>
                                <span className="text-slate-500">
                                  → {target?.name || "Unknown model"}
                                </span>
                              </div>
                              <p className="mt-1 font-mono text-[11px] text-slate-500">
                                {target?.name || "target"}.
                                {relation.ownerKey || "?"} ←{" "}
                                {model.name || "this"}.{" "}
                                {relation.foreignKey || "?"}
                              </p>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>

                  <div>
                    <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Indexes
                    </h4>
                    {model.indexes.length === 0 ? (
                      <p className="text-xs text-slate-400">No indexes.</p>
                    ) : (
                      <ul className="flex flex-col gap-1.5">
                        {model.indexes.map((schemaIndex, index) => (
                          <li
                            key={`${schemaIndex.name ?? "index"}-${index}`}
                            className="rounded-lg border border-slate-200 px-2.5 py-2 text-xs"
                          >
                            <div className="flex flex-wrap items-center gap-1.5">
                              <BDBadge color="warning">
                                {schemaIndex.type}
                              </BDBadge>
                              <span className="font-mono text-slate-800">
                                {schemaIndex.name || `index_${index + 1}`}
                              </span>
                            </div>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {schemaIndex.columns.length === 0 ? (
                                <span className="text-slate-400">
                                  No columns
                                </span>
                              ) : (
                                schemaIndex.columns.map((column) => (
                                  <span
                                    key={column}
                                    className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600"
                                  >
                                    {column}
                                  </span>
                                ))
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {model.timestamps || model.softDeletes ? (
                  <p className="text-[11px] text-slate-400">
                    {model.timestamps
                      ? "Timestamps: createdAt, updatedAt."
                      : ""}
                    {model.timestamps && model.softDeletes ? " " : ""}
                    {model.softDeletes ? "Soft deletes: deletedAt." : ""}
                  </p>
                ) : null}
              </div>
            </section>
          ))}
        </div>
      )}
    </BDModal>
  );
}

export default BDSchemaDocComponent;
