"use client";

// BDDiagrams.Component — Diagram Builder page 2: the diagrams inside a group.

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Workflow,
  Plus,
  Trash2,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import type {
  BDDiagramRecord,
  BDDiagramType,
} from "../../BDDomain.Types";
import type { BDFormField } from "../../components/BDForm";
import { useBDProjectContext } from "../core/BDProject.Context";
import { bdDiagramRepository } from "./BDDiagram.Repository";
import { useBDDiagramGroups, useBDDiagramsByGroup } from "./BDDiagram.Hooks";
import {
  BD_DIAGRAM_TYPE_OPTIONS,
  BD_MAX_DIAGRAMS,
  createDefaultDiagramNode,
  createDiagramEdge,
  createDiagramNode,
  type BDDiagramArtifact,
  type BDDiagramBatchMode,
  type BDDiagramCreation,
} from "./BDDiagram.Types";
import { bdGenerateDiagram } from "./BDDiagramBuilder.Server";
import BDPageHeader from "../../components/BDPageHeader";
import BDBackLink from "../../components/BDBackLink";
import BDButton from "../../components/BDButton";
import BDList from "../../components/BDList";
import BDBadge from "../../components/BDBadge";
import BDModal from "../../components/BDModal";
import BDForm from "../../components/BDForm";
import BDEmptyState from "../../components/BDEmptyState";
import BDConfirmDialog from "../../components/BDConfirmDialog";
import BDGenerationPanel from "../agent-manager/BDGenerationPanel";
import { useBDToast } from "../../components/BDToast";

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

export interface BDDiagramListComponentProps {
  groupId: string;
}

