"use client";

import { useState } from "react";
import {
  ListTree,
  Plus,
  Save,
  Trash2,
  Download,
  FileJson,
  FileText,
  Globe,
  Sparkles,
} from "lucide-react";
import type { BDOutline, BDOutlineTopic } from "../../BDDomain.Types";
import { BDOutlineContentType } from "../../BDDomain.Types";
import { useBDProjectContext } from "../core/BDProject.Context";
import { useBDOutlines } from "./BDOutline.Hooks";
import { bdOutlineRepository } from "./BDOutline.Repository";
import {
  BD_OUTLINE_EMPTY_FORM,
  addTopicToTree,
  countTopics,
  createOutline,
  createTopic,
  findTopic,
  removeTopicFromTree,
  updateTopicInTree,
  type BDOutlineArtifact,
  type BDOutlineForm,
  type BDOutlineTopicDraft,
} from "./BDOutline.Types";
import { bdGenerateOutline } from "./BDOutlineBuilder.Server";
import {
  toOutlineHtml,
  toOutlineJson,
  toOutlineMarkdown,
} from "./BDOutlineExport";
import BDOutlineComponent from "./BDOutline.Component";
import BDOutlineEditorComponent from "./BDOutlineEditor.Component";
import BDPageHeader from "../../components/BDPageHeader";
import BDButton from "../../components/BDButton";
import BDList from "../../components/BDList";
import BDModal from "../../components/BDModal";
import BDForm from "../../components/BDForm";
import BDEmptyState from "../../components/BDEmptyState";
import BDConfirmDialog from "../../components/BDConfirmDialog";
import BDGenerationPanel from "../agent-manager/BDGenerationPanel";
import { useBDToast } from "../../components/BDToast";
import { downloadText, openTextTab } from "../../BDDownload";

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

export function BDOutlineBuilderComponent() {
  const { projectId } = useBDProjectContext();
  const { toast } = useBDToast();
  const outlines = useBDOutlines(projectId);

  const [draft, setDraft] = useState<BDOutline | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string | undefined>();
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<BDOutlineForm>(
    BD_OUTLINE_EMPTY_FORM,
  );
  const [deleting, setDeleting] = useState<BDOutline | null>(null);
  const [saving, setSaving] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  const loadOutline = (outline: BDOutline) => {
    setDraft(outline);
    setSelectedTopicId(undefined);
  };

  const update = (patch: Partial<BDOutline>) =>
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));

  const selectedTopic = draft?.topics
    ? findTopic(draft.topics, selectedTopicId ?? "")
    : undefined;

  const handleCreate = async (values: Record<string, unknown>) => {
    const form = values as unknown as BDOutlineForm;
    const created = await bdOutlineRepository.create(
      createOutline(projectId, form),
    );
    setCreating(false);
    loadOutline(created);
    toast({ title: "Outline created", status: "success" });
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      await bdOutlineRepository.update(draft.id, {
        topics: draft.topics,
        name: draft.name,
        title: draft.title,
        slug: draft.slug,
        description: draft.description,
        updatedAt: new Date().toISOString(),
      });
      toast({ title: "Outline saved", status: "success" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    await bdOutlineRepository.delete(deleting.id);
    if (draft?.id === deleting.id) setDraft(null);
    setDeleting(null);
    toast({ title: "Outline deleted", status: "success" });
  };

  const addTopic = (parentId: string | null) => {
    if (!draft) return;
    const topic = createTopic("New Topic");
    update({ topics: addTopicToTree(draft.topics, parentId, topic) });
    setSelectedTopicId(topic.id);
  };

  const deleteTopic = (topic: BDOutlineTopic) => {
    if (!draft) return;
    update({ topics: removeTopicFromTree(draft.topics, topic.id) });
    if (selectedTopicId === topic.id) setSelectedTopicId(undefined);
  };

  const updateSelectedTopic = (patch: Partial<BDOutlineTopic>) => {
    if (!draft || !selectedTopicId) return;
    update({
      topics: updateTopicInTree(draft.topics, selectedTopicId, patch),
    });
  };

  const applyArtifact = async (artifact: BDOutlineArtifact) => {
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
        generate={({ instruction, mode, aiConfig }) =>
          bdGenerateOutline({ instruction, mode, aiConfig })
        }
        onApply={applyArtifact}
        defaultMode="create"
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[20rem_1fr]">
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
          onRowClick={loadOutline}
          columns={[
            {
              key: "name",
              label: "Name",
              render: (row) => (
                <span className="font-medium text-slate-800">{row.name}</span>
              ),
            },
            {
              key: "topics",
              label: "Topics",
              width: 70,
              render: (row) => countTopics(row.topics),
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
          {draft ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div>
                  <input
                    className="w-64 rounded border border-transparent bg-transparent px-1 text-sm font-semibold text-slate-800 outline-none hover:border-slate-200 focus:border-blue-400"
                    value={draft.name}
                    onChange={(e) => update({ name: e.target.value })}
                  />
                  <p className="px-1 text-xs text-slate-400">
                    {countTopics(draft.topics)} topics · {draft.type}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <BDButton
                    size="sm"
                    variant="secondary"
                    icon={Plus}
                    onClick={() => addTopic(null)}
                  >
                    Add topic
                  </BDButton>
                  <BDButton size="sm" icon={Save} isLoading={saving} onClick={handleSave}>
                    Save
                  </BDButton>
                  <div className="flex gap-1">
                    <BDButton
                      size="sm"
                      variant="ghost"
                      icon={FileText}
                      onClick={() =>
                        downloadText(
                          `${draft.slug}.md`,
                          toOutlineMarkdown(draft),
                          "text/markdown",
                        )
                      }
                    >
                      MD
                    </BDButton>
                    <BDButton
                      size="sm"
                      variant="ghost"
                      icon={Globe}
                      onClick={() =>
                        downloadText(
                          `${draft.slug}.html`,
                          toOutlineHtml(draft),
                          "text/html",
                        )
                      }
                    >
                      HTML
                    </BDButton>
                    <BDButton
                      size="sm"
                      variant="ghost"
                      icon={FileJson}
                      onClick={() =>
                        downloadText(`${draft.slug}.json`, toOutlineJson(draft))
                      }
                    >
                      JSON
                    </BDButton>
                    <BDButton
                      size="sm"
                      variant="ghost"
                      icon={Download}
                      onClick={() => openTextTab(toOutlineHtml(draft))}
                    >
                      Preview
                    </BDButton>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[18rem_1fr]">
                <div className="rounded-xl border border-slate-200 bg-white p-2">
                  {draft.topics.length === 0 ? (
                    <p className="p-3 text-xs text-slate-400">
                      No topics yet. Add the first one.
                    </p>
                  ) : (
                    <BDOutlineComponent
                      topics={draft.topics}
                      selectedId={selectedTopicId}
                      onSelect={(topic) => setSelectedTopicId(topic.id)}
                      onAdd={addTopic}
                      onDelete={deleteTopic}
                    />
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  {selectedTopic ? (
                    <BDOutlineEditorComponent
                      topic={selectedTopic}
                      onChange={updateSelectedTopic}
                    />
                  ) : (
                    <BDEmptyState
                      icon={ListTree}
                      title="Select a topic"
                      description="Choose a topic from the tree to edit its content."
                    />
                  )}
                </div>
              </div>
            </>
          ) : (
            <BDEmptyState
              icon={ListTree}
              title="Select an outline"
              description="Pick an outline or create a new one."
            />
          )}
        </div>
      </div>

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

export default BDOutlineBuilderComponent;
