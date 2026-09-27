"use client";

import { useState } from "react";
import { Webhook, Plus, Trash2, Save, Pencil, BookText, Send, Sparkles } from "lucide-react";
import type {
  BDAPI,
  BDAPIProperty,
  BDAPIReturn,
} from "../../BDDomain.Types";
import { BDAPIReturnKind } from "../../BDDomain.Types";
import { useBDProjectContext } from "../core/BDProject.Context";
import { useBDApis } from "./BDApi.Hooks";
import { bdApiRepository } from "./BDApi.Repository";
import {
  BD_API_AUTH_OPTIONS,
  BD_API_LOCATION_OPTIONS,
  BD_API_METHOD_OPTIONS,
  BD_API_PROTOCOL_OPTIONS,
  BD_API_RETURN_KIND_OPTIONS,
  BD_API_EMPTY_FORM,
  createApi,
  createError,
  createProperty,
  toApiForm,
  type BDApiArtifact,
  type BDApiForm,
} from "./BDApi.Types";
import { bdGenerateApi } from "./BDApiDesign.Server";
import BDApiMockComponent from "./BDApiMock.Component";
import BDApiDocumentComponent from "./BDApiDocument.Component";
import BDPageHeader from "../../components/BDPageHeader";
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

export function BDApiDesignComponent() {
  const { projectId } = useBDProjectContext();
  const { toast } = useBDToast();
  const apis = useBDApis(projectId);

  const [tab, setTab] = useState<ApiTab>("design");
  const [draft, setDraft] = useState<BDAPI | null>(null);
  const [form, setForm] = useState<BDApiForm | null>(null);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<BDApiForm>(BD_API_EMPTY_FORM);
  const [deleting, setDeleting] = useState<BDAPI | null>(null);
  const [saving, setSaving] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  const loadApi = (api: BDAPI) => {
    setDraft(api);
    setForm(toApiForm(api));
  };

  const update = (patch: Partial<BDAPI>) =>
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));

  const handleCreate = async (values: Record<string, unknown>) => {
    const created = await bdApiRepository.create(
      createApi(projectId, values as unknown as BDApiForm),
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

  const applyArtifact = async (artifact: BDApiArtifact) => {
    for (const apiDraft of artifact.apis) {
      await bdApiRepository.create({
        projectId,
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
        })),
        returns: {
          kind: (apiDraft.returnKind ?? "object") as BDAPIReturn["kind"],
          type: apiDraft.returnType ?? "object",
          properties: [],
          example: {},
        },
        errors: (apiDraft.errors ?? []).map((e) => ({
          status: e.status,
          message: e.message,
          description: e.description,
        })),
      });
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <BDPageHeader
        icon={Webhook}
        title="API Design"
        description="Document and mock API operations in a Postman-like view and an exportable document view."
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
        generate={({ instruction, mode, aiConfig }) =>
          bdGenerateApi({ instruction, mode, aiConfig })
        }
        onApply={applyArtifact}
        defaultMode="append"
        modes={["create", "append"]}
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
        <BDApiDocumentComponent apis={apis ?? []} />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[20rem_1fr]">
          <BDList<BDAPI>
            title="Operations"
            data={apis ?? []}
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
                onSelect: ([row]) => setDeleting(row),
              },
            ]}
          />

          <div className="flex flex-col gap-4">
            {draft && form ? (
              tab === "mock" ? (
                <BDApiMockComponent api={draft} />
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
                      <h3 className="mb-2 text-sm font-semibold text-slate-700">
                        Return
                      </h3>
                      <div className="flex flex-col gap-2">
                        <select
                          className={`${CELL} w-full`}
                          value={draft.returns.kind}
                          onChange={(e) =>
                            update({
                              returns: {
                                ...draft.returns,
                                kind: e.target.value as BDAPIReturn["kind"],
                              },
                            })
                          }
                        >
                          {BD_API_RETURN_KIND_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <input
                          className={`${CELL} w-full`}
                          placeholder="return type"
                          value={draft.returns.type}
                          onChange={(e) =>
                            update({
                              returns: { ...draft.returns, type: e.target.value },
                            })
                          }
                        />
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">Status</span>
                          <input
                            className={`${CELL} w-20`}
                            type="number"
                            value={draft.returns.status ?? 200}
                            onChange={(e) =>
                              update({
                                returns: {
                                  ...draft.returns,
                                  status: Number(e.target.value),
                                },
                              })
                            }
                          />
                        </div>
                        {draft.returns.kind === BDAPIReturnKind.array && (
                          <p className="text-[11px] text-slate-400">
                            Arrays return a list of the item type.
                          </p>
                        )}
                      </div>
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
