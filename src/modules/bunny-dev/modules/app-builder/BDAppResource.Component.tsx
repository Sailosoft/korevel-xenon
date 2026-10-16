"use client";

// BDAppResource.Component — editor for one app resource: identity, form
// fields, and table columns. Renders as a modal by default, or inline (no
// modal wrapper, no footer — actions live in the app settings modal) with
// variant="inline" — used by the app designer shell. Also supports create
// mode (isNew) where the resource is only committed when the parent handles
// onSave.

import { useImperativeHandle, useState, type Ref } from "react";
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
  connectionsFromModelRelations,
  connectionNameOptions,
  createAppConnection,
  columnFromDraft,
  connectionFromDraft,
  deriveResourceIdentity,
  fieldFromDraft,
  resourceFieldOptions,
} from "./BDApp.Types";
import type {
  BDAppResourceAISections,
  BDAppResourceDraft,
  BDAppResourceRef,
} from "./BDApp.Types";
import BDAppFormComponent from "./BDAppForm.Component";
import BDAppTableComponent from "./BDAppTable.Component";
import BDAppFillerComponent from "./BDAppFiller.Component";
import BDAppFieldSelect from "./BDAppFieldSelect.Component";
import BDAppResourceAIComponent from "./BDAppResourceAI.Component";
import BDModal from "../../components/BDModal";
import BDButton from "../../components/BDButton";

/** Imperative handle letting parents trigger actions on the open editor. */
export interface BDAppResourceComponentHandle {
  /** Commit the current editor draft via onSave. */
  save: () => void;
}

