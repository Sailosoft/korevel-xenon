"use client";

// BDDiagramBuilder.Component — Diagram Builder page 3: the editor for one
// diagram. Listing/creation/AI generation lives on page 2
// (BDDiagramListComponent).

import { useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Workflow,
  Plus,
  Trash2,
  Save,
  Download,
  Lock,
  Maximize2,
} from "lucide-react";
import type {
  BDDiagramDirection,
  BDDiagramEdge,
  BDDiagramNode,
  BDDiagramRecord,
  BDDiagramType,
} from "../../BDDomain.Types";
import { useBDProjectContext } from "../core/BDProject.Context";
import { bdDiagramRepository } from "./BDDiagram.Repository";
import { useBDDiagram } from "./BDDiagram.Hooks";
import {
  BD_DIAGRAM_DIRECTION_OPTIONS,
  BD_DIAGRAM_NODE_FIELDS,
  BD_DIAGRAM_TYPE_OPTIONS,
  createDefaultDiagramNode,
  createDiagramEdge,
  createDiagramNode,
  supportsDirection,
  toMermaid,
  type BDDiagramNodeField,
} from "./BDDiagram.Types";
import { toDiagramMarkdown, toDiagramSvg } from "./BDDiagramExport";
import BDPageHeader from "../../components/BDPageHeader";
import BDBackLink from "../../components/BDBackLink";
import BDButton from "../../components/BDButton";
import BDDiagramCanvas, {
  type BDDiagramCanvasHandle,
} from "../../components/BDDiagramCanvas";
import BDCodeEditor from "../../components/BDCodeEditor";
import BDConfirmDialog from "../../components/BDConfirmDialog";
import BDModal from "../../components/BDModal";
import BDEmptyState from "../../components/BDEmptyState";
import { useBDToast } from "../../components/BDToast";
import { downloadText } from "../../BDDownload";

const CELL =
  "rounded border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-blue-400";

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
                onClick={() => onChange(items.filter((_, i) => i !== index))}
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

export interface BDDiagramBuilderComponentProps {
  /** The diagram being edited. */
  initialDiagramId?: string;
}

