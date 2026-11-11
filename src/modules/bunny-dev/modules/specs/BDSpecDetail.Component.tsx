"use client";

// BDSpecDetail.Component — Specs page 3: one spec document. Owns display,
// editing, save, exports, variants, AI refine, and variant comparison.

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Copy,
  Download,
  FileDown,
  FileText,
  GitCompare,
  Globe,
  RotateCcw,
  Save,
  Wand2,
} from "lucide-react";
import type { BDSpecRecord } from "../../BDDomain.Types";
import { useBDProjectContext } from "../core/BDProject.Context";
import {
  useBDSpec,
  useBDSpecGroups,
  useBDSpecsByGroup,
} from "./BDSpec.Hooks";
import { bdSpecRepository } from "./BDSpec.Repository";
import { inferDocMode, slugify } from "./BDSpec.Types";
import {
  applySpecPatches,
  type BDSpecPatchOp,
} from "./BDSpec.Patch";
import { takeBDSpecPendingPatches } from "./BDSpec.Pending";
import { toSpecHtml, toSpecMarkdown } from "./BDSpecExport";
import BDSpecComponent from "./BDSpec.Component";
import BDSpecChangesView from "./BDSpecChangesView";
import BDSpecRefineComponent from "./BDSpecRefine.Component";
import BDPageHeader from "../../components/BDPageHeader";
import BDBackLink from "../../components/BDBackLink";
import BDButton from "../../components/BDButton";
import BDBadge from "../../components/BDBadge";
import BDMarkdownView from "../../components/BDMarkdownView";
import BDEmptyState from "../../components/BDEmptyState";
import BDConfirmDialog from "../../components/BDConfirmDialog";
import { useBDToast } from "../../components/BDToast";
import { copyText, downloadText, openTextTab } from "../../BDDownload";

export interface BDSpecDetailComponentProps {
  groupId: string;
  specId: string;
}

