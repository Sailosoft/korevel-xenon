"use client";

// BDAppResource.Component — modal editor for one app resource: identity,
// form fields, and table columns.

import { useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import type {
  BDAppConnection,
  BDAppConnectionType,
  BDAppField,
  BDAppResource,
  BDSchemaModel,
} from "../../BDDomain.Types";
import { collectAppFields, createAppConnection } from "./BDApp.Types";
import BDAppFormComponent from "./BDAppForm.Component";
import BDAppTableComponent from "./BDAppTable.Component";
import BDModal from "../../components/BDModal";
import BDButton from "../../components/BDButton";

export interface BDAppResourceComponentProps {
  open: boolean;
  resource: BDAppResource | null;
  models: BDSchemaModel[];
  /** Sibling resources in the same app (connection targets). */
  resources: BDAppResource[];
  isSaving?: boolean;
  onClose: () => void;
  onSave: (resource: BDAppResource) => void;
  onDelete: () => void;
}

const CELL =
  "w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-blue-400";

const CONNECTION_TYPES: BDAppConnectionType[] = [
  "oneToOne",
  "oneToMany",
  "manyToMany",
];

export function BDAppResourceComponent({
  open,
  resource,
  models,
  resources,
  isSaving,
  onClose,
  onSave,
  onDelete,
}: BDAppResourceComponentProps) {
  const [draft, setDraft] = useState<BDAppResource | null>(resource);

  const drawerKey = `${open}:${resource?.slug ?? "none"}`;
  const [prevKey, setPrevKey] = useState(drawerKey);
  if (drawerKey !== prevKey) {
    setPrevKey(drawerKey);
    setDraft(resource);
  }

  if (!draft) {
    return (
      <BDModal open={open} onClose={onClose} title="Resource">
        <p className="text-sm text-slate-500">Select a resource to edit.</p>
      </BDModal>
    );
  }

  const fields = collectAppFields(draft.form?.components);
  const columns = draft.table?.columns ?? [];
  const connections = draft.connections ?? [];

  const update = (patch: Partial<BDAppResource>) =>
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));

  const setFields = (next: BDAppField[]) =>
    update({ form: { components: next } });

  const setConnections = (next: BDAppConnection[]) =>
    update({ connections: next });

  const updateConnection = (index: number, patch: Partial<BDAppConnection>) =>
    setConnections(
      connections.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    );

  const addConnection = () => {
    const target =
      resources.find((r) => r.slug !== draft.slug) ?? resources[0];
    setConnections([
      ...connections,
      createAppConnection({
        name: `connection_${connections.length + 1}`,
        targetSlug: target?.slug ?? "",
        foreignKey: undefined,
      }),
    ]);
  };

  const duplicateNames = new Set(
    connections
      .map((c) => c.name.trim())
      .filter((name, index, all) => all.indexOf(name) !== index),
  );

  return (
    <BDModal
      open={open}
      onClose={onClose}
      size="lg"
      title={draft.label ?? draft.name}
      description={draft.slug}
      footer={
        <>
          <BDButton variant="danger" icon={Trash2} onClick={onDelete}>
            Delete resource
          </BDButton>
          <div className="flex-1" />
          <BDButton variant="ghost" onClick={onClose}>
            Close
          </BDButton>
          <BDButton icon={Save} isLoading={isSaving} onClick={() => onSave(draft)}>
            Save resource
          </BDButton>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">Name</span>
            <input
              className={CELL}
              value={draft.name}
              onChange={(e) => update({ name: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">Slug</span>
            <input
              className={CELL}
              value={draft.slug}
              onChange={(e) => update({ slug: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">Label</span>
            <input
              className={CELL}
              value={draft.label ?? ""}
              onChange={(e) => update({ label: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">
              Plural label
            </span>
            <input
              className={CELL}
              value={draft.pluralLabel ?? ""}
              onChange={(e) => update({ pluralLabel: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="text-xs font-medium text-slate-600">
              Schema model
            </span>
            <select
              className={CELL}
              value={draft.modelId ?? ""}
              onChange={(e) =>
                update({ modelId: e.target.value || undefined })
              }
            >
              <option value="">None</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <BDAppFormComponent
          fields={fields}
          models={models}
          onChange={setFields}
        />

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">
              Connections ({connections.length})
            </h3>
            <BDButton
              size="sm"
              variant="secondary"
              icon={Plus}
              onClick={addConnection}
            >
              Add connection
            </BDButton>
          </div>
          {connections.length === 0 ? (
            <p className="text-xs text-slate-400">
              No connections. One-to-one/many-to-many render a select; one-to-many
              renders a child table on this resource&apos;s view.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {connections.map((connection, index) => (
                <div
                  key={index}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 p-2"
                >
                  <input
                    className={`${CELL} w-32`}
                    placeholder="name"
                    value={connection.name}
                    onChange={(e) =>
                      updateConnection(index, { name: e.target.value })
                    }
                  />
                  <select
                    className={CELL}
                    value={connection.type}
                    onChange={(e) =>
                      updateConnection(index, {
                        type: e.target.value as BDAppConnectionType,
                      })
                    }
                  >
                    {CONNECTION_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  <select
                    className={CELL}
                    value={connection.targetSlug}
                    onChange={(e) =>
                      updateConnection(index, { targetSlug: e.target.value })
                    }
                  >
                    <option value="">Target resource…</option>
                    {resources.map((r) => (
                      <option key={r.slug} value={r.slug}>
                        {r.label ?? r.name}
                        {r.slug === draft.slug ? " (self)" : ""}
                      </option>
                    ))}
                  </select>
                  <input
                    className={`${CELL} w-28`}
                    placeholder="title attr"
                    value={connection.titleAttribute ?? ""}
                    onChange={(e) =>
                      updateConnection(index, {
                        titleAttribute: e.target.value || undefined,
                      })
                    }
                  />
                  {connection.type === "oneToMany" && (
                    <input
                      className={`${CELL} w-32`}
                      placeholder="child fk"
                      value={connection.foreignKey ?? ""}
                      onChange={(e) =>
                        updateConnection(index, {
                          foreignKey: e.target.value || undefined,
                        })
                      }
                    />
                  )}
                  <button
                    type="button"
                    className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
                    onClick={() =>
                      setConnections(
                        connections.filter((_, i) => i !== index),
                      )
                    }
                    aria-label="Remove connection"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {duplicateNames.size > 0 && (
                <p className="text-xs text-red-500">
                  Duplicate connection names: {[...duplicateNames].join(", ")}
                </p>
              )}
            </div>
          )}
        </section>

        <BDAppTableComponent
          columns={columns}
          models={models}
          onChange={(next) =>
            update({ table: { ...draft.table, columns: next } })
          }
        />
      </div>
    </BDModal>
  );
}

export default BDAppResourceComponent;
