"use client";

// BDApiDesign.Component — API Design page 2: the operations inside one API
// group. Group management lives on page 1 (BDApiGroupListComponent).

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Webhook,
  Plus,
  Trash2,
  Save,
  Pencil,
  BookText,
  Send,
  Sparkles,
} from "lucide-react";
import type {
  BDAPI,
  BDAPIProperty,
  BDAPIReturn,
  BDGenerationMode,
} from "../../BDDomain.Types";
import { BDAPIReturnKind } from "../../BDDomain.Types";
import { bdDB } from "../../BDDatabase";
import { useBDProjectContext } from "../core/BDProject.Context";
import {
  useBDSchemaGroups,
  useBDSchemaModels,
} from "../schema-builder/BDSchemaBuilder.Hooks";
import { useBDApis, useBDApiGroups } from "./BDApi.Hooks";
import { bdApiRepository } from "./BDApi.Repository";
import {
  BD_API_AUTH_OPTIONS,
  BD_API_ITEM_SHAPE_OPTIONS,
  BD_API_LOCATION_OPTIONS,
  BD_API_METHOD_OPTIONS,
  BD_API_PROTOCOL_OPTIONS,
  BD_API_RETURN_SHAPE_OPTIONS,
  BD_API_EMPTY_FORM,
  createApi,
  createError,
  createProperty,
  createReturnProperty,
  itemShapeOf,
  returnShapeOf,
  toApiForm,
  type BDApiArtifact,
  type BDApiDraft,
  type BDApiForm,
  type BDApiItemShape,
  type BDApiPropertyDraft,
  type BDApiReturnShape,
} from "./BDApi.Types";
import { bdGenerateApi } from "./BDApiDesign.Server";
import BDApiMockComponent from "./BDApiMock.Component";
import BDApiDocumentComponent from "./BDApiDocument.Component";
import BDPageHeader from "../../components/BDPageHeader";
import BDBackLink from "../../components/BDBackLink";
import BDButton from "../../components/BDButton";
import BDList from "../../components/BDList";
import BDModal from "../../components/BDModal";
import BDForm from "../../components/BDForm";
import BDEmptyState from "../../components/BDEmptyState";
import BDConfirmDialog from "../../components/BDConfirmDialog";
import BDGenerationPanel from "../agent-manager/BDGenerationPanel";
import { useBDToast } from "../../components/BDToast";

const CELL =
  "rounded border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-blue-400";

/** Convert an AI return-field draft into a stored property (location unused). */
function draftField(p: BDApiPropertyDraft, index: number): BDAPIProperty {
  return {
    name: p.name || `field${index + 1}`,
    type: p.type ?? "string",
    location: "body",
    required: p.required,
    description: p.description,
    fakeType: p.fakeType,
  };
}

/** Build a stored return definition from an AI draft. */
function draftReturn(draft: BDApiDraft): BDAPIReturn {
  const item = draft.returnItem;
  return {
    kind: (draft.returnKind ?? "object") as BDAPIReturn["kind"],
    type: draft.returnType ?? "object",
    properties: (draft.returnProperties ?? []).map(draftField),
    item: item
      ? {
          kind: (item.kind ?? "scalar") as BDAPIReturn["kind"],
          type: item.type ?? "string",
          fakeType: item.fakeType,
          properties: (item.properties ?? []).map(draftField),
        }
      : undefined,
  };
}

type ApiTab = "design" | "mock" | "document";

const API_FIELDS = [
  { name: "name", label: "Name", type: "text" as const, required: true },
  {
    name: "method",
    label: "Method",
    type: "select" as const,
    options: BD_API_METHOD_OPTIONS,
  },
  { name: "path", label: "Path", type: "text" as const, required: true },
  {
    name: "protocol",
    label: "Protocol",
    type: "select" as const,
    options: BD_API_PROTOCOL_OPTIONS,
  },
  { name: "group", label: "Group", type: "text" as const },
  {
    name: "auth",
    label: "Auth",
    type: "select" as const,
    options: BD_API_AUTH_OPTIONS,
  },
  { name: "summary", label: "Summary", type: "text" as const },
  { name: "version", label: "Version", type: "text" as const },
  {
    name: "description",
    label: "Description",
    type: "textarea" as const,
    columnSpan: "full" as const,
  },
];