export function BDDiagramListComponent({ groupId }: BDDiagramListComponentProps) {
  const { projectId } = useBDProjectContext();
  const { toast } = useBDToast();
  const router = useRouter();

  const groups = useBDDiagramGroups(projectId);
  const diagrams = useBDDiagramsByGroup(groupId);
  const group = groups?.find((g) => g.id === groupId);

  const [deleting, setDeleting] = useState<BDDiagramRecord | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiCreation, setAiCreation] = useState<BDDiagramCreation>("single");
  const [aiType, setAiType] = useState<BDDiagramType>("flowchart");
  const [aiBatchMode, setAiBatchMode] = useState<BDDiagramBatchMode>("auto");
  const [aiCount, setAiCount] = useState(3);
  const [aiTypeCounts, setAiTypeCounts] = useState<
    Partial<Record<BDDiagramType, number>>
  >({});
  const [createOpen, setCreateOpen] = useState(false);
  const [createValues, setCreateValues] = useState<Record<string, unknown>>({
    name: "New Diagram",
    type: "flowchart",
  });

  const editorHref = (diagram: BDDiagramRecord) =>
    `/modules/bunny-dev/projects/${projectId}/diagram/${groupId}/${diagram.id}`;

  const openCreate = () => {
    setCreateValues({ name: "New Diagram", type: "flowchart" });
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    const name = String(createValues.name ?? "").trim() || "New Diagram";
    const type = (createValues.type as BDDiagramType) || "flowchart";
    const created = await bdDiagramRepository.create({
      projectId,
      groupId,
      name,
      type,
      render: "mermaid",
      direction: "TB",
      nodes: [createDefaultDiagramNode(type)],
      edges: [],
    });
    setCreateOpen(false);
    router.push(editorHref(created));
  };

  const handleDelete = async () => {
    if (!deleting) return;
    await bdDiagramRepository.delete(deleting.id);
    setDeleting(null);
    toast({ title: "Diagram deleted", status: "success" });
  };

  const batchTypes = (Object.entries(aiTypeCounts) as [BDDiagramType, number][])
    .filter(([, count]) => (count ?? 0) > 0)
    .map(([type]) => type);

  const applyArtifact = async (artifact: BDDiagramArtifact) => {
    const buildNodes = (draft: BDDiagramArtifact["diagrams"][number]) =>
      draft.nodes.map((n, i) => {
        const base = createDiagramNode(
          n.id ?? `n${i + 1}`,
          n.label,
          draft.type,
        ) as unknown as Record<string, unknown>;
        return { ...base, ...(n.data ?? {}) } as unknown as BDDiagramRecord["nodes"][number];
      });
    const buildEdges = (draft: BDDiagramArtifact["diagrams"][number]) =>
      (draft.edges ?? []).map((e) =>
        createDiagramEdge(e.source, e.target, e.label ?? ""),
      );

    for (const diagramDraft of artifact.diagrams) {
      await bdDiagramRepository.create({
        projectId,
        groupId,
        name: diagramDraft.name,
        type: diagramDraft.type,
        render: "mermaid",
        direction: diagramDraft.direction ?? "TB",
        nodes: buildNodes(diagramDraft),
        edges: buildEdges(diagramDraft),
        meta: diagramDraft.mermaid ? { mermaid: diagramDraft.mermaid } : undefined,
      });
    }
  };

  if (groups && !group) {
    return (
      <div className="flex flex-col gap-5">
        <BDBackLink
          href={`/modules/bunny-dev/projects/${projectId}/diagram`}
          label="Back to Diagram"
        />
        <BDEmptyState
          icon={Workflow}
          title="Group not found"
          description="This diagram group may have been deleted."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <BDBackLink
        href={`/modules/bunny-dev/projects/${projectId}/diagram`}
        label="Back to Diagram"
      />
      <BDPageHeader
        icon={Workflow}
        title={group?.name ?? "Diagrams"}
        description={
          group?.description ||
          "Diagrams in this group. Open one to edit nodes, edges, and preview."
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
        generate={({ instruction, mode, aiConfig: cfg }) => {
          if (
            aiCreation === "batch" &&
            aiBatchMode === "types" &&
            batchTypes.length === 0
          ) {
            throw new Error(
              "Pick at least one diagram type with a count of 1 or more.",
            );
          }
          return bdGenerateDiagram({
            instruction,
            mode,
            aiConfig: cfg,
            creation: aiCreation,
            diagramType: aiCreation === "single" ? aiType : undefined,
            batchMode: aiCreation === "batch" ? aiBatchMode : undefined,
            count:
              aiCreation === "batch" && aiBatchMode === "auto"
                ? aiCount
                : undefined,
            types:
              aiCreation === "batch" && aiBatchMode === "types"
                ? batchTypes
                : undefined,
            counts:
              aiCreation === "batch" && aiBatchMode === "types"
                ? aiTypeCounts
                : undefined,
          });
        }}
        onApply={applyArtifact}
        defaultMode="create"
        modes={["create"]}
        extraFields={
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-slate-500">
                Creation
              </span>
              <select
                value={aiCreation}
                onChange={(e) =>
                  setAiCreation(e.target.value as BDDiagramCreation)
                }
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-blue-400"
              >
                <option value="single">Single diagram</option>
                <option value="batch">Batch</option>
              </select>
            </label>

            {aiCreation === "single" ? (
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-medium text-slate-500">
                  Diagram type
                </span>
                <select
                  value={aiType}
                  onChange={(e) => setAiType(e.target.value as BDDiagramType)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-blue-400"
                >
                  {BD_DIAGRAM_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-medium text-slate-500">
                    Batch mode
                  </span>
                  <select
                    value={aiBatchMode}
                    onChange={(e) =>
                      setAiBatchMode(e.target.value as BDDiagramBatchMode)
                    }
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-blue-400"
                  >
                    <option value="auto">Auto — AI picks types</option>
                    <option value="types">Pick types</option>
                  </select>
                </label>

                {aiBatchMode === "auto" ? (
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] font-medium text-slate-500">
                      Number of diagrams
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={BD_MAX_DIAGRAMS}
                      value={aiCount}
                      onChange={(e) => setAiCount(Number(e.target.value))}
                      className="w-28 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-blue-400"
                    />
                  </label>
                ) : (
                  <div className="flex max-h-40 w-64 flex-col gap-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
                    {BD_DIAGRAM_TYPE_OPTIONS.map((opt) => {
                      const count = aiTypeCounts[opt.value] ?? 0;
                      return (
                        <label
                          key={opt.value}
                          className="flex items-center gap-2 text-xs text-slate-600"
                        >
                          <input
                            type="checkbox"
                            checked={count > 0}
                            onChange={(e) =>
                              setAiTypeCounts((prev) => ({
                                ...prev,
                                [opt.value]: e.target.checked
                                  ? prev[opt.value] || 1
                                  : 0,
                              }))
                            }
                          />
                          <span className="flex-1">{opt.label}</span>
                          <input
                            type="number"
                            min={0}
                            max={BD_MAX_DIAGRAMS}
                            value={count}
                            disabled={count <= 0}
                            onChange={(e) =>
                              setAiTypeCounts((prev) => ({
                                ...prev,
                                [opt.value]: Number(e.target.value),
                              }))
                            }
                            className="w-16 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs outline-none focus:border-blue-400 disabled:bg-slate-50 disabled:text-slate-400"
                          />
                        </label>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        }
        renderPreview={(artifact) => (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-slate-500">
              {artifact.diagrams.length} diagram
              {artifact.diagrams.length === 1 ? "" : "s"} will be created.
            </p>
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

      <BDList<BDDiagramRecord>
        title="Diagrams"
        data={diagrams ?? []}
        isLoading={diagrams === undefined}
        getRowId={(row) => row.id}
        emptyState={{
          title: "No diagrams yet",
          description: "Create a diagram or generate one with AI.",
        }}
        onRowClick={(row) => router.push(editorHref(row))}
        columns={[
          {
            key: "name",
            label: "Name",
            render: (row) => (
              <span className="font-medium text-slate-800">{row.name}</span>
            ),
          },
          {
            key: "type",
            label: "Type",
            width: 140,
            render: (row) => <BDBadge>{row.type}</BDBadge>,
          },
        ]}
        rowActions={[
          {
            label: "Open",
            icon: ExternalLink,
            iconOnly: true,
            tooltip: "Open diagram",
            onSelect: ([row]) => router.push(editorHref(row)),
          },
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

export default BDDiagramListComponent;
