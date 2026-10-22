"use client";

// BDDocDetail.Component — Docs page 2: a single doc's topic tree
// (with HTML5 sibling drag reorder), metadata, exports, and topic editor.

import { useState } from "react";
import {
  Download,
  FileJson,
  FileText,
  Globe,
  ListTree,
  Plus,
  Save,
} from "lucide-react";
import type { BDDoc, BDDocTopic } from "../../BDDomain.Types";
import { useBDProjectContext } from "../core/BDProject.Context";
import { useBDDoc } from "./BDDoc.Hooks";
import { bdDocRepository } from "./BDDoc.Repository";
import {
  addTopicToTree,
  countTopics,
  createTopic,
  findTopic,
  removeTopicFromTree,
  replaceSiblingsInTree,
  updateTopicInTree,
} from "./BDDoc.Types";
import {
  toDocHtml,
  toDocJson,
  toDocMarkdown,
} from "./BDDocExport";
import BDDocComponent from "./BDDoc.Component";
import BDDocEditorComponent from "./BDDocEditor.Component";
import BDPageHeader from "../../components/BDPageHeader";
import BDBackLink from "../../components/BDBackLink";
import BDButton from "../../components/BDButton";
import BDEmptyState from "../../components/BDEmptyState";
import { useBDToast } from "../../components/BDToast";
import { downloadText, openTextTab } from "../../BDDownload";

export interface BDDocDetailComponentProps {
  docId: string;
}

export function BDDocDetailComponent({
  docId,
}: BDDocDetailComponentProps) {
  const { projectId } = useBDProjectContext();
  const { toast } = useBDToast();
  const record = useBDDoc(docId);

  const [draftState, setDraftState] = useState<{
    id: string;
    data: BDDoc;
  } | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  // Draft defaults to the live record until the first local edit, after which
  // local state takes over so unsaved edits are not clobbered by live updates.
  const draft =
    draftState && draftState.id === docId
      ? draftState.data
      : (record ?? null);

  const update = (patch: Partial<BDDoc>) => {
    if (!draft) return;
    setDraftState({ id: docId, data: { ...draft, ...patch } });
  };

  const selectedTopic = draft?.topics
    ? findTopic(draft.topics, selectedTopicId ?? "")
    : undefined;

  const backHref = `/modules/bunny-dev/projects/${projectId}/docs`;

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      await bdDocRepository.update(draft.id, {
        topics: draft.topics,
        name: draft.name,
        title: draft.title,
        slug: draft.slug,
        description: draft.description,
        updatedAt: new Date().toISOString(),
      });
      toast({ title: "Doc saved", status: "success" });
    } finally {
      setSaving(false);
    }
  };

  const addTopic = (parentId: string | null) => {
    if (!draft) return;
    const topic = createTopic("New Topic");
    update({ topics: addTopicToTree(draft.topics, parentId, topic) });
    setSelectedTopicId(topic.id);
  };

  const deleteTopic = (topic: BDDocTopic) => {
    if (!draft) return;
    update({ topics: removeTopicFromTree(draft.topics, topic.id) });
    if (selectedTopicId === topic.id) setSelectedTopicId(undefined);
  };

  const updateSelectedTopic = (patch: Partial<BDDocTopic>) => {
    if (!draft || !selectedTopicId) return;
    update({
      topics: updateTopicInTree(draft.topics, selectedTopicId, patch),
    });
  };

  const handleReorder = (
    parentId: string | null,
    ordered: BDDocTopic[],
  ) => {
    if (!draft) return;
    const normalized = ordered.map((topic, index) => ({
      ...topic,
      position: index,
    }));
    const topics = replaceSiblingsInTree(draft.topics, parentId, normalized);
    update({ topics });
    void bdDocRepository.update(draft.id, {
      topics,
      updatedAt: new Date().toISOString(),
    });
    toast({ title: "Order saved", status: "success" });
  };

  if (record === null) {
    return (
      <div className="flex flex-col gap-5">
        <BDBackLink href={backHref} label="Back to Docs" />
        <BDEmptyState
          icon={ListTree}
          title="Doc not found"
          description="This doc may have been deleted."
        />
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="flex flex-col gap-5">
        <BDBackLink href={backHref} label="Back to Docs" />
        <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-16 text-sm text-slate-500">
          Loading…
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <BDBackLink href={backHref} label="Back to Docs" />

      <BDPageHeader
        icon={ListTree}
        title={draft.title || draft.name}
        description={
          draft.description ||
          "Reorder topics by dragging the handle, and select one to edit its content."
        }
        actions={
          <>
            <BDButton size="sm" variant="secondary" icon={Plus} onClick={() => addTopic(null)}>
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
                    toDocMarkdown(draft),
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
                    toDocHtml(draft),
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
                  downloadText(`${draft.slug}.json`, toDocJson(draft))
                }
              >
                JSON
              </BDButton>
              <BDButton
                size="sm"
                variant="ghost"
                icon={Download}
                onClick={() => openTextTab(toDocHtml(draft))}
              >
                Preview
              </BDButton>
            </div>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <input
          className="w-64 rounded border border-transparent bg-transparent px-1 text-sm font-semibold text-slate-800 outline-none hover:border-slate-200 focus:border-blue-400"
          value={draft.name}
          placeholder="Doc name"
          onChange={(e) => update({ name: e.target.value })}
        />
        <input
          className="w-64 rounded border border-transparent bg-transparent px-1 text-sm text-slate-600 outline-none hover:border-slate-200 focus:border-blue-400"
          value={draft.title ?? ""}
          placeholder="Title"
          onChange={(e) => update({ title: e.target.value })}
        />
        <input
          className="w-56 rounded border border-transparent bg-transparent px-1 text-sm text-slate-600 outline-none hover:border-slate-200 focus:border-blue-400"
          value={draft.slug}
          placeholder="Slug"
          onChange={(e) => update({ slug: e.target.value })}
        />
        <span className="text-xs text-slate-400">
          {countTopics(draft.topics)} topics · {draft.type}
        </span>
      </div>

      <textarea
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
        rows={2}
        placeholder="Description"
        value={draft.description ?? ""}
        onChange={(e) => update({ description: e.target.value })}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[20rem_1fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-2">
          {draft.topics.length === 0 ? (
            <p className="p-3 text-xs text-slate-400">
              No topics yet. Add the first one.
            </p>
          ) : (
            <BDDocComponent
              topics={draft.topics}
              selectedId={selectedTopicId}
              onSelect={(topic) => setSelectedTopicId(topic.id)}
              onAdd={addTopic}
              onDelete={deleteTopic}
              onReorder={handleReorder}
            />
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          {selectedTopic ? (
            <BDDocEditorComponent
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
    </div>
  );
}

export default BDDocDetailComponent;
