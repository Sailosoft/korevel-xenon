"use client";

// BDOutlineList.Component — Outline page 1: the table of outlines.
//
// Rows open the outline detail page (topic tree + editor). AI generation and
// deletion live here, matching the previous combined builder.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, ListTree, Plus, Sparkles, Trash2 } from "lucide-react";
import type {
  BDGenerationMode,
  BDOutline,
  BDOutlineTopic,
} from "../../BDDomain.Types";
import { BDOutlineContentType } from "../../BDDomain.Types";
import { useBDProjectContext } from "../core/BDProject.Context";
import { useBDOutlines } from "./BDOutline.Hooks";
import { bdOutlineRepository } from "./BDOutline.Repository";
import {
  BD_OUTLINE_EMPTY_FORM,
  countTopics,
  createOutline,
  createTopic,
  type BDOutlineArtifact,
  type BDOutlineForm,
  type BDOutlineTopicDraft,
} from "./BDOutline.Types";
import { bdGenerateOutline } from "./BDOutlineBuilder.Server";
import { bdSerializeTarget } from "../agent-manager/BDGeneration.Mode";
import BDPageHeader from "../../components/BDPageHeader";
import BDButton from "../../components/BDButton";
import BDList from "../../components/BDList";
import BDBadge from "../../components/BDBadge";
import BDModal from "../../components/BDModal";
import BDForm from "../../components/BDForm";
import BDConfirmDialog from "../../components/BDConfirmDialog";
import BDGenerationPanel from "../agent-manager/BDGenerationPanel";
import { useBDToast } from "../../components/BDToast";

const OUTLINE_FIELDS = [
  { name: "name", label: "Name", type: "text" as const, required: true },
  { name: "title", label: "Title", type: "text" as const },
  { name: "slug", label: "Slug", type: "text" as const },
  {
    name: "description",
    label: "Description",
    type: "textarea" as const,
    columnSpan: "full" as const,
  },
];

function draftToTopics(drafts: BDOutlineTopicDraft[]): BDOutlineTopic[] {
  return drafts.map((draft, index) => {
    const topic = createTopic(
      draft.title,
      (draft.type ?? "topic") as BDOutlineTopic["type"],
      index,
    );
    return {
      ...topic,
      summary: draft.summary,
      content: draft.content
        ? [
            {
              id: crypto.randomUUID(),
              kind: BDOutlineContentType.paragraph,
              position: 0,
              text: draft.content,
            },
          ]
        : topic.content,
      children: draftToTopics(draft.children ?? []),
    };
  });
}

/** Merge generated top-level topics into existing ones, matched by title. */
function mergeTopicsByTitle(
  existing: BDOutlineTopic[],
  incoming: BDOutlineTopic[],
): BDOutlineTopic[] {
  const result = [...existing];
  for (const topic of incoming) {
    const index = result.findIndex((t) => t.title === topic.title);
    if (index >= 0) {
      result[index] = { ...topic, id: result[index].id };
    } else {
      result.push(topic);
    }
  }
  return result;
}

