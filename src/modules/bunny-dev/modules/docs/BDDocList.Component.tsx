"use client";

// BDDocList.Component — Docs page 1: the table of docs.
//
// Rows open the doc detail page (topic tree + editor). AI generation and
// deletion live here, matching the previous combined builder.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, ListTree, Plus, Sparkles, Trash2 } from "lucide-react";
import type {
  BDGenerationMode,
  BDDoc,
  BDDocTopic,
} from "../../BDDomain.Types";
import { BDDocContentType } from "../../BDDomain.Types";
import { useBDProjectContext } from "../core/BDProject.Context";
import { useBDDocs } from "./BDDoc.Hooks";
import { bdDocRepository } from "./BDDoc.Repository";
import {
  countTopics,
  createDoc,
  createTopic,
  type BDDocArtifact,
  type BDDocForm,
  type BDDocTopicDraft,
} from "./BDDoc.Types";
import BDDocCreateComponent from "./BDDocCreate.Component";
import { bdGenerateDoc } from "./BDDocBuilder.Server";
import { bdSerializeTarget } from "../agent-manager/BDGeneration.Mode";
import BDPageHeader from "../../components/BDPageHeader";
import BDButton from "../../components/BDButton";
import BDList from "../../components/BDList";
import BDBadge from "../../components/BDBadge";
import BDConfirmDialog from "../../components/BDConfirmDialog";
import BDGenerationPanel from "../agent-manager/BDGenerationPanel";
import { useBDToast } from "../../components/BDToast";

function draftToTopics(drafts: BDDocTopicDraft[]): BDDocTopic[] {
  return drafts.map((draft, index) => {
    const topic = createTopic(
      draft.title,
      (draft.type ?? "topic") as BDDocTopic["type"],
      index,
    );
    return {
      ...topic,
      summary: draft.summary,
      content: draft.content
        ? [
            {
              id: crypto.randomUUID(),
              kind: BDDocContentType.paragraph,
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
  existing: BDDocTopic[],
  incoming: BDDocTopic[],
): BDDocTopic[] {
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

export function BDDocListComponent() {
  const { projectId } = useBDProjectContext();
  const { toast } = useBDToast();
  const router = useRouter();
  const docs = useBDDocs(projectId);

  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<BDDoc | null>(null);
  const [aiOpen, setAiOpen] = useState(false);

  const detailHref = (doc: BDDoc) =>
    `/modules/bunny-dev/projects/${projectId}/docs/${doc.id}`;

  const handleCreate = async (form: BDDocForm) => {
    const created = await bdDocRepository.create(
      createDoc(projectId, form),
    );
    setCreating(false);
    toast({ title: "Doc created", status: "success" });
    router.push(detailHref(created));
  };

  const handleDelete = async () => {
    if (!deleting) return;
    await bdDocRepository.delete(deleting.id);
    setDeleting(null);
    toast({ title: "Doc deleted", status: "success" });
  };

  const applyArtifact = async (
    artifact: BDDocArtifact,
    mode: BDGenerationMode,
    targetId?: string,
  ) => {
    if (mode !== "create") {
      if (!targetId) throw new Error("Select a doc first.");
      const target = await bdDocRepository.get(targetId);
      if (!target) throw new Error("The selected doc no longer exists.");
      const generated = artifact.docs[0];
      const newTopics = generated ? draftToTopics(generated.topics) : [];
      const topics =
        mode === "append"
          ? [...target.topics, ...newTopics]
          : mode === "update"
            ? mergeTopicsByTitle(target.topics, newTopics)
            : newTopics;
      await bdDocRepository.update(targetId, {
        topics,
        name: generated?.name ?? target.name,
        title: generated?.title ?? target.title,
        description: generated?.description ?? target.description,
        updatedAt: new Date().toISOString(),
      });
      return;
    }

    for (const docDraft of artifact.docs) {
      await bdDocRepository.create({
        ...createDoc(projectId, {
          name: docDraft.name,
          title: docDraft.title ?? "",
          slug: "",
          description: docDraft.description ?? "",
          type: (docDraft.type ?? "documentation") as BDDoc["type"],
          visibility: "project",
        }),
        topics: draftToTopics(docDraft.topics),
      });
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <BDPageHeader
        icon={ListTree}
        title="Docs"
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
              onClick={() => setCreating(true)}
            >
              New doc
            </BDButton>
          </>
        }
      />

      <BDGenerationPanel<BDDocArtifact>
        projectId={projectId}
        subsystem="docs"
        open={aiOpen}
        onOpenChange={setAiOpen}
        title="AI Doc Generation"
        placeholder="e.g. A developer onboarding guide for this project"
        generate={({ instruction, mode, aiConfig, targetContext }) =>
          bdGenerateDoc({ instruction, mode, targetContext, aiConfig })
        }
        onApply={applyArtifact}
        defaultMode="create"
        targets={(docs ?? []).map((o) => ({ id: o.id, label: o.name }))}
        targetLabel="Doc"
        buildTargetContext={(id) => {
          const record = (docs ?? []).find((o) => o.id === id);
          return record ? bdSerializeTarget(record) : undefined;
        }}
        renderPreview={(artifact) => (
          <div className="flex flex-col gap-2">
            {artifact.docs.map((doc, index) => (
              <div key={index} className="rounded-lg border border-slate-200 p-3">
                <p className="text-sm font-semibold text-slate-800">
                  {doc.title ?? doc.name}
                </p>
                <p className="text-xs text-slate-500">
                  {doc.topics.length} top-level topics
                </p>
              </div>
            ))}
          </div>
        )}
      />

      <BDList<BDDoc>
        title="Docs"
        data={docs ?? []}
        isLoading={docs === undefined}
        getRowId={(row) => row.id}
        searchable
        getSearchText={(row) => `${row.name} ${row.title ?? ""}`}
        emptyState={{
          title: "No docs yet",
          description: "Create a doc or generate one with AI.",
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
            tooltip: "Delete doc",
            onSelect: ([row]) => setDeleting(row),
          },
        ]}
      />

      <BDDocCreateComponent
        open={creating}
        onClose={() => setCreating(false)}
        onSubmit={handleCreate}
      />

      <BDConfirmDialog
        open={!!deleting}
        title={`Delete ${deleting?.name ?? "doc"}?`}
        confirmLabel="Delete doc"
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

export default BDDocListComponent;