export interface BDAppResourceComponentProps {
  open: boolean;
  resource: BDAppResource | null;
  models: BDSchemaModel[];
  /** True when the parent app is tied to a schema design (schema group). */
  schemaTied?: boolean;
  /** Sibling resources in the same app (connection targets). */
  resources: BDAppResource[];
  /** True when creating a new resource (nothing committed until onSave). */
  isNew?: boolean;
  /** Changes when the edited resource changes, to reinitialize the draft. */
  resetToken?: string | number;
  projectId: string;
  isSaving?: boolean;
  /** "modal" (default) wraps the editor in a BDModal; "inline" renders it bare. */
  variant?: "modal" | "inline";
  onClose: () => void;
  onSave: (resource: BDAppResource) => void;
  onDelete: () => void;
  /** Exposes save() so external chrome (e.g. the settings modal) can commit. */
  ref?: Ref<BDAppResourceComponentHandle>;
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
  schemaTied = false,
  resources,
  isNew = false,
  resetToken,
  projectId,
  isSaving,
  variant = "modal",
  onClose,
  onSave,
  onDelete,
  ref,
}: BDAppResourceComponentProps) {
  const [draft, setDraft] = useState<BDAppResource | null>(resource);

  useImperativeHandle(
    ref,
    () => ({
      save: () => {
        if (draft) onSave(draft);
      },
    }),
    [draft, onSave],
  );

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
    if (variant === "inline") return null;
    return (
      <BDModal open={open} onClose={onClose} title="Resource">
        <p className="text-sm text-slate-500">Select a resource to edit.</p>
      </BDModal>
    );
  }

  const fields = collectAppFields(draft.form?.components);
  const columns = draft.table?.columns ?? [];
  const connections = draft.connections ?? [];
  // The resource's tied schema model — its properties are the candidates for
  // "Add from schema" in the form/table designers.
  const tiedModel = models.find((m) => m.id === draft.modelId) ?? null;

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

  const targetBySlug = new Map(resources.map((r) => [r.slug, r]));

  /** camelCase connection name derived from a resource's label/name. */
  const connectionNameFor = (target: BDAppResource) => {
    const words = (target.label ?? target.name ?? target.slug)
      .replace(/[^a-zA-Z0-9 ]/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const camel = words
      .map((word, i) =>
        i === 0
          ? word.toLowerCase()
          : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
      )
      .join("");
    return camel || "connection";
  };

  /**
   * Point a connection at a new target, auto-filling name/titleAttr while
   * they are still untouched (empty or at their create defaults).
   */
  const setConnectionTarget = (index: number, targetSlug: string) => {
    const connection = connections[index];
    const target = targetBySlug.get(targetSlug);
    const patch: Partial<BDAppConnection> = { targetSlug };
    if (target) {
      if (!connection.name || /^connection(_\d+)?$/.test(connection.name)) {
        patch.name = connectionNameFor(target);
      }
      if (!connection.titleAttribute || connection.titleAttribute === "name") {
        const options = resourceFieldOptions(target, models);
        const preferred =
          options.find((o) => o.value === "name") ??
          options.find((o) => o.hint?.includes("string")) ??
          options.find((o) => o.hint?.includes("text")) ??
          options.find((o) => o.value !== "id");
        if (preferred) patch.titleAttribute = preferred.value;
      }
    }
    updateConnection(index, patch);
  };

  /** Pre-fill connections from the schema model's relations. */
  const deriveFromSchema = () => {
    const model = models.find((m) => m.id === draft.modelId);
    if (!model) return;
    const derived = connectionsFromModelRelations(
      model,
      resources,
      models,
      connections.map((c) => c.name),
    );
    if (derived.length > 0) setConnections([...connections, ...derived]);
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

  const editorFooter = (
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
  );

  const editorBody = (
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
                <span className="text-[11px] text-slate-400">
                  {schemaTied
                    ? models.length === 0
                      ? "This app's schema design has no models yet — build them in the Schema Builder first."
                      : "Models from this app's tied schema design. Tying one enables “Add from schema” for fields and columns."
                    : models.length === 0
                      ? "No schema models in this project yet — build one in the Schema Builder first."
                      : "Any model in this project — tie a schema in App settings to narrow the list."}
                </span>
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
            model={tiedModel}
            projectId={projectId}
            onChange={setFields}
          />

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">
                Connections ({connections.length})
              </h3>
              <div className="flex items-center gap-2">
                {draft.modelId ? (
                  <BDButton
                    size="sm"
                    variant="secondary"
                    icon={Wand2}
                    onClick={deriveFromSchema}
                  >
                    Derive from schema
                  </BDButton>
                ) : null}
                <BDButton
                  size="sm"
                  variant="secondary"
                  icon={Plus}
                  onClick={addConnection}
                >
                  Add connection
                </BDButton>
              </div>
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
                        setConnectionTarget(index, e.target.value)
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
                    <BDAppFieldSelect
                      cell={`${CELL} w-44`}
                      placeholder="title attr (default: name)"
                      value={connection.titleAttribute ?? ""}
                      options={resourceFieldOptions(
                        targetBySlug.get(connection.targetSlug),
                        models,
                      )}
                      onChange={(value) =>
                        updateConnection(index, {
                          titleAttribute: value || undefined,
                        })
                      }
                    />
                    {connection.type === "oneToMany" && (
                      <BDAppFieldSelect
                        cell={`${CELL} w-44`}
                        placeholder="child fk"
                        value={connection.foreignKey ?? ""}
                        suggestion={`${draft.slug}Id`}
                        options={resourceFieldOptions(
                          targetBySlug.get(connection.targetSlug),
                          models,
                        )}
                        onChange={(value) =>
                          updateConnection(index, {
                            foreignKey: value || undefined,
                          })
                        }
                      />
                    )}
                    {connection.type === "oneToOne" && (
                      <BDAppFieldSelect
                        cell={`${CELL} w-44`}
                        placeholder="inverse"
                        value={connection.inverseName ?? ""}
                        suggestion={
                          targetBySlug
                            .get(connection.targetSlug)
                            ?.connections?.find(
                              (c) => c.targetSlug === draft.slug,
                            )?.name
                        }
                        options={connectionNameOptions(
                          targetBySlug.get(connection.targetSlug),
                        ).filter((option) => option.value !== connection.name)}
                        onChange={(value) =>
                          updateConnection(index, {
                            inverseName: value || undefined,
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
            model={tiedModel}
            projectId={projectId}
            onChange={(next) =>
              update({ table: { ...draft.table, columns: next } })
            }
          />
        </div>
  );

  const subModals = (
    <>
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

  if (variant === "inline") {
    return (
      <>
        <div className="flex h-full flex-col">
          <div className="bd-scroll min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-base font-semibold text-slate-800">
                  {title}
                </h2>
                {draft.slug && (
                  <span className="text-xs text-slate-400">{draft.slug}</span>
                )}
              </div>
              {editorBody}
            </div>
          </div>
        </div>

        {subModals}
      </>
    );
  }

  return (
    <>
      <BDModal
        open={open}
        onClose={onClose}
        size="lg"
        title={title}
        description={isNew ? undefined : draft.slug || undefined}
        footer={editorFooter}
      >
        {editorBody}
      </BDModal>

      {subModals}
    </>
  );
}

export default BDAppResourceComponent;
