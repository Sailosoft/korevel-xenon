"use client";

// BDDiagramBuilder.Component — Diagram Builder page.
//
// List of diagrams + an inline editor: type-specific node/edge editing, a raw
// Mermaid source override, live Mermaid preview, AI generation from the header,
// and export (.mmd / .md / .svg). Type is chosen once at creation, then locked.

import { useRef, useState, type ReactNode } from "react";
import {
  Workflow,
  Plus,
  Trash2,
  Save,
  Download,
  Sparkles,
  Lock,
} from "lucide-react";
import type {
  BDDiagramDirection,
  BDDiagramEdge,
  BDDiagramNode,
  BDDiagramRecord,
  BDDiagramType,
} from "../../BDDomain.Types";
import type { BDFormField } from "../../components/BDForm";
import { useBDProjectContext } from "../core/BDProject.Context";
import { useBDDiagrams } from "./BDDiagram.Hooks";
import { bdDiagramRepository } from "./BDDiagram.Repository";
import {
  BD_DIAGRAM_DIRECTION_OPTIONS,
  BD_DIAGRAM_NODE_FIELDS,
  BD_DIAGRAM_TYPE_OPTIONS,
  createDefaultDiagramNode,
  createDiagramEdge,
  createDiagramNode,
  supportsDirection,
  toMermaid,
  type BDDiagramArtifact,
  type BDDiagramForm,
  type BDDiagramNodeField,
} from "./BDDiagram.Types";
import { bdGenerateDiagram } from "./BDDiagramBuilder.Server";
import { toDiagramMarkdown, toDiagramSvg } from "./BDDiagramExport";
import BDPageHeader from "../../components/BDPageHeader";
import BDButton from "../../components/BDButton";
import BDList from "../../components/BDList";
import BDDiagramView from "../../components/BDDiagramView";
import BDCodeEditor from "../../components/BDCodeEditor";
import BDConfirmDialog from "../../components/BDConfirmDialog";
import BDEmptyState from "../../components/BDEmptyState";
import BDModal from "../../components/BDModal";
import BDForm from "../../components/BDForm";
import BDGenerationPanel from "../agent-manager/BDGenerationPanel";
import { useBDToast } from "../../components/BDToast";
import { downloadText } from "../../BDDownload";
import { useBDAISettings } from "../ai-settings/BDAISettings.Context";

const CELL =
  "rounded border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-blue-400";

const CREATE_FIELDS: BDFormField[] = [
  {
    name: "name",
    label: "Name",
    type: "text",
    required: true,
    placeholder: "e.g. Checkout flow",
  },
  {
    name: "type",
    label: "Diagram type",
    type: "select",
    options: BD_DIAGRAM_TYPE_OPTIONS,
    helperText: "The type is fixed after creation.",
  },
];

const EDGE_TYPE_OPTIONS = [
  "solid",
  "dotted",
  "thick",
  "invisible",
  "arrow",
  "open",
  "circle",
  "cross",
  "inheritance",
  "composition",
  "aggregation",
  "association",
  "dependency",
  "realization",
  "message",
  "return",
  "transition",
  "relation",
  "depends",
];

const EDGE_TYPE_TYPES: BDDiagramType[] = ["flowchart", "class", "state"];