export interface BDApiDesignComponentProps {
  /** The API group whose operations are shown. */
  initialGroupId?: string;
}

export function BDApiDesignComponent({
  initialGroupId,
}: BDApiDesignComponentProps = {}) {
  const { projectId } = useBDProjectContext();
  const { toast } = useBDToast();
  const apis = useBDApis(projectId);
  const groups = useBDApiGroups(projectId);

  const [tab, setTab] = useState<ApiTab>("design");
  const [draft, setDraft] = useState<BDAPI | null>(null);
  const [form, setForm] = useState<BDApiForm | null>(null);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<BDApiForm>(BD_API_EMPTY_FORM);
  const [deleting, setDeleting] = useState<BDAPI | null>(null);
  const [saving, setSaving] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  const resolvedGroupId = initialGroupId;
  const activeGroup = groups?.find((g) => g.id === resolvedGroupId);
  const groupApis = (apis ?? []).filter((a) => a.groupId === resolvedGroupId);

  // AI generation picker: schema group used as the generation basis.
  const [aiSchemaGroupId, setAiSchemaGroupId] = useState<string>("none");
  const schemaGroups = useBDSchemaGroups(projectId);
  const aiSchemaModels = useBDSchemaModels(
    aiSchemaGroupId === "none" ? undefined : aiSchemaGroupId,
  );
  const allSchemaModels = useLiveQuery(
    () => bdDB.schemaModels.where("projectId").equals(projectId).toArray(),
    [projectId],
  );

  // Reset the picker each time the panel opens (render-time adjustment).
  const [prevAiOpen, setPrevAiOpen] = useState(aiOpen);
  if (aiOpen !== prevAiOpen) {
    setPrevAiOpen(aiOpen);
    if (aiOpen) setAiSchemaGroupId("none");
  }

  // A selected operation from another group must not stay open in the editor.
  if (draft && draft.groupId !== resolvedGroupId) {
    setDraft(null);
    setForm(null);
  }

  const loadApi = (api: BDAPI) => {
    setDraft(api);
    setForm(toApiForm(api));
  };

  const update = (patch: Partial<BDAPI>) =>
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));

  const handleCreate = async (values: Record<string, unknown>) => {
    if (!resolvedGroupId) {
      toast({ title: "Group not found", status: "warning" });
      return;
    }
    const created = await bdApiRepository.create(
      createApi(projectId, values as unknown as BDApiForm, resolvedGroupId),
    );
    setCreating(false);
    loadApi(created);
    toast({ title: "API created", status: "success" });
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      await bdApiRepository.update(draft.id, draft);
      toast({ title: "API saved", status: "success" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    await bdApiRepository.delete(deleting.id);
    if (draft?.id === deleting.id) {
      setDraft(null);
      setForm(null);
    }
    setDeleting(null);
    toast({ title: "API deleted", status: "success" });
  };

  const updateProperty = (index: number, patch: Partial<BDAPIProperty>) => {
    if (!draft) return;
    update({
      properties: draft.properties.map((p, i) =>
        i === index ? { ...p, ...patch } : p,
      ),
    });
  };

  const updateReturns = (patch: Partial<BDAPIReturn>) => {
    if (!draft) return;
    update({ returns: { ...draft.returns, ...patch } });
  };

  const setReturnShape = (shape: BDApiReturnShape) => {
    if (!draft) return;
    const { returns } = draft;
    if (shape === "object") {
      updateReturns({
        kind: BDAPIReturnKind.object,
        type: "object",
        item: undefined,
        fakeType: undefined,
      });
    } else if (shape === "any") {
      updateReturns({
        kind: BDAPIReturnKind.any,
        type: "any",
        properties: [],
        item: undefined,
        fakeType: undefined,
      });
    } else {
      updateReturns({
        kind: BDAPIReturnKind.array,
        fakeType: undefined,
        item: returns.item ?? {
          kind: BDAPIReturnKind.scalar,
          type: "string",
        },
      });
    }
  };

  const setItemShape = (shape: BDApiItemShape) => {
    if (!draft) return;
    const item = draft.returns.item;
    if (shape === "object") {
      updateReturns({
        item: {
          kind: BDAPIReturnKind.object,
          type: item?.type || "object",
          properties: item?.properties ?? [],
          fakeType: item?.fakeType,
          example: item?.example,
        },
      });
    } else if (shape === "any") {
      updateReturns({
        item: { kind: BDAPIReturnKind.any, type: "any", properties: [] },
      });
    } else {
      updateReturns({
        item: {
          kind: BDAPIReturnKind.scalar,
          type: item?.type || "string",
          properties: [],
          fakeType: item?.fakeType,
          example: item?.example,
        },
      });
    }
  };

  const updateReturnProperty = (
    index: number,
    patch: Partial<BDAPIProperty>,
  ) => {
    if (!draft) return;
    const properties = draft.returns.properties ?? [];
    updateReturns({
      properties: properties.map((p, i) =>
        i === index ? { ...p, ...patch } : p,
      ),
    });
  };

  const updateItemProperty = (index: number, patch: Partial<BDAPIProperty>) => {
    if (!draft) return;
    const item = draft.returns.item;
    if (!item) return;
    const properties = item.properties ?? [];
    updateReturns({
      item: {
        ...item,
        properties: properties.map((p, i) =>
          i === index ? { ...p, ...patch } : p,
        ),
      },
    });
  };

  const renderFieldRow = (
    property: BDAPIProperty,
    key: number,
    onChange: (patch: Partial<BDAPIProperty>) => void,
    onRemove: () => void,
  ) => (
    <div key={key} className="flex flex-wrap items-center gap-2">
      <input
        className={`${CELL} w-32`}
        placeholder="name"
        value={property.name}
        onChange={(e) => onChange({ name: e.target.value })}
      />
      <input
        className={`${CELL} w-24`}
        placeholder="type"
        value={property.type}
        onChange={(e) => onChange({ type: e.target.value })}
      />
      <label className="flex items-center gap-1 text-xs text-slate-500">
        <input
          type="checkbox"
          checked={!!property.required}
          onChange={(e) => onChange({ required: e.target.checked })}
        />
        required
      </label>
      <input
        className={`${CELL} flex-1`}
        placeholder="description"
        value={property.description ?? ""}
        onChange={(e) => onChange({ description: e.target.value })}
      />
      <button
        type="button"
        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
        onClick={onRemove}
        aria-label="Remove field"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );

  const buildAiSchemaModels = () => {
    if (
      aiSchemaGroupId === "none" ||
      !aiSchemaModels ||
      aiSchemaModels.length === 0
    ) {
      return undefined;
    }
    return aiSchemaModels.map((m) => ({
      name: m.name,
      table: m.table,
      columns: m.properties.map((p) => ({
        name: p.name,
        type: p.type,
        primary: !!p.primary,
      })),
      relations: m.relations.map((r) => {
        const target = allSchemaModels?.find((x) => x.id === r.targetModelId);
        return target ? `${r.name} → ${target.name}` : r.name;
      }),
    }));
  };

  const applyArtifact = async (
    artifact: BDApiArtifact,
    mode: BDGenerationMode,
  ) => {
    const targetGroupId = resolvedGroupId;
    if (!targetGroupId || !(groups ?? []).some((g) => g.id === targetGroupId)) {
      toast({ title: "Group no longer exists", status: "error" });
      return;
    }

    if (mode === "replace") {
      await bdApiRepository.deleteWhere("groupId", targetGroupId);
      if (draft?.groupId === targetGroupId) {
        setDraft(null);
        setForm(null);
      }
    }

    for (const apiDraft of artifact.apis) {
      await bdApiRepository.create({
        projectId,
        groupId: targetGroupId,
        name: apiDraft.name,
        group: apiDraft.group,
        protocol: (apiDraft.protocol ?? "rest") as BDAPI["protocol"],
        method: (apiDraft.method ?? "get") as BDAPI["method"],
        path: apiDraft.path,
        summary: apiDraft.summary,
        description: apiDraft.description,
        auth: (apiDraft.auth ?? "none") as BDAPI["auth"],
        properties: (apiDraft.properties ?? []).map((p, i) => ({
          name: p.name || `param${i + 1}`,
          type: p.type ?? "string",
          location: (p.location ?? "query") as BDAPIProperty["location"],
          required: p.required,
          description: p.description,
          fakeType: p.fakeType,
        })),
        returns: draftReturn(apiDraft),
        errors: (apiDraft.errors ?? []).map((e) => ({
          status: e.status,
          message: e.message,
          description: e.description,
        })),
      });
    }
  };

  if (groups && !activeGroup) {
    return (
      <div className="flex flex-col gap-5">
        <BDBackLink
          href={`/modules/bunny-dev/projects/${projectId}/api`}
          label="Back to API Design"
        />
        <BDEmptyState
          icon={Webhook}
          title="Group not found"
          description="This API group may have been deleted."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <BDBackLink
        href={`/modules/bunny-dev/projects/${projectId}/api`}
        label="Back to API Design"
      />
      <BDPageHeader
        icon={Webhook}
        title={activeGroup?.name ?? "API Design"}
        description={
          activeGroup?.description ||
          "Document and mock API operations in a Postman-like view and an exportable document view."
        }
        actions={
          <>
            <BDButton
              variant="secondary"
              icon={Sparkles}
              onClick={() => setAiOpen(true)}
            >
              AI Generate
            </BDButton>
            <BDButton
              variant="secondary"
              icon={Plus}
              onClick={() => {
                setCreateForm(BD_API_EMPTY_FORM);
                setCreating(true);
              }}
            >
              New API
            </BDButton>
          </>
        }
      />

      <BDGenerationPanel<BDApiArtifact>
        projectId={projectId}
        subsystem="api"
        open={aiOpen}
        onOpenChange={setAiOpen}
        title="AI API Generation"
        placeholder="e.g. CRUD endpoints for products and orders"
        generate={({ instruction, mode, aiConfig }) => {
          if (
            aiSchemaGroupId !== "none" &&
            (!aiSchemaModels || aiSchemaModels.length === 0)
          ) {
            throw new Error(
              "The selected schema group has no models yet. Add models in Schema Builder first.",
            );
          }
          const schemaModels = buildAiSchemaModels();
          return bdGenerateApi({
            instruction,
            mode,
            aiConfig,
            schemaGroupName:
              schemaGroups?.find((g) => g.id === aiSchemaGroupId)?.name,
            schemaModels,
          });
        }}
        onApply={applyArtifact}
        defaultMode="append"
        modes={["create", "append", "replace"]}
        extraFields={
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-slate-500">
              Based on schema group
            </span>
            <select
              value={aiSchemaGroupId}
              onChange={(e) => setAiSchemaGroupId(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-blue-400"
            >
              <option value="none">— none —</option>
              {(schemaGroups ?? []).map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
        }
        renderPreview={(artifact) => (
          <div className="flex flex-col gap-2">
            {artifact.apis.map((api, index) => (
              <div
                key={index}
                className="flex items-center gap-2 rounded-lg border border-slate-200 p-2 text-sm"
              >
                <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                  {api.method}
                </span>
                <span className="font-mono text-xs text-slate-700">
                  {api.path}
                </span>
                <span className="text-xs text-slate-400">
                  {(api.properties ?? []).length} params
                </span>
              </div>
            ))}
          </div>
        )}
      />

      <div className="flex gap-2">
        {(
          [
            ["design", "Design", Pencil],
            ["mock", "Mock", Send],
            ["document", "Document", BookText],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm ${
              tab === key
                ? "bg-blue-100 font-semibold text-blue-700"
                : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      {tab === "document" ? (
        <BDApiDocumentComponent
          apis={groupApis}
          title={activeGroup ? `${activeGroup.name} — API Reference` : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[20rem_1fr]">
          <BDList<BDAPI>
            title="Operations"
            className="max-h-[34rem]"
            virtual={{ height: 480 }}
            data={groupApis}
            isLoading={apis === undefined}
            getRowId={(row) => row.id}
            searchable
            getSearchText={(row) => `${row.method} ${row.path} ${row.name}`}
            emptyState={{
              title: "No API operations",
              description: "Create an operation or generate them with AI.",
            }}
            onRowClick={loadApi}
            columns={[
              {
                key: "method",
                label: "Method",
                width: 80,
                render: (row) => (
                  <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                    {row.method}
                  </span>
                ),
              },
              {
                key: "path",
                label: "Path",
                render: (row) => (
                  <span className="font-mono text-xs text-slate-700">
                    {row.path}
                  </span>
                ),
              },
            ]}
            rowActions={[
              {
                label: "Delete",
                icon: Trash2,
                variant: "danger",
                iconOnly: true,
                tooltip: "Delete operation",
                onSelect: ([row]) => setDeleting(row),
              },
            ]}
          />

          <div className="flex flex-col gap-4">
            {draft && form ? (
              tab === "mock" ? (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <h3 className="text-sm font-semibold text-slate-700">
                      {draft.name} · Mock
                    </h3>
                    <BDButton
                      size="sm"
                      icon={Save}
                      isLoading={saving}
                      onClick={handleSave}
                    >
                      Save
                    </BDButton>
                  </div>
                  <BDApiMockComponent api={draft} onUpdate={update} />
                </div>
              ) : (
                <>
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-700">
                        {draft.name}
                      </h3>
                      <BDButton size="sm" icon={Save} isLoading={saving} onClick={handleSave}>
                        Save
                      </BDButton>
                    </div>
                    <div className="mt-3">
                      <BDForm
                        fields={API_FIELDS}
                        value={form as unknown as Record<string, unknown>}
                        onChange={(values) => {
                          const next = values as unknown as BDApiForm;
                          setForm(next);
                          update({
                            name: next.name,
                            method: next.method,
                            path: next.path,
                            protocol: next.protocol,
                            group: next.group || undefined,
                            auth: next.auth,
                            summary: next.summary || undefined,
                            version: next.version || undefined,
                            description: next.description,
                          });
                        }}
                      />
                    </div>
                  </div>

                  {/* Parameters */}
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-700">
                        Parameters ({draft.properties.length})
                      </h3>
                      <BDButton
                        size="sm"
                        variant="secondary"
                        icon={Plus}
                        onClick={() =>
                          update({
                            properties: [...draft.properties, createProperty()],
                          })
                        }
                      >
                        Add parameter
                      </BDButton>
                    </div>
                    <div className="flex flex-col gap-2">
                      {draft.properties.map((property, index) => (
                        <div key={index} className="flex flex-wrap items-center gap-2">
                          <input
                            className={`${CELL} w-32`}
                            placeholder="name"
                            value={property.name}
                            onChange={(e) =>
                              updateProperty(index, { name: e.target.value })
                            }
                          />
                          <input
                            className={`${CELL} w-24`}
                            placeholder="type"
                            value={property.type}
                            onChange={(e) =>
                              updateProperty(index, { type: e.target.value })
                            }
                          />
                          <select
                            className={CELL}
                            value={property.location}
                            onChange={(e) =>
                              updateProperty(index, {
                                location: e.target
                                  .value as BDAPIProperty["location"],
                              })
                            }
                          >
                            {BD_API_LOCATION_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <label className="flex items-center gap-1 text-xs text-slate-500">
                            <input
                              type="checkbox"
                              checked={!!property.required}
                              onChange={(e) =>
                                updateProperty(index, {
                                  required: e.target.checked,
                                })
                              }
                            />
                            required
                          </label>
                          <input
                            className={`${CELL} flex-1`}
                            placeholder="description"
                            value={property.description ?? ""}
                            onChange={(e) =>
                              updateProperty(index, {
                                description: e.target.value,
                              })
                            }
                          />
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
                            aria-label="Remove parameter"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Return + errors */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-slate-700">
                          Return
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">Status</span>
                          <input
                            className={`${CELL} w-20`}
                            type="number"
                            value={draft.returns.status ?? 200}
                            onChange={(e) =>
                              updateReturns({ status: Number(e.target.value) })
                            }
                          />
                        </div>
                      </div>

                      {/* Shape toggle: Object | Array | Any */}
                      <div className="mb-3 flex gap-1 rounded-lg bg-slate-100 p-1">
                        {BD_API_RETURN_SHAPE_OPTIONS.map((opt) => {
                          const active =
                            returnShapeOf(draft.returns) === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setReturnShape(opt.value)}
                              className={`flex-1 rounded-md px-2 py-1 text-xs ${
                                active
                                  ? "bg-white font-semibold text-blue-700 shadow-sm"
                                  : "text-slate-500 hover:text-slate-700"
                              }`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>

                      {returnShapeOf(draft.returns) !== "any" && (
                        <input
                          className={`${CELL} w-full`}
                          placeholder="return type"
                          value={draft.returns.type}
                          onChange={(e) => updateReturns({ type: e.target.value })}
                        />
                      )}

                      {returnShapeOf(draft.returns) === "object" && (
                        <div className="mt-3">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-500">
                              Fields ({(draft.returns.properties ?? []).length})
                            </span>
                            <BDButton
                              size="sm"
                              variant="secondary"
                              icon={Plus}
                              onClick={() =>
                                updateReturns({
                                  properties: [
                                    ...(draft.returns.properties ?? []),
                                    createReturnProperty(),
                                  ],
                                })
                              }
                            >
                              Add field
                            </BDButton>
                          </div>
                          <div className="flex flex-col gap-2">
                            {(draft.returns.properties ?? []).map(
                              (property, index) =>
                                renderFieldRow(
                                  property,
                                  index,
                                  (patch) =>
                                    updateReturnProperty(index, patch),
                                  () =>
                                    updateReturns({
                                      properties: (
                                        draft.returns.properties ?? []
                                      ).filter((_, i) => i !== index),
                                    }),
                                ),
                            )}
                          </div>
                        </div>
                      )}

                      {returnShapeOf(draft.returns) === "array" && (
                        <div className="mt-3 flex flex-col gap-2">
                          <span className="text-xs font-medium text-slate-500">
                            Item
                          </span>
                          <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
                            {BD_API_ITEM_SHAPE_OPTIONS.map((opt) => {
                              const active =
                                itemShapeOf(draft.returns.item) === opt.value;
                              return (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => setItemShape(opt.value)}
                                  className={`flex-1 rounded-md px-2 py-1 text-xs ${
                                    active
                                      ? "bg-white font-semibold text-blue-700 shadow-sm"
                                      : "text-slate-500 hover:text-slate-700"
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>

                          {itemShapeOf(draft.returns.item) !== "any" && (
                            <input
                              className={`${CELL} w-full`}
                              placeholder="item type"
                              value={draft.returns.item?.type ?? ""}
                              onChange={(e) =>
                                updateReturns({
                                  item: {
                                    ...draft.returns.item,
                                    kind:
                                      draft.returns.item?.kind ??
                                      BDAPIReturnKind.scalar,
                                    type: e.target.value,
                                    properties:
                                      draft.returns.item?.properties ?? [],
                                  },
                                })
                              }
                            />
                          )}

                          {itemShapeOf(draft.returns.item) === "object" && (
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-slate-500">
                                  Item fields (
                                  {(draft.returns.item?.properties ?? []).length})
                                </span>
                                <BDButton
                                  size="sm"
                                  variant="secondary"
                                  icon={Plus}
                                  onClick={() =>
                                    updateReturns({
                                      item: {
                                        kind:
                                          draft.returns.item?.kind ??
                                          BDAPIReturnKind.object,
                                        type:
                                          draft.returns.item?.type ?? "object",
                                        properties: [
                                          ...(draft.returns.item?.properties ??
                                            []),
                                          createReturnProperty(),
                                        ],
                                      },
                                    })
                                  }
                                >
                                  Add field
                                </BDButton>
                              </div>
                              {(draft.returns.item?.properties ?? []).map(
                                (property, index) =>
                                  renderFieldRow(
                                    property,
                                    index,
                                    (patch) =>
                                      updateItemProperty(index, patch),
                                    () =>
                                      updateReturns({
                                        item: {
                                          ...draft.returns.item,
                                          kind:
                                            draft.returns.item?.kind ??
                                            BDAPIReturnKind.object,
                                          type:
                                            draft.returns.item?.type ?? "object",
                                          properties: (
                                            draft.returns.item?.properties ?? []
                                          ).filter((_, i) => i !== index),
                                        },
                                      }),
                                  ),
                              )}
                            </div>
                          )}

                          <p className="text-[11px] text-slate-400">
                            Arrays return a list of the item shape.
                          </p>
                        </div>
                      )}

                      {returnShapeOf(draft.returns) === "any" && (
                        <p className="mt-2 text-[11px] text-slate-400">
                          Returns any value — shape left undefined.
                        </p>
                      )}
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-slate-700">
                          Errors ({(draft.errors ?? []).length})
                        </h3>
                        <BDButton
                          size="sm"
                          variant="secondary"
                          icon={Plus}
                          onClick={() =>
                            update({ errors: [...(draft.errors ?? []), createError()] })
                          }
                        >
                          Add error
                        </BDButton>
                      </div>
                      <div className="flex flex-col gap-2">
                        {(draft.errors ?? []).map((error, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <input
                              className={`${CELL} w-16`}
                              type="number"
                              value={error.status}
                              onChange={(e) =>
                                update({
                                  errors: (draft.errors ?? []).map((x, i) =>
                                    i === index
                                      ? { ...x, status: Number(e.target.value) }
                                      : x,
                                  ),
                                })
                              }
                            />
                            <input
                              className={`${CELL} flex-1`}
                              value={error.message}
                              onChange={(e) =>
                                update({
                                  errors: (draft.errors ?? []).map((x, i) =>
                                    i === index
                                      ? { ...x, message: e.target.value }
                                      : x,
                                  ),
                                })
                              }
                            />
                            <button
                              type="button"
                              className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
                              onClick={() =>
                                update({
                                  errors: (draft.errors ?? []).filter(
                                    (_, i) => i !== index,
                                  ),
                                })
                              }
                              aria-label="Remove error"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )
            ) : (
              <BDEmptyState
                icon={Webhook}
                title="Select an operation"
                description="Pick an API operation or create a new one."
              />
            )}
          </div>
        </div>
      )}

      <BDModal
        open={creating}
        onClose={() => setCreating(false)}
        title="New API operation"
        size="lg"
      >
        <BDForm
          fields={API_FIELDS}
          value={createForm as unknown as Record<string, unknown>}
          onChange={(v) => setCreateForm(v as unknown as BDApiForm)}
          onSubmit={handleCreate}
          onCancel={() => setCreating(false)}
          submitLabel="Create API"
        />
      </BDModal>

      <BDConfirmDialog
        open={!!deleting}
        title={`Delete ${deleting?.name ?? "API"}?`}
        confirmLabel="Delete API"
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

export default BDApiDesignComponent;
