"use client";

// BDAppResource.Component — modal editor for one app resource: identity,
// form fields, and table columns. Also supports create mode (isNew) where the
// resource is only committed when the parent handles onSave.

import { useState } from "react";
import { Plus, Save, Trash2, Wand2, Sparkles } from "lucide-react";
import type {
  BDAppConnection,
  BDAppConnectionType,
  BDAppField,
  BDAppFormBehavior,
  BDAppResource,
  BDSchemaModel,
} from "../../BDDomain.Types";
import {
  BD_APP_FORM_BEHAVIOR_OPTIONS,
  collectAppFields,
  createAppConnection,
  columnFromDraft,
  connectionFromDraft,
  deriveResourceIdentity,
  fieldFromDraft,
} from "./BDApp.Types";
import type {
  BDAppResourceAISections,
  BDAppResourceDraft,
  BDAppResourceRef,
} from "./BDApp.Types";
import BDAppFormComponent from "./BDAppForm.Component";
import BDAppTableComponent from "./BDAppTable.Component";
import BDAppFillerComponent from "./BDAppFiller.Component";
import BDAppResourceAIComponent from "./BDAppResourceAI.Component";
import BDModal from "../../components/BDModal";
import BDButton from "../../components/BDButton";

export interface BDAppResourceComponentProps {
  open: boolean;
  resource: BDAppResource | null;
  models: BDSchemaModel[];
  /** Sibling resources in the same app (connection targets). */
  resources: BDAppResource[];
  /** True when creating a new resource (nothing committed until onSave). */
  isNew?: boolean;
  /** Changes when the edited resource changes, to reinitialize the draft. */
  resetToken?: string | number;
  projectId: string;
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
  isNew = false,
  resetToken,
  projectId,
  isSaving,
  onClose,
  onSave,
  onDelete,
}: BDAppResourceComponentProps) {
  const [draft, setDraft] = useState<BDAppResource | null>(resource);
  const [fillerOpen, setFillerOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  const drawerKey = `${open}:${resetToken ?? resource?.slug ?? "none"}`;
  const [prevKey, setPrevKey] = useState(drawerKey);
  if (drawerKey !== prevKey) {
    setPrevKey(drawerKey);
    setDraft(resource);
    setFillerOpen(false);
    setAiOpen(false);
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

  const applyIdentityFiller = (name: string) => {
    update(deriveResourceIdentity(name));
  };

  const applyAIDraft = (
    draftResource: BDAppResourceDraft,
    sections: BDAppResourceAISections,
  ) => {
    const patch: Partial<BDAppResource> = {};

    if (sections.meta) {
      const identity = draftResource.name
        ? deriveResourceIdentity(draftResource.name)
        : undefined;
      patch.name = draftResource.name || draft.name;
      patch.slug = draftResource.slug ?? identity?.slug ?? draft.slug;
      patch.label = draftResource.label ?? identity?.label ?? draft.label;
      patch.pluralLabel =
        draftResource.pluralLabel ?? identity?.pluralLabel ?? draft.pluralLabel;
      if (draftResource.model) {
        const model = models.find((m) => m.name === draftResource.model);
        if (model) patch.modelId = model.id;
      }
    }

    if (sections.form) {
      patch.form = {
        components: (draftResource.fields ?? []).map(fieldFromDraft),
      };
    }

    if (sections.table) {
      patch.table = {
        ...(draft.table ?? { columns: [] }),
        columns: (draftResource.columns ?? []).map(columnFromDraft),
      };
    }

    if (sections.connections) {
      const refs: BDAppResourceRef[] = resources.map((r) => ({
        name: r.name,
        slug: r.slug,
      }));
      const next = (draftResource.connections ?? [])
        .map((c) => connectionFromDraft(c, refs))
        .filter((c): c is BDAppConnection => c !== null);
      patch.connections = next;
    }

    update(patch);
  };

  const duplicateNames = new Set(
    connections
      .map((c) => c.name.trim())
      .filter((name, index, all) => all.indexOf(name) !== index),
  );

  const title = isNew ? "New resource" : draft.label ?? draft.name;

  return (
    <>
      <BDModal
        open={open}
        onClose={onClose}
        size="lg"
        title={title}
        description={isNew ? undefined : draft.slug || undefined}
        footer={
          <>
            {!isNew && (
              <BDButton variant="danger" icon={Trash2} onClick={onDelete}>
                Delete resource
              </BDButton>
            )}
            <div className="flex-1" />
            <BDButton variant="ghost" onClick={onClose}>
              Close
            </BDButton>
            <BDButton
              icon={Save}
              isLoading={isSaving}
              onClick={() => onSave(draft)}
            >
              Save resource
            </BDButton>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">Identity</h3>
              <div className="flex items-center gap-2">
                <BDButton
                  size="sm"
                  variant="secondary"
                  icon={Wand2}
                  onClick={() => setFillerOpen(true)}
                >
                  Fill details
                </BDButton>
                <BDButton
                  size="sm"
                  variant="secondary"
                  icon={Sparkles}
                  onClick={() => setAiOpen(true)}
                >
                  Generate AI
                </BDButton>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-600">Name</span>
                <input
                  className={CELL}
                  value={draft.name}
                  placeholder="e.g. Product"
                  onChange={(e) => update({ name: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-600">Slug</span>
                <input
                  className={CELL}
                  value={draft.slug}
                  placeholder="product"
                  onChange={(e) => update({ slug: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-600">
                  Label
                </span>
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
              <label className="flex flex-col gap-1 md:col-span-2">
                <span className="text-xs font-medium text-slate-600">
                  Form behavior
                </span>
                <select
                  className={CELL}
                  value={draft.formBehavior ?? "close"}
                  onChange={(e) =>
                    update({
                      formBehavior: e.target.value as BDAppFormBehavior,
                    })
                  }
                >
                  {BD_APP_FORM_BEHAVIOR_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-slate-400">
                  Primary action when saving a record in this resource&apos;s
                  form.
                </span>
              </label>
            </div>
          </section>

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
                No connections. One-to-one/many-to-many render a select;
                one-to-many renders a child table on this resource&apos;s view.
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
                    {connection.type === "oneToOne" && (
                      <input
                        className={`${CELL} w-28`}
                        placeholder="inverse"
                        value={connection.inverseName ?? ""}
                        onChange={(e) =>
                          updateConnection(index, {
                            inverseName: e.target.value || undefined,
                          })
                        }
                      />
                    )}
                    <label className="flex items-center gap-1 text-xs text-slate-500">
                      <input
                        type="checkbox"
                        checked={connection.relationManager?.searchable ?? true}
                        onChange={(e) =>
                          updateConnection(index, {
                            relationManager: {
                              ...connection.relationManager,
                              searchable: e.target.checked,
                            },
                          })
                        }
                      />
                      search
                    </label>
                    <input
                      type="number"
                      className={`${CELL} w-20`}
                      placeholder="per page"
                      value={connection.relationManager?.perPage ?? ""}
                      onChange={(e) =>
                        updateConnection(index, {
                          relationManager: {
                            ...connection.relationManager,
                            perPage: e.target.value
                              ? Number(e.target.value)
                              : undefined,
                          },
                        })
                      }
                    />
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

      <BDAppFillerComponent
        open={fillerOpen}
        onClose={() => setFillerOpen(false)}
        title="Fill resource details"
        description="Enter a name and the slug, label and plural label are derived from it."
        label="Resource name"
        placeholder="e.g. Product"
        submitLabel="Fill details"
        initialName={draft.name}
        onSubmit={applyIdentityFiller}
      />

      <BDAppResourceAIComponent
        open={aiOpen}
        onOpenChange={setAiOpen}
        projectId={projectId}
        resource={draft}
        models={models}
        resources={resources}
        onAccept={applyAIDraft}
      />
    </>
  );
}

export default BDAppResourceComponent;
