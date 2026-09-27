"use client";

// BDDiagramBuilder.Component — Diagram Builder page.
//
// List of diagrams + an inline editor: node/edge editing, a raw Mermaid source
// override, live Mermaid preview, AI generation from the header, and export
// (.mmd / .md / .svg).

import { useRef, useState } from "react";
import { Workflow, Plus, Trash2, Save, Download, Sparkles } from "lucide-react";
import type {
  BDDiagramEdge,
  BDDiagramNode,
  BDDiagramRecord,
  BDDiagramType,
} from "../../BDDomain.Types";
import { useBDProjectContext } from "../core/BDProject.Context";
import { useBDDiagrams } from "./BDDiagram.Hooks";
import { bdDiagramRepository } from "./BDDiagram.Repository";
import {
  BD_DIAGRAM_DIRECTION_OPTIONS,
  BD_DIAGRAM_TYPE_OPTIONS,
  createDiagramEdge,
  createDiagramNode,
  toMermaid,
  type BDDiagramArtifact,
  type BDDiagramForm,
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
import BDGenerationPanel from "../agent-manager/BDGenerationPanel";
import { useBDToast } from "../../components/BDToast";
import { downloadText } from "../../BDDownload";
import { useBDAISettings } from "../ai-settings/BDAISettings.Context";

const CELL =
  "rounded border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-blue-400";

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
  const previewRef = useRef<HTMLDivElement>(null);

  const update = (patch: Partial<BDDiagramRecord>) =>
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));

  const rawMermaid =
    typeof draft?.meta?.mermaid === "string" ? draft.meta.mermaid : "";

  const handleCreate = async () => {
    const created = await bdDiagramRepository.create({
      projectId,
      name: "New Diagram",
      type: "flowchart",
      render: "mermaid",
      direction: "TB",
      nodes: [createDiagramNode("start", "Start", "flowchart")],
      edges: [],
    });
    setDraft(created);
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

  const changeType = (type: BDDiagramType) => {
    if (!draft) return;
    update({
      type,
      render: "mermaid",
      nodes: draft.nodes.map((node) =>
        createDiagramNode(node.id, node.label, type),
      ),
    });
  };

  const addNode = () => {
    if (!draft) return;
    const id = `n${draft.nodes.length + 1}`;
    update({
      nodes: [...draft.nodes, createDiagramNode(id, `Node ${id}`, draft.type)],
    });
  };

  const updateNode = (index: number, patch: Partial<BDDiagramNode>) => {
    if (!draft) return;
    update({
      nodes: draft.nodes.map((n, i) =>
        i === index ? ({ ...n, ...patch } as BDDiagramNode) : n,
      ),
    });
  };

  const addEdge = () => {
    if (!draft || draft.nodes.length < 2) return;
    update({
      edges: [
        ...draft.edges,
        createDiagramEdge(draft.nodes[0].id, draft.nodes[1].id),
      ],
    });
  };

  const updateEdge = (index: number, patch: Partial<BDDiagramEdge>) => {
    if (!draft) return;
    update({
      edges: draft.edges.map((e, i) =>
        i === index ? { ...e, ...patch } : e,
      ),
    });
  };

  const applyArtifact = async (artifact: BDDiagramArtifact) => {
    for (const diagramDraft of artifact.diagrams) {
      const nodes = diagramDraft.nodes.map((n, i) =>
        createDiagramNode(
          n.id ?? `n${i + 1}`,
          n.label,
          diagramDraft.type,
        ),
      );
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

  return (
    <div className="flex flex-col gap-5">
      <BDPageHeader
        icon={Workflow}
        title="Diagram Builder"
        description="Create Mermaid diagrams with a node/edge editor, a raw-source override, live preview, and export."
        actions={
          <>
            <BDButton
              variant="secondary"
              icon={Sparkles}
              onClick={() => setAiOpen(true)}
            >
              AI Generate
            </BDButton>
            <BDButton icon={Plus} onClick={handleCreate}>
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
              onSelect: ([row]) => setDeleting(row),
            },
          ]}
        />

        <div className="flex flex-col gap-4">
          {draft && form ? (
            <>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
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
                    <span className="text-xs font-medium text-slate-600">
                      Type
                    </span>
                    <select
                      className={CELL}
                      value={form.type}
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
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-slate-600">
                      Direction
                    </span>
                    <select
                      className={CELL}
                      value={form.direction}
                      onChange={(e) =>
                        update({
                          direction: e.target
                            .value as BDDiagramRecord["direction"],
                        })
                      }
                    >
                      {BD_DIAGRAM_DIRECTION_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="mt-3 flex items-center gap-2">
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

              {showSource && (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="mb-2 text-xs text-slate-500">
                    Raw Mermaid source overrides the node/edge editor.
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
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {/* Nodes */}
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-700">
                      Nodes ({draft.nodes.length})
                    </h3>
                    <BDButton size="sm" variant="secondary" icon={Plus} onClick={addNode}>
                      Add node
                    </BDButton>
                  </div>
                  <div className="flex flex-col gap-2">
                    {draft.nodes.map((node, index) => (
                      <div key={node.id} className="flex items-center gap-2">
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
                    ))}
                  </div>
                </div>

                {/* Edges */}
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-700">
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
                      <div key={index} className="flex items-center gap-2">
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
                </div>
              </div>

              {/* Preview + export */}
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-700">
                    Preview
                  </h3>
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
                  <BDDiagramView chart={toMermaid(draft)} />
                </div>
                <p className="mt-2 flex items-center gap-1 text-[11px] text-slate-400">
                  <Sparkles className="h-3 w-3" /> Using {aiConfig.provider} for
                  AI generation
                </p>
              </div>
            </>
          ) : (
            <BDEmptyState
              icon={Workflow}
              title="Select a diagram"
              description="Pick a diagram from the list or create a new one."
              action={
                <BDButton icon={Plus} onClick={handleCreate}>
                  New diagram
                </BDButton>
              }
            />
          )}
        </div>
      </div>

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