/** Render one node field control from its declarative descriptor. */
function renderNodeField(
  field: BDDiagramNodeField,
  raw: unknown,
  onChange: (value: unknown) => void,
): ReactNode {
  switch (field.type) {
    case "number":
      return (
        <input
          type="number"
          className={`${CELL} w-full`}
          value={typeof raw === "number" ? raw : ""}
          placeholder={field.placeholder}
          onChange={(e) =>
            onChange(e.target.value === "" ? undefined : Number(e.target.value))
          }
        />
      );
    case "select":
      return (
        <select
          className={`${CELL} w-full`}
          value={typeof raw === "string" ? raw : ""}
          onChange={(e) => onChange(e.target.value || undefined)}
        >
          <option value="">{field.placeholder ?? "—"}</option>
          {field.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    case "toggle":
      return (
        <input
          type="checkbox"
          checked={!!raw}
          onChange={(e) => onChange(e.target.checked)}
        />
      );
    case "tags":
      return (
        <input
          className={`${CELL} w-full`}
          value={Array.isArray(raw) ? (raw as string[]).join(", ") : ""}
          placeholder={field.placeholder ?? "comma, separated"}
          onChange={(e) =>
            onChange(
              e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            )
          }
        />
      );
    case "repeater": {
      const items = Array.isArray(raw)
        ? (raw as Record<string, unknown>[])
        : [];
      return (
        <div className="flex flex-col gap-1.5">
          {items.map((item, index) => (
            <div
              key={index}
              className="flex flex-wrap items-end gap-1.5 rounded border border-slate-200 bg-slate-50 p-1.5"
            >
              {field.itemFields?.map((sub) => (
                <label key={sub.name} className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-slate-400">{sub.label}</span>
                  {renderNodeField(sub, item[sub.name], (value) => {
                    const next = [...items];
                    next[index] = { ...item, [sub.name]: value };
                    onChange(next);
                  })}
                </label>
              ))}
              <button
                type="button"
                className="ml-auto rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
                onClick={() =>
                  onChange(items.filter((_, i) => i !== index))
                }
                aria-label="Remove item"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <BDButton
            size="sm"
            variant="secondary"
            icon={Plus}
            onClick={() => onChange([...items, {}])}
          >
            Add {field.label.toLowerCase()}
          </BDButton>
        </div>
      );
    }
    default:
      return (
        <input
          className={`${CELL} w-full`}
          value={typeof raw === "string" ? raw : ""}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

export function BDDiagramBuilderComponent() {
  const { projectId } = useBDProjectContext();
  const { toast } = useBDToast();
  const { aiConfig } = useBDAISettings();
  const diagrams = useBDDiagrams(projectId);

  const [draft, setDraft] = useState<BDDiagramRecord | null>(null);
  const [deleting, setDeleting] = useState<BDDiagramRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [showSource, setShowSource] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createValues, setCreateValues] = useState<Record<string, unknown>>({
    name: "New Diagram",
    type: "flowchart",
  });
  const previewRef = useRef<HTMLDivElement>(null);

  const update = (patch: Partial<BDDiagramRecord>) =>
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));

  const rawMermaid =
    typeof draft?.meta?.mermaid === "string" ? draft.meta.mermaid : "";

  // Structured node/edge edits must take effect in the preview, so drop any
  // raw source override that would otherwise shadow them.
  const structuredUpdate = (patch: Partial<BDDiagramRecord>) =>
    update(
      rawMermaid ? { ...patch, meta: { ...draft?.meta, mermaid: undefined } } : patch,
    );

  // A draft has content once it has extra nodes, edges, or a source override.
  const hasContent = !!draft && (draft.nodes.length > 1 || draft.edges.length > 0 || !!rawMermaid);

  const openCreate = () => {
    setCreateValues({ name: "New Diagram", type: "flowchart" });
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    const name = String(createValues.name ?? "").trim() || "New Diagram";
    const type = (createValues.type as BDDiagramType) || "flowchart";
    const created = await bdDiagramRepository.create({
      projectId,
      name,
      type,
      render: "mermaid",
      direction: "TB",
      nodes: [createDefaultDiagramNode(type)],
      edges: [],
    });
    setCreateOpen(false);
    setDraft(created);
    setShowSource(false);
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      await bdDiagramRepository.update(draft.id, draft);
      toast({ title: "Diagram saved", status: "success" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    await bdDiagramRepository.delete(deleting.id);
    if (draft?.id === deleting.id) setDraft(null);
    setDeleting(null);
    toast({ title: "Diagram deleted", status: "success" });
  };

  // Type is locked once the draft has content; on an empty draft only the
  // default node is reset (never a destructive remap of existing data).
  const changeType = (type: BDDiagramType) => {
    if (!draft || hasContent) return;
    const first = draft.nodes[0];
    update({
      type,
      render: "mermaid",
      nodes: [
        createDefaultDiagramNode(type, {
          id: first?.id,
          label: first?.label,
        }),
      ],
    });
  };

  const changeDirection = (direction: BDDiagramDirection) => {
    if (!draft) return;
    // A raw source override would hide the direction change; clear it so the
    // selector visibly affects the preview.
    update({
      direction,
      ...(rawMermaid ? { meta: { ...draft.meta, mermaid: undefined } } : {}),
    });
  };

  const addNode = () => {
    if (!draft) return;
    const id = `n${draft.nodes.length + 1}`;
    structuredUpdate({
      nodes: [...draft.nodes, createDiagramNode(id, `Node ${id}`, draft.type)],
    });
  };

  const updateNode = (index: number, patch: Record<string, unknown>) => {
    if (!draft) return;
    structuredUpdate({
      nodes: draft.nodes.map((n, i) =>
        i === index ? ({ ...n, ...patch } as BDDiagramNode) : n,
      ),
    });
  };

  const addEdge = () => {
    if (!draft || draft.nodes.length < 2) return;
    structuredUpdate({
      edges: [
        ...draft.edges,
        createDiagramEdge(draft.nodes[0].id, draft.nodes[1].id),
      ],
    });
  };

  const updateEdge = (index: number, patch: Partial<BDDiagramEdge>) => {
    if (!draft) return;
    structuredUpdate({
      edges: draft.edges.map((e, i) =>
        i === index ? { ...e, ...patch } : e,
      ),
    });
  };

  const applyArtifact = async (artifact: BDDiagramArtifact) => {
    for (const diagramDraft of artifact.diagrams) {
      const nodes = diagramDraft.nodes.map((n, i) => {
        const base = createDiagramNode(
          n.id ?? `n${i + 1}`,
          n.label,
          diagramDraft.type,
        ) as unknown as Record<string, unknown>;
        return { ...base, ...(n.data ?? {}) } as unknown as BDDiagramNode;
      });
      const edges = (diagramDraft.edges ?? []).map((e) =>
        createDiagramEdge(e.source, e.target, e.label ?? ""),
      );
      await bdDiagramRepository.create({
        projectId,
        name: diagramDraft.name,
        type: diagramDraft.type,
        render: "mermaid",
        direction: diagramDraft.direction ?? "TB",
        nodes,
        edges,
        meta: diagramDraft.mermaid ? { mermaid: diagramDraft.mermaid } : undefined,
      });
    }
  };

  const form: BDDiagramForm | null = draft
    ? {
        name: draft.name,
        type: draft.type,
        direction: draft.direction ?? "TB",
      }
    : null;

  const nodeFields = draft ? BD_DIAGRAM_NODE_FIELDS[draft.type] ?? [] : [];
  const directionSupported = draft ? supportsDirection(draft.type) : true;

  return (
    <div className="flex flex-col gap-5">
      <BDPageHeader
        icon={Workflow}
        title="Diagram Builder"
        description="Create Mermaid diagrams with a type-specific node/edge editor, a raw-source override, live preview, and export."
        actions={
          <>
            <BDButton
              variant="secondary"
              icon={Sparkles}
              onClick={() => setAiOpen(true)}
            >
              AI Generate
            </BDButton>
            <BDButton icon={Plus} onClick={openCreate}>
              New diagram
            </BDButton>
          </>
        }
      />

      <BDGenerationPanel<BDDiagramArtifact>
        projectId={projectId}
        subsystem="diagram"
        open={aiOpen}
        onOpenChange={setAiOpen}
        title="AI Diagram Generation"
        placeholder="e.g. A flowchart of the checkout process with payment, inventory and email steps"
        generate={({ instruction, mode, aiConfig: cfg }) =>
          bdGenerateDiagram({ instruction, mode, aiConfig: cfg })
        }
        onApply={applyArtifact}
        defaultMode="append"
        modes={["create", "append"]}
        renderPreview={(artifact) => (
          <div className="flex flex-col gap-3">
            {artifact.diagrams.map((d, i) => (
              <div key={i} className="rounded-lg border border-slate-200 p-3">
                <p className="text-sm font-semibold text-slate-800">
                  {d.name} · {d.type}
                </p>
                <p className="text-xs text-slate-500">
                  {d.nodes.length} nodes · {d.edges?.length ?? 0} edges
                </p>
              </div>
            ))}
          </div>
        )}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[20rem_1fr]">
        <BDList<BDDiagramRecord>
          title="Diagrams"
          data={diagrams ?? []}
          isLoading={diagrams === undefined}
          getRowId={(row) => row.id}
          emptyState={{
            title: "No diagrams yet",
            description: "Create a diagram or generate one with AI.",
          }}
          onRowClick={(row) => {
            setDraft(row);
            setShowSource(false);
          }}
          columns={[
            {
              key: "name",
              label: "Name",
              render: (row) => (
                <span className="font-medium text-slate-800">{row.name}</span>
              ),
            },
            { key: "type", label: "Type", width: 120 },
          ]}
          rowActions={[
            {
              label: "Delete",
              icon: Trash2,
              variant: "danger",
              iconOnly: true,
              tooltip: "Delete diagram",
              onSelect: ([row]) => setDeleting(row),
            },
          ]}
        />

        <div className="flex flex-col gap-4">
          {draft && form ? (
            <>
              <section className="bd-diagram-section">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="bd-diagram-section-title">Settings</h3>
                  <div className="flex items-center gap-2">
                    <BDButton size="sm" icon={Save} isLoading={saving} onClick={handleSave}>
                      Save
                    </BDButton>
                    <BDButton
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowSource((v) => !v)}
                    >
                      {showSource ? "Hide Mermaid source" : "Edit Mermaid source"}
                    </BDButton>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-slate-600">
                      Name
                    </span>
                    <input
                      className={CELL}
                      value={form.name}
                      onChange={(e) => update({ name: e.target.value })}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="flex items-center gap-1 text-xs font-medium text-slate-600">
                      Type
                      {hasContent && <Lock className="h-3 w-3 text-slate-400" />}
                    </span>
                    <select
                      className={`${CELL} disabled:bg-slate-50 disabled:text-slate-400`}
                      value={form.type}
                      disabled={hasContent}
                      onChange={(e) =>
                        changeType(e.target.value as BDDiagramType)
                      }
                    >
                      {BD_DIAGRAM_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    {hasContent && (
                      <span className="text-[11px] text-slate-400">
                        Type is fixed after creation.
                      </span>
                    )}
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-slate-600">
                      Direction
                    </span>
                    <select
                      className={`${CELL} disabled:bg-slate-50 disabled:text-slate-400`}
                      value={form.direction}
                      disabled={!directionSupported}
                      onChange={(e) =>
                        changeDirection(e.target.value as BDDiagramDirection)
                      }
                    >
                      {BD_DIAGRAM_DIRECTION_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    {!directionSupported && (
                      <span className="text-[11px] text-slate-400">
                        Not supported by {form.type} diagrams.
                      </span>
                    )}
                  </label>
                </div>
              </section>

              {showSource && (
                <section className="bd-diagram-section">
                  <p className="mb-2 text-xs text-slate-500">
                    Raw Mermaid source overrides the node/edge editor. Changing
                    the direction clears this override.
                  </p>
                  <BDCodeEditor
                    value={rawMermaid || toMermaid(draft)}
                    onChange={(value) =>
                      update({ meta: { ...draft.meta, mermaid: value } })
                    }
                    language="text"
                    height={200}
                  />
                  {rawMermaid && (
                    <BDButton
                      size="sm"
                      variant="ghost"
                      className="mt-2"
                      onClick={() =>
                        update({ meta: { ...draft.meta, mermaid: undefined } })
                      }
                    >
                      Clear source override
                    </BDButton>
                  )}
                </section>
              )}

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {/* Nodes */}
                <section className="bd-diagram-section">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="bd-diagram-section-title">
                      Nodes ({draft.nodes.length})
                    </h3>
                    <BDButton size="sm" variant="secondary" icon={Plus} onClick={addNode}>
                      Add node
                    </BDButton>
                  </div>
                  <div className="flex flex-col gap-2">
                    {draft.nodes.map((node, index) => (
                      <div
                        key={node.id}
                        className="flex flex-col gap-2 rounded-lg border border-slate-200 p-2"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            className={`${CELL} w-24`}
                            value={node.id}
                            onChange={(e) =>
                              updateNode(index, { id: e.target.value })
                            }
                          />
                          <input
                            className={`${CELL} flex-1`}
                            value={node.label}
                            onChange={(e) =>
                              updateNode(index, { label: e.target.value })
                            }
                          />
                          <button
                            type="button"
                            className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
                            onClick={() =>
                              update({
                                nodes: draft.nodes.filter((_, i) => i !== index),
                              })
                            }
                            aria-label="Remove node"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        {nodeFields.length > 0 && (
                          <div className="grid grid-cols-2 gap-2">
                            {nodeFields.map((field) => (
                              <label
                                key={field.name}
                                className={`flex flex-col gap-0.5 ${
                                  field.type === "repeater" ? "col-span-2" : ""
                                }`}
                              >
                                <span className="text-[10px] uppercase tracking-wide text-slate-400">
                                  {field.label}
                                </span>
                                {renderNodeField(
                                  field,
                                  (node as unknown as Record<string, unknown>)[
                                    field.name
                                  ],
                                  (value) =>
                                    updateNode(index, { [field.name]: value }),
                                )}
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>

                {/* Edges */}
                <section className="bd-diagram-section">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="bd-diagram-section-title">
                      Edges ({draft.edges.length})
                    </h3>
                    <BDButton
                      size="sm"
                      variant="secondary"
                      icon={Plus}
                      onClick={addEdge}
                    >
                      Add edge
                    </BDButton>
                  </div>
                  <div className="flex flex-col gap-2">
                    {draft.edges.map((edge, index) => (
                      <div
                        key={index}
                        className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 p-2"
                      >
                        <select
                          className={CELL}
                          value={edge.source}
                          onChange={(e) =>
                            updateEdge(index, { source: e.target.value })
                          }
                        >
                          {draft.nodes.map((n) => (
                            <option key={n.id} value={n.id}>
                              {n.id}
                            </option>
                          ))}
                        </select>
                        <span className="text-xs text-slate-400">→</span>
                        <select
                          className={CELL}
                          value={edge.target}
                          onChange={(e) =>
                            updateEdge(index, { target: e.target.value })
                          }
                        >
                          {draft.nodes.map((n) => (
                            <option key={n.id} value={n.id}>
                              {n.id}
                            </option>
                          ))}
                        </select>
                        <input
                          className={`${CELL} flex-1`}
                          placeholder="label"
                          value={edge.label ?? ""}
                          onChange={(e) =>
                            updateEdge(index, {
                              label: e.target.value || undefined,
                            })
                          }
                        />
                        {EDGE_TYPE_TYPES.includes(draft.type) && (
                          <select
                            className={CELL}
                            value={edge.edgeType ?? "solid"}
                            onChange={(e) =>
                              updateEdge(index, {
                                edgeType: e.target
                                  .value as BDDiagramEdge["edgeType"],
                              })
                            }
                          >
                            {EDGE_TYPE_OPTIONS.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        )}
                        <button
                          type="button"
                          className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
                          onClick={() =>
                            update({
                              edges: draft.edges.filter((_, i) => i !== index),
                            })
                          }
                          aria-label="Remove edge"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              {/* Preview + export */}
              <section className="bd-diagram-section">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="bd-diagram-section-title">Preview</h3>
                  <div className="flex gap-2">
                    <BDButton
                      size="sm"
                      variant="secondary"
                      icon={Download}
                      onClick={() =>
                        downloadText(`${draft.name}.mmd`, toMermaid(draft))
                      }
                    >
                      .mmd
                    </BDButton>
                    <BDButton
                      size="sm"
                      variant="secondary"
                      icon={Download}
                      onClick={() =>
                        downloadText(
                          `${draft.name}.md`,
                          toDiagramMarkdown(draft),
                          "text/markdown",
                        )
                      }
                    >
                      .md
                    </BDButton>
                    <BDButton
                      size="sm"
                      variant="secondary"
                      icon={Download}
                      onClick={() => {
                        const svg = toDiagramSvg(previewRef.current);
                        if (!svg) {
                          toast({
                            title: "Nothing to export yet",
                            status: "warning",
                          });
                          return;
                        }
                        downloadText(`${draft.name}.svg`, svg, "image/svg+xml");
                      }}
                    >
                      .svg
                    </BDButton>
                  </div>
                </div>
                <div ref={previewRef}>
                  <BDDiagramView
                    chart={toMermaid(draft)}
                    className="bd-diagram-surface"
                  />
                </div>
                <p className="mt-2 flex items-center gap-1 text-[11px] text-slate-400">
                  <Sparkles className="h-3 w-3" /> Using {aiConfig.provider} for
                  AI generation
                </p>
              </section>
            </>
          ) : (
            <BDEmptyState
              icon={Workflow}
              title="Select a diagram"
              description="Pick a diagram from the list or create a new one."
              action={
                <BDButton icon={Plus} onClick={openCreate}>
                  New diagram
                </BDButton>
              }
            />
          )}
        </div>
      </div>

      <BDModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New diagram"
        description="Choose a name and type. The type is fixed after creation."
        footer={
          <>
            <BDButton variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </BDButton>
            <BDButton icon={Plus} onClick={submitCreate}>
              Create diagram
            </BDButton>
          </>
        }
      >
        <BDForm
          fields={CREATE_FIELDS}
          value={createValues}
          onChange={setCreateValues}
          columns={1}
        />
      </BDModal>

      <BDConfirmDialog
        open={!!deleting}
        title={`Delete ${deleting?.name ?? "diagram"}?`}
        confirmLabel="Delete diagram"
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

export default BDDiagramBuilderComponent;