export function BDDiagramBuilderComponent({
  initialDiagramId,
}: BDDiagramBuilderComponentProps = {}) {
  const { projectId } = useBDProjectContext();
  const { toast } = useBDToast();
  const router = useRouter();

  const record = useBDDiagram(initialDiagramId);

  const [draft, setDraft] = useState<BDDiagramRecord | null>(null);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSource, setShowSource] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const canvasRef = useRef<BDDiagramCanvasHandle>(null);
  const modalCanvasRef = useRef<BDDiagramCanvasHandle>(null);

  // Load the diagram once its live query arrives (render-time adjustment).
  if (record && loadedId !== record.id) {
    setLoadedId(record.id);
    setDraft(record);
    setShowSource(false);
  }

  const backHref = draft?.groupId
    ? `/modules/bunny-dev/projects/${projectId}/diagram/${draft.groupId}`
    : `/modules/bunny-dev/projects/${projectId}/diagram`;

  const update = (patch: Partial<BDDiagramRecord>) =>
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));

  const rawMermaid =
    typeof draft?.meta?.mermaid === "string" ? draft.meta.mermaid : "";

  // Structured node/edge edits must take effect in the preview, so drop any
  // raw source override that would otherwise shadow them.
  const structuredUpdate = (patch: Partial<BDDiagramRecord>) =>
    update(
      rawMermaid
        ? { ...patch, meta: { ...draft?.meta, mermaid: undefined } }
        : patch,
    );

  const hasContent =
    !!draft &&
    (draft.nodes.length > 1 || draft.edges.length > 0 || !!rawMermaid);

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
    if (!draft) return;
    const target = backHref;
    await bdDiagramRepository.delete(draft.id);
    setDeleting(false);
    toast({ title: "Diagram deleted", status: "success" });
    router.push(target);
  };

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
      edges: draft.edges.map((e, i) => (i === index ? { ...e, ...patch } : e)),
    });
  };

  if (record === null) {
    return (
      <div className="flex flex-col gap-5">
        <BDBackLink
          href={`/modules/bunny-dev/projects/${projectId}/diagram`}
          label="Back to Diagram"
        />
        <BDEmptyState
          icon={Workflow}
          title="Diagram not found"
          description="This diagram may have been deleted."
        />
      </div>
    );
  }

  if (!draft) {
    return <div className="p-8 text-sm text-slate-500">Loading diagram…</div>;
  }

  const nodeFields = BD_DIAGRAM_NODE_FIELDS[draft.type] ?? [];
  const directionSupported = supportsDirection(draft.type);
  const previewChart = toMermaid(draft);

  const renderExportActions = (canvas: {
    current: BDDiagramCanvasHandle | null;
  }) => (
    <div className="flex flex-wrap gap-2">
      <BDButton
        size="sm"
        variant="secondary"
        icon={Download}
        onClick={() => downloadText(`${draft.name}.mmd`, previewChart)}
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
          const svg = toDiagramSvg(canvas.current?.getPreviewNode() ?? null);
          if (!svg) {
            toast({ title: "Nothing to export yet", status: "warning" });
            return;
          }
          downloadText(`${draft.name}.svg`, svg, "image/svg+xml");
        }}
      >
        .svg
      </BDButton>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 xl:h-full xl:min-h-0">
      <BDBackLink href={backHref} label="Back to Diagrams" />
      <BDPageHeader
        icon={Workflow}
        title={draft.name}
        description="Edit nodes, edges, and the Mermaid source, then preview and export."
        actions={
          <>
            <BDButton
              variant="secondary"
              icon={Trash2}
              onClick={() => setDeleting(true)}
            >
              Delete
            </BDButton>
            <BDButton icon={Save} isLoading={saving} onClick={handleSave}>
              Save
            </BDButton>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:min-h-0 xl:flex-1 xl:grid-cols-2">
        {/* Editor column — scrolls on its own so the preview stays put. */}
        <div className="bd-scroll flex min-h-0 flex-col gap-4 xl:overflow-y-auto xl:pr-1">
          <section className="bd-diagram-section">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="bd-diagram-section-title">Settings</h3>
          <BDButton
            size="sm"
            variant="ghost"
            onClick={() => setShowSource((v) => !v)}
          >
            {showSource ? "Hide Mermaid source" : "Edit Mermaid source"}
          </BDButton>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">Name</span>
            <input
              className={CELL}
              value={draft.name}
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
              value={draft.type}
              disabled={hasContent}
              onChange={(e) => changeType(e.target.value as BDDiagramType)}
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
              value={draft.direction ?? "TB"}
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
                Not supported by {draft.type} diagrams.
              </span>
            )}
          </label>
        </div>
      </section>

      {showSource && (
        <section className="bd-diagram-section">
          <p className="mb-2 text-xs text-slate-500">
            Raw Mermaid source overrides the node/edge editor. Changing the
            direction clears this override.
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
                    onChange={(e) => updateNode(index, { id: e.target.value })}
                  />
                  <input
                    className={`${CELL} flex-1`}
                    value={node.label}
                    onChange={(e) => updateNode(index, { label: e.target.value })}
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
                          (value) => updateNode(index, { [field.name]: value }),
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
                    updateEdge(index, { label: e.target.value || undefined })
                  }
                />
                {EDGE_TYPE_TYPES.includes(draft.type) && (
                  <select
                    className={CELL}
                    value={edge.edgeType ?? "solid"}
                    onChange={(e) =>
                      updateEdge(index, {
                        edgeType: e.target.value as BDDiagramEdge["edgeType"],
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

        {/* Preview column — fills the pane and stays visible on xl. */}
        <section className="bd-diagram-section hidden min-h-0 flex-col xl:flex">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="bd-diagram-section-title">Preview</h3>
            {renderExportActions(canvasRef)}
          </div>
          <BDDiagramCanvas
            ref={canvasRef}
            chart={previewChart}
            className="min-h-0 flex-1"
            surfaceClassName="bd-diagram-surface"
          />
        </section>
      </div>

      {/* Small screens: open the zoomable preview in a modal. */}
      <BDButton
        icon={Maximize2}
        className="fixed bottom-6 right-6 z-30 shadow-lg xl:hidden"
        onClick={() => setPreviewOpen(true)}
      >
        Preview
      </BDButton>

      <BDModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={`Preview — ${draft.name}`}
        size="xl"
        bodyScroll={false}
        footer={renderExportActions(modalCanvasRef)}
      >
        <div className="flex h-full min-h-0 flex-col">
          <BDDiagramCanvas
            ref={modalCanvasRef}
            chart={previewChart}
            className="min-h-0 flex-1"
            surfaceClassName="bd-diagram-surface"
          />
        </div>
      </BDModal>

      <BDConfirmDialog
        open={deleting}
        title={`Delete ${draft.name}?`}
        confirmLabel="Delete diagram"
        onConfirm={handleDelete}
        onCancel={() => setDeleting(false)}
      />
    </div>
  );
}

export default BDDiagramBuilderComponent;
