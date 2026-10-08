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
  createDefaultDiagramNode,
  createDiagramEdge,
  createDiagramNode,
  type BDDiagramArtifact,
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
  const [aiType, setAiType] = useState<BDDiagramType>("flowchart");
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
        generate={({ instruction, mode, aiConfig: cfg }) =>
          bdGenerateDiagram({ instruction, mode, aiConfig: cfg, diagramType: aiType })
        }
        onApply={applyArtifact}
        defaultMode="create"
        modes={["create"]}
        extraFields={
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
        }
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