export function BDOutlineListComponent() {
  const { projectId } = useBDProjectContext();
  const { toast } = useBDToast();
  const router = useRouter();
  const outlines = useBDOutlines(projectId);

  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<BDOutlineForm>(
    BD_OUTLINE_EMPTY_FORM,
  );
  const [deleting, setDeleting] = useState<BDOutline | null>(null);
  const [aiOpen, setAiOpen] = useState(false);

  const detailHref = (outline: BDOutline) =>
    `/modules/bunny-dev/projects/${projectId}/outline/${outline.id}`;

  const handleCreate = async (values: Record<string, unknown>) => {
    const form = values as unknown as BDOutlineForm;
    const created = await bdOutlineRepository.create(
      createOutline(projectId, form),
    );
    setCreating(false);
    toast({ title: "Outline created", status: "success" });
    router.push(detailHref(created));
  };

  const handleDelete = async () => {
    if (!deleting) return;
    await bdOutlineRepository.delete(deleting.id);
    setDeleting(null);
    toast({ title: "Outline deleted", status: "success" });
  };

  const applyArtifact = async (
    artifact: BDOutlineArtifact,
    mode: BDGenerationMode,
    targetId?: string,
  ) => {
    if (mode !== "create") {
      if (!targetId) throw new Error("Select an outline first.");
      const target = await bdOutlineRepository.get(targetId);
      if (!target) throw new Error("The selected outline no longer exists.");
      const generated = artifact.outlines[0];
      const newTopics = generated ? draftToTopics(generated.topics) : [];
      const topics =
        mode === "append"
          ? [...target.topics, ...newTopics]
          : mode === "update"
            ? mergeTopicsByTitle(target.topics, newTopics)
            : newTopics;
      await bdOutlineRepository.update(targetId, {
        topics,
        name: generated?.name ?? target.name,
        title: generated?.title ?? target.title,
        description: generated?.description ?? target.description,
        updatedAt: new Date().toISOString(),
      });
      return;
    }

    for (const outlineDraft of artifact.outlines) {
      await bdOutlineRepository.create({
        ...createOutline(projectId, {
          name: outlineDraft.name,
          title: outlineDraft.title ?? "",
          slug: "",
          description: outlineDraft.description ?? "",
          type: (outlineDraft.type ?? "documentation") as BDOutline["type"],
          visibility: "project",
        }),
        topics: draftToTopics(outlineDraft.topics),
      });
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <BDPageHeader
        icon={ListTree}
        title="Outline"
        description="Author knowledge bases, guides, and documentation with a topic tree, WYSIWYG editor, and markdown export."
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
              icon={Plus}
              onClick={() => {
                setCreateForm(BD_OUTLINE_EMPTY_FORM);
                setCreating(true);
              }}
            >
              New outline
            </BDButton>
          </>
        }
      />

      <BDGenerationPanel<BDOutlineArtifact>
        projectId={projectId}
        subsystem="outline"
        open={aiOpen}
        onOpenChange={setAiOpen}
        title="AI Outline Generation"
        placeholder="e.g. A developer onboarding guide for this project"
        generate={({ instruction, mode, aiConfig, targetContext }) =>
          bdGenerateOutline({ instruction, mode, targetContext, aiConfig })
        }
        onApply={applyArtifact}
        defaultMode="create"
        targets={(outlines ?? []).map((o) => ({ id: o.id, label: o.name }))}
        targetLabel="Outline"
        buildTargetContext={(id) => {
          const record = (outlines ?? []).find((o) => o.id === id);
          return record ? bdSerializeTarget(record) : undefined;
        }}
        renderPreview={(artifact) => (
          <div className="flex flex-col gap-2">
            {artifact.outlines.map((outline, index) => (
              <div key={index} className="rounded-lg border border-slate-200 p-3">
                <p className="text-sm font-semibold text-slate-800">
                  {outline.title ?? outline.name}
                </p>
                <p className="text-xs text-slate-500">
                  {outline.topics.length} top-level topics
                </p>
              </div>
            ))}
          </div>
        )}
      />

      <BDList<BDOutline>
        title="Outlines"
        data={outlines ?? []}
        isLoading={outlines === undefined}
        getRowId={(row) => row.id}
        searchable
        getSearchText={(row) => `${row.name} ${row.title ?? ""}`}
        emptyState={{
          title: "No outlines yet",
          description: "Create an outline or generate one with AI.",
        }}
        onRowClick={(row) => router.push(detailHref(row))}
        columns={[
          {
            key: "name",
            label: "Name",
            render: (row) => (
              <div>
                <span className="font-medium text-slate-800">{row.name}</span>
                {row.description ? (
                  <p className="mt-0.5 text-xs text-slate-400">
                    {row.description}
                  </p>
                ) : null}
              </div>
            ),
          },
          {
            key: "type",
            label: "Type",
            width: 140,
            render: (row) => <BDBadge>{row.type}</BDBadge>,
          },
          {
            key: "topics",
            label: "Topics",
            width: 90,
            render: (row) => countTopics(row.topics),
          },
          {
            key: "status",
            label: "Status",
            width: 120,
            render: (row) => <BDBadge color="primary">{row.status}</BDBadge>,
          },
        ]}
        rowActions={[
          {
            label: "View topics",
            icon: ExternalLink,
            iconOnly: true,
            tooltip: "View topics",
            onSelect: ([row]) => router.push(detailHref(row)),
          },
          {
            label: "Delete",
            icon: Trash2,
            variant: "danger",
            iconOnly: true,
            tooltip: "Delete outline",
            onSelect: ([row]) => setDeleting(row),
          },
        ]}
      />

      <BDModal
        open={creating}
        onClose={() => setCreating(false)}
        title="New outline"
        size="lg"
      >
        <BDForm
          fields={OUTLINE_FIELDS}
          value={createForm as unknown as Record<string, unknown>}
          onChange={(v) => setCreateForm(v as unknown as BDOutlineForm)}
          onSubmit={handleCreate}
          onCancel={() => setCreating(false)}
          submitLabel="Create outline"
        />
      </BDModal>

      <BDConfirmDialog
        open={!!deleting}
        title={`Delete ${deleting?.name ?? "outline"}?`}
        confirmLabel="Delete outline"
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

export default BDOutlineListComponent;