export function BDSpecDetailComponent({
  groupId,
  specId,
}: BDSpecDetailComponentProps) {
  const { projectId } = useBDProjectContext();
  const { toast } = useBDToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const record = useBDSpec(specId);
  const groups = useBDSpecGroups(projectId);
  const groupRecords = useBDSpecsByGroup(groupId);
  const activeGroup = groups?.find((g) => g.id === groupId);

  const [draftState, setDraftState] = useState<{
    id: string;
    data: BDSpecRecord;
  } | null>(null);
  const [refineOpen, setRefineOpen] = useState(false);
  const [deleting, setDeleting] = useState<BDSpecRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingBaseline, setPendingBaseline] = useState<BDSpecRecord | null>(
    null,
  );
  const [pendingPatches, setPendingPatches] = useState<BDSpecPatchOp[]>([]);
  const [showPendingDiff, setShowPendingDiff] = useState(false);
  const pendingConsumed = useRef(false);

  const validRecord =
    record && record.projectId === projectId && record.groupId === groupId
      ? record
      : null;

  // Draft defaults to the live record until the first local edit, after which
  // local state takes over so unsaved edits are not clobbered by live updates.
  const draft =
    validRecord && draftState?.id === specId
      ? draftState.data
      : validRecord;

  // Consume AI patches handed off from the group page. Only stage onto the live
  // record when there is no local draft, so in-progress edits are never
  // clobbered.
  useEffect(() => {
    if (pendingConsumed.current) return;
    if (!validRecord || draftState) return;
    const pending = takeBDSpecPendingPatches(specId);
    if (!pending) return;
    pendingConsumed.current = true;

    // Defer the state updates out of the effect body: applying patches is an
    // external-to-React transition and this also avoids cascading renders.
    queueMicrotask(() => {
      try {
        const { record: next, summary } = applySpecPatches(
          validRecord,
          pending.patches,
        );
        setPendingBaseline(validRecord);
        setPendingPatches(pending.patches);
        setDraftState({ id: specId, data: next });
        toast({
          title: "AI changes staged",
          description: `${summary.operations} change${
            summary.operations === 1 ? "" : "s"
          } — review and Save.`,
          status: "success",
        });
      } catch (err) {
        toast({
          title: "AI changes could not be applied",
          description: err instanceof Error ? err.message : undefined,
          status: "error",
        });
      }
    });
  }, [validRecord, draftState, specId, toast]);

  const baseHref = `/modules/bunny-dev/projects/${projectId}/specs/${groupId}`;
  const specHref = (id: string) => `${baseHref}/${id}`;

  const update = (patch: Partial<BDSpecRecord>) => {
    if (!draft) return;
    setDraftState({ id: specId, data: { ...draft, ...patch } });
  };

  const applyAiPatches = (recordId: string, patches: BDSpecPatchOp[]) => {
    if (!draft || draft.id !== recordId) {
      throw new Error("The document changed. Close AI Assist and retry.");
    }
    const { record: next, summary } = applySpecPatches(draft, patches);
    setPendingBaseline((prev) => prev ?? draft);
    setPendingPatches((prev) => [...prev, ...patches]);
    setDraftState({ id: specId, data: next });
    toast({
      title: "AI changes staged",
      description: `${summary.operations} change${
        summary.operations === 1 ? "" : "s"
      } — review and Save.`,
      status: "success",
    });
  };

  const discardPending = () => {
    if (!pendingBaseline) return;
    setDraftState({ id: specId, data: pendingBaseline });
    setPendingBaseline(null);
    setPendingPatches([]);
    setShowPendingDiff(false);
    toast({ title: "AI changes discarded", status: "info" });
  };

  const familyRootId = draft?.variantOfId ?? draft?.id;
  const family = (groupRecords ?? []).filter(
    (r) => r.id === familyRootId || r.variantOfId === familyRootId,
  );
  const variants = family.filter((r) => r.id !== familyRootId);

  const compareId = searchParams.get("compare");
  const compareRecord = compareId
    ? (family.find((r) => r.id === compareId) ?? null)
    : null;
  const isComparing =
    !!draft && !!compareRecord && compareRecord.id !== draft.id;

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      await bdSpecRepository.update(draft.id, {
        ...draft,
        updatedAt: new Date().toISOString(),
      });
      setDraftState(null);
      setPendingBaseline(null);
      setPendingPatches([]);
      setShowPendingDiff(false);
      toast({ title: "Spec saved", status: "success" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    await bdSpecRepository.delete(deleting.id);
    setDeleting(null);
    toast({ title: "Deleted", status: "success" });
    router.push(baseHref);
  };

  const createVariant = async () => {
    if (!draft) return;
    const label = `Variant ${variants.length + 1}`;
    const root = family.find((r) => r.id === familyRootId) ?? draft;
    const variant = await bdSpecRepository.create({
      projectId: draft.projectId,
      groupId: draft.groupId,
      docMode: inferDocMode(draft),
      name: `${root.name} — ${label}`,
      slug: `${root.slug}-${slugify(label)}`,
      type: draft.type,
      status: draft.status,
      format: draft.format,
      summary: draft.summary,
      content: draft.content,
      sections: draft.sections.map((s) => ({ ...s, id: crypto.randomUUID() })),
      variantOfId: familyRootId ?? draft.id,
      variantLabel: label,
      version: draft.version,
    });
    setDraftState(null);
    toast({ title: "Variant created", status: "success" });
    router.push(specHref(variant.id));
  };

  const handleCopyHandoff = async () => {
    if (!draft) return;
    const ok = await copyText(toSpecMarkdown(draft));
    toast({
      title: ok ? "Spec.md copied" : "Copy failed",
      status: ok ? "success" : "error",
    });
  };

  if (record === undefined) {
    return (
      <div className="flex flex-col gap-5">
        <BDBackLink href={baseHref} label="Back to Specs" />
        <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-16 text-sm text-slate-500">
          Loading…
        </div>
      </div>
    );
  }

  if (!validRecord || !draft) {
    return (
      <div className="flex flex-col gap-5">
        <BDBackLink href={baseHref} label="Back to Specs" />
        <BDEmptyState
          icon={FileText}
          title="Document not found"
          description="This spec document may have been deleted or moved."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <BDBackLink
        href={isComparing ? specHref(draft.id) : baseHref}
        label={
          isComparing
            ? "Back to document"
            : `Back to ${activeGroup?.name ?? "Specs"}`
        }
      />

      {isComparing && compareRecord ? (
        <>
          <BDPageHeader
            icon={GitCompare}
            title={`${draft.name} vs ${compareRecord.name}`}
            description="Side-by-side variant comparison."
            actions={
              <BDButton
                variant="secondary"
                onClick={() => router.push(specHref(draft.id))}
              >
                Exit compare
              </BDButton>
            }
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-2 text-sm font-semibold text-blue-700">
                {draft.name}
              </h3>
              <BDMarkdownView content={toSpecMarkdown(draft)} />
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-2 text-sm font-semibold text-violet-700">
                {compareRecord.name}
              </h3>
              <BDMarkdownView content={toSpecMarkdown(compareRecord)} />
            </div>
          </div>
        </>
      ) : (
        <>
          <BDPageHeader
            icon={FileText}
            title={draft.name}
            description={draft.summary || `${draft.type} · ${draft.status}`}
            actions={
              <>
                <BDButton
                  variant="secondary"
                  icon={Wand2}
                  onClick={() => setRefineOpen(true)}
                >
                  AI Assist
                </BDButton>
                <BDButton icon={Save} isLoading={saving} onClick={handleSave}>
                  Save
                </BDButton>
              </>
            }
          />

          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <span className="text-xs text-slate-400">
              {draft.sections.length} sections
              {variants.length > 0 ? ` · ${variants.length} variants` : ""}
            </span>
            {draft.variantLabel && (
              <BDBadge color="info">{draft.variantLabel}</BDBadge>
            )}
            <div className="ml-auto flex flex-wrap gap-2">
              <BDButton
                size="sm"
                variant="secondary"
                icon={Download}
                onClick={() =>
                  downloadText(
                    `${draft.slug}.md`,
                    toSpecMarkdown(draft),
                    "text/markdown",
                  )
                }
              >
                Export markdown
              </BDButton>
              <BDButton
                size="sm"
                variant="secondary"
                icon={Globe}
                onClick={() => openTextTab(toSpecHtml(draft))}
              >
                View
              </BDButton>
              <BDButton
                size="sm"
                variant="secondary"
                icon={Download}
                onClick={() =>
                  downloadText(
                    `${draft.slug}.html`,
                    toSpecHtml(draft),
                    "text/html",
                  )
                }
              >
                HTML
              </BDButton>
              <BDButton
                size="sm"
                variant="secondary"
                icon={FileDown}
                onClick={() =>
                  downloadText("Spec.md", toSpecMarkdown(draft), "text/markdown")
                }
              >
                AI Handoff
              </BDButton>
              <BDButton
                size="sm"
                variant="secondary"
                icon={Copy}
                onClick={handleCopyHandoff}
              >
                Copy
              </BDButton>
            </div>
          </div>

          {family.length > 1 && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-blue-100 bg-blue-50/50 px-3 py-2">
              <span className="text-xs font-medium text-slate-500">
                Variants:
              </span>
              {family
                .filter((item) => item.id !== draft.id)
                .map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => router.push(specHref(item.id))}
                    className="flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-xs text-slate-600 hover:text-blue-600"
                  >
                    <GitCompare className="h-3 w-3" />
                    {item.variantLabel ?? item.name}
                  </button>
                ))}
              <BDButton
                size="sm"
                variant="ghost"
                icon={GitCompare}
                onClick={() => {
                  const other = family.find((item) => item.id !== draft.id);
                  if (other) {
                    router.push(`${specHref(draft.id)}?compare=${other.id}`);
                  }
                }}
              >
                Compare
              </BDButton>
            </div>
          )}

          {pendingBaseline && pendingPatches.length > 0 && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/60 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-blue-800">
                  AI changes staged · {pendingPatches.length} operation
                  {pendingPatches.length === 1 ? "" : "s"}
                </span>
                <span className="text-xs text-blue-600">
                  Review the changes and click Save to persist.
                </span>
                <div className="ml-auto flex flex-wrap gap-2">
                  <BDButton
                    size="sm"
                    variant="secondary"
                    icon={GitCompare}
                    onClick={() => setShowPendingDiff((value) => !value)}
                  >
                    {showPendingDiff ? "Hide changes" : "Review changes"}
                  </BDButton>
                  <BDButton
                    size="sm"
                    variant="ghost"
                    icon={RotateCcw}
                    onClick={discardPending}
                  >
                    Discard
                  </BDButton>
                </div>
              </div>
              {showPendingDiff && (
                <div className="mt-3">
                  <BDSpecChangesView
                    before={pendingBaseline}
                    after={draft}
                    patches={pendingPatches}
                    fileName={draft.name}
                  />
                </div>
              )}
            </div>
          )}

          <BDSpecComponent
            record={draft}
            onChange={update}
            onCreateVariant={createVariant}
            onDelete={() => setDeleting(draft)}
          />
        </>
      )}

      <BDSpecRefineComponent
        open={refineOpen}
        onOpenChange={setRefineOpen}
        projectId={projectId}
        documents={[draft]}
        initialDocumentId={draft.id}
        onApply={applyAiPatches}
      />

      <BDConfirmDialog
        open={!!deleting}
        title={`Delete ${deleting?.name ?? "document"}?`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

export default BDSpecDetailComponent;
