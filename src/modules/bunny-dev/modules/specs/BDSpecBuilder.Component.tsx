"use client";

// BDSpecBuilder.Component — Specs page 2: the documents inside
// one spec group. Group management lives on page 1
// (BDSpecGroupListComponent).

import { useState } from "react";
import {
  Building2,
  Copy,
  Download,
  Eye,
  FileDown,
  GitCompare,
  Globe,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import type {
  BDSpecDocMode,
  BDSpecRecord,
  BDSpecSection,
  BDSpecType,
  BDGenerationMode,
} from "../../BDDomain.Types";
import { useBDProjectContext } from "../core/BDProject.Context";
import { useBDSpecGroups, useBDSpecs } from "./BDSpec.Hooks";
import { bdSpecRepository } from "./BDSpec.Repository";
import {
  BD_SPEC_TYPE_OPTIONS,
  createSpec,
  createSection,
  inferDocMode,
  slugify,
  specDraftToMarkdown,
  type BDSpecArtifact,
  type BDSpecSectionDraft,
} from "./BDSpec.Types";
import { bdGenerateSpec } from "./BDSpecBuilder.Server";
import { bdSerializeTarget } from "../agent-manager/BDGeneration.Mode";
import { toSpecHtml, toSpecMarkdown } from "./BDSpecExport";
import BDSpecComponent from "./BDSpec.Component";
import BDSpecCreateModal, {
  type BDSpecCreateInput,
} from "./BDSpecCreateModal.Component";
import BDSpecViewModal from "./BDSpecViewModal.Component";
import BDSpecRefineComponent from "./BDSpecRefine.Component";
import BDPageHeader from "../../components/BDPageHeader";
import BDBackLink from "../../components/BDBackLink";
import BDButton from "../../components/BDButton";
import BDList from "../../components/BDList";
import BDDrawer from "../../components/BDDrawer";
import BDModal from "../../components/BDModal";
import BDBadge from "../../components/BDBadge";
import BDMarkdownView from "../../components/BDMarkdownView";
import BDEmptyState from "../../components/BDEmptyState";
import BDConfirmDialog from "../../components/BDConfirmDialog";
import BDGenerationPanel from "../agent-manager/BDGenerationPanel";
import { useBDToast } from "../../components/BDToast";
import { downloadText, copyText, openTextTab } from "../../BDDownload";

function draftSectionsToRecords(
  drafts: BDSpecSectionDraft[] | undefined,
): BDSpecSection[] {
  return (drafts ?? []).map((s, i) => ({
    ...createSection(
      s.title,
      (s.level ?? 2) as 1 | 2 | 3 | 4 | 5 | 6,
      i,
      s.summary,
    ),
    content: s.content ?? "",
  }));
}

/** Merge generated sections into existing ones, matched by title. */
function mergeSectionsByTitle(
  existing: BDSpecSection[],
  incoming: BDSpecSection[],
): BDSpecSection[] {
  const result = [...existing];
  for (const section of incoming) {
    const index = result.findIndex((s) => s.title === section.title);
    if (index >= 0) {
      result[index] = {
        ...section,
        id: result[index].id,
        position: result[index].position,
      };
    } else {
      result.push(section);
    }
  }
  return result;
}

export interface BDSpecBuilderComponentProps {
  /** The spec group whose documents are shown. */
  initialGroupId?: string;
}

export function BDSpecBuilderComponent({
  initialGroupId,
}: BDSpecBuilderComponentProps = {}) {
  const { projectId } = useBDProjectContext();
  const { toast } = useBDToast();
  const groups = useBDSpecGroups(projectId);
  const records = useBDSpecs(projectId);

  const groupId = initialGroupId;
  const activeGroup = groups?.find((g) => g.id === groupId);
  const groupRecords = (records ?? []).filter((r) => r.groupId === groupId);

  const [draft, setDraft] = useState<BDSpecRecord | null>(null);
  const [viewing, setViewing] = useState<BDSpecRecord | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<BDSpecRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [compare, setCompare] = useState<BDSpecRecord | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiType, setAiType] = useState<BDSpecType>("architecture");
  const [aiDocMode, setAiDocMode] = useState<BDSpecDocMode>("sectioned");
  const [refineOpen, setRefineOpen] = useState(false);
  const [refineDocId, setRefineDocId] = useState<string | undefined>(undefined);

  const update = (patch: Partial<BDSpecRecord>) =>
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));

  const variants = groupRecords.filter(
    (r) => r.variantOfId && r.variantOfId === draft?.id,
  );

  const openRefine = (id?: string) => {
    setRefineDocId(id);
    setRefineOpen(true);
  };

  const handleCreate = async ({ form, content, sections }: BDSpecCreateInput) => {
    if (!groupId) {
      toast({ title: "Group not found", status: "warning" });
      return;
    }
    const created = await bdSpecRepository.create({
      ...createSpec(projectId, form, groupId),
      content,
      sections,
    });
    setCreating(false);
    setDraft(created);
    toast({ title: "Spec created", status: "success" });
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      await bdSpecRepository.update(draft.id, {
        ...draft,
        updatedAt: new Date().toISOString(),
      });
      toast({ title: "Spec saved", status: "success" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    await bdSpecRepository.delete(deleting.id);
    setDraft((prev) => (prev?.id === deleting.id ? null : prev));
    setDeleting(null);
    toast({ title: "Deleted", status: "success" });
  };

  const handleHandoff = () => {
    if (!draft) return;
    downloadText("Spec.md", toSpecMarkdown(draft), "text/markdown");
  };

  const handleCopyHandoff = async () => {
    if (!draft) return;
    const ok = await copyText(toSpecMarkdown(draft));
    toast({
      title: ok ? "Spec.md copied" : "Copy failed",
      status: ok ? "success" : "error",
    });
  };

  const createVariant = async () => {
    if (!draft) return;
    const label = `Variant ${variants.length + 1}`;
    const variant = await bdSpecRepository.create({
      projectId: draft.projectId,
      groupId: draft.groupId,
      docMode: inferDocMode(draft),
      name: `${draft.name} — ${label}`,
      slug: `${draft.slug}-${slugify(label)}`,
      type: draft.type,
      status: draft.status,
      format: draft.format,
      summary: draft.summary,
      content: draft.content,
      sections: draft.sections.map((s) => ({ ...s, id: crypto.randomUUID() })),
      variantOfId: draft.id,
      variantLabel: label,
      version: draft.version,
    });
    setDraft(variant);
    toast({ title: "Variant created", status: "success" });
  };

  const handleRefineApply = (recordId: string, patch: Partial<BDSpecRecord>) => {
    setDraft((prev) => {
      if (prev && prev.id === recordId) return { ...prev, ...patch };
      const base = groupRecords.find((r) => r.id === recordId);
      return base ? { ...base, ...patch } : prev;
    });
    toast({ title: "Refinement applied — review and save", status: "success" });
  };

  const applyArtifact = async (
    artifact: BDSpecArtifact,
    mode: BDGenerationMode,
    targetId?: string,
  ) => {
    if (mode !== "create") {
      if (!targetId) throw new Error("Select a document first.");
      const target = await bdSpecRepository.get(targetId);
      if (!target) throw new Error("The selected document no longer exists.");
      const generated = artifact.specs[0];
      const patch: Partial<BDSpecRecord> = {};

      if (aiDocMode === "single") {
        patch.docMode = "single";
        patch.content = generated?.content ?? target.content ?? "";
        if (mode === "replace") patch.sections = [];
      } else {
        patch.docMode = "sectioned";
        const incoming = draftSectionsToRecords(generated?.sections);
        patch.sections =
          mode === "append"
            ? [...target.sections, ...incoming]
            : mode === "update"
              ? mergeSectionsByTitle(target.sections, incoming)
              : incoming;
      }

      if (mode === "replace" || mode === "update") {
        patch.name = generated?.name ?? target.name;
        patch.summary = generated?.summary ?? target.summary;
        patch.status =
          (generated?.status as BDSpecRecord["status"]) ?? target.status;
        patch.type = (generated?.type as BDSpecRecord["type"]) ?? target.type;
      }
      await bdSpecRepository.update(targetId, patch);
      return;
    }

    let baseId: string | undefined;
    for (let index = 0; index < artifact.specs.length; index++) {
      const draftSpec = artifact.specs[index];
      const created = await bdSpecRepository.create({
        ...createSpec(
          projectId,
          {
            name: draftSpec.name,
            slug: "",
            type: (draftSpec.type ?? "architecture") as BDSpecRecord["type"],
            status: (draftSpec.status ?? "draft") as BDSpecRecord["status"],
            summary: draftSpec.summary ?? "",
            docMode: aiDocMode,
          },
          groupId,
        ),
        docMode: aiDocMode,
        content: aiDocMode === "single" ? draftSpec.content ?? "" : "",
        sections:
          aiDocMode === "sectioned"
            ? draftSectionsToRecords(draftSpec.sections)
            : [],
        variantOfId: index === 0 ? undefined : baseId,
        variantLabel:
          index === 0 ? undefined : draftSpec.variantLabel ?? `Variant ${index}`,
      });
      if (index === 0) baseId = created.id;
    }
  };

  if (groups && !activeGroup) {
    return (
      <div className="flex flex-col gap-5">
        <BDBackLink
          href={`/modules/bunny-dev/projects/${projectId}/specs`}
          label="Back to Specs"
        />
        <BDEmptyState
          icon={Building2}
          title="Group not found"
          description="This spec group may have been deleted."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <BDBackLink
        href={`/modules/bunny-dev/projects/${projectId}/specs`}
        label="Back to Specs"
      />
      <BDPageHeader
        icon={Building2}
        title={activeGroup?.name ?? "Spec Design"}
        description={
          activeGroup?.description ||
          "Author spec docs, ADRs, RFCs, plans, and variants — with markdown export and side-by-side comparison."
        }
        actions={
          <>
            <BDButton
              variant="secondary"
              icon={Sparkles}
              onClick={() => {
                setAiType("architecture");
                setAiDocMode("sectioned");
                setAiOpen(true);
              }}
            >
              AI Generate
            </BDButton>
            <BDButton
              variant="secondary"
              icon={Wand2}
              onClick={() => openRefine(draft?.id)}
            >
              AI Refine
            </BDButton>
            <BDButton icon={Plus} onClick={() => setCreating(true)}>
              New document
            </BDButton>
          </>
        }
      />

      <BDGenerationPanel<BDSpecArtifact>
        projectId={projectId}
        subsystem="specs"
        open={aiOpen}
        onOpenChange={setAiOpen}
        title="AI Document Assist · Generate"
        description="Generate a spec document or several alternative variants to compare."
        placeholder="e.g. Propose two architectures for a multi-tenant SaaS"
        generate={({ instruction, mode, aiConfig, targetContext }) =>
          bdGenerateSpec({
            instruction,
            mode,
            type: aiType,
            docMode: aiDocMode,
            variants: 1,
            targetContext,
            aiConfig,
          })
        }
        onApply={applyArtifact}
        defaultMode="create"
        targets={groupRecords.map((r) => ({ id: r.id, label: r.name }))}
        targetLabel="Document"
        buildTargetContext={(id) => {
          const record = groupRecords.find((r) => r.id === id);
          return record ? bdSerializeTarget(record) : undefined;
        }}
        extraFields={
          <>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-slate-500">
                Type
              </span>
              <select
                value={aiType}
                onChange={(e) => setAiType(e.target.value as BDSpecType)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-blue-400"
              >
                {BD_SPEC_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-slate-500">
                Structure
              </span>
              <select
                value={aiDocMode}
                onChange={(e) => setAiDocMode(e.target.value as BDSpecDocMode)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-blue-400"
              >
                <option value="sectioned">Sectionized document</option>
                <option value="single">Single content</option>
              </select>
            </label>
          </>
        }
        renderPreview={(artifact) => (
          <div className="flex flex-col gap-3">
            {artifact.specs.map((a, i) => (
              <div key={i} className="rounded-xl border border-slate-200 p-3">
                <div className="mb-2">
                  <p className="text-sm font-semibold text-slate-800">{a.name}</p>
                  <p className="text-xs text-slate-500">
                    {a.type} ·{" "}
                    {aiDocMode === "single"
                      ? "single content"
                      : `${(a.sections ?? []).length} sections`}
                    {a.variantLabel ? ` · ${a.variantLabel}` : ""}
                  </p>
                </div>
                <div className="bd-scroll max-h-[50vh] overflow-y-auto rounded-lg border border-slate-100 p-3">
                  <BDMarkdownView
                    content={specDraftToMarkdown({
                      name: a.name,
                      summary: a.summary,
                      content: a.content,
                      sections: a.sections,
                    })}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      />

      <BDSpecRefineComponent
        open={refineOpen}
        onOpenChange={setRefineOpen}
        projectId={projectId}
        documents={groupRecords}
        initialDocumentId={refineDocId}
        onApply={handleRefineApply}
      />

      <BDSpecViewModal
        open={viewing !== null}
        onClose={() => setViewing(null)}
        record={viewing}
      />

      <BDList<BDSpecRecord>
        title="Documents"
        data={groupRecords}
        isLoading={records === undefined}
        getRowId={(row) => row.id}
        searchable
        searchPlaceholder="Search documents…"
        getSearchText={(row) => `${row.name} ${row.type} ${row.status}`}
        emptyState={{
          title: "No documents yet",
          description: "Create a spec document or generate one.",
        }}
        onRowClick={(row) => setDraft(row)}
        columns={[
          {
            key: "name",
            label: "Name",
            sortable: true,
            render: (row) => (
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-slate-800">{row.name}</span>
                {row.variantLabel && (
                  <BDBadge color="info">{row.variantLabel}</BDBadge>
                )}
              </div>
            ),
          },
          { key: "type", label: "Type", width: 120 },
          {
            key: "status",
            label: "Status",
            width: 130,
            render: (row) => <BDBadge color="gray">{row.status}</BDBadge>,
          },
          {
            key: "docMode",
            label: "Mode",
            width: 110,
            render: (row) => (
              <span className="text-slate-500">
                {inferDocMode(row) === "single" ? "Single" : "Sectioned"}
              </span>
            ),
          },
          {
            key: "sections",
            label: "Sections",
            width: 90,
            render: (row) => (
              <span className="text-slate-500">{row.sections.length}</span>
            ),
          },
          {
            key: "updatedAt",
            label: "Updated",
            width: 130,
            sortable: true,
            render: (row) => (
              <span className="text-slate-400">
                {row.updatedAt
                  ? new Date(row.updatedAt).toLocaleDateString()
                  : "—"}
              </span>
            ),
          },
        ]}
        rowActions={[
          {
            label: "View",
            icon: Eye,
            iconOnly: true,
            tooltip: "View document",
            onSelect: ([row]) => setViewing(row),
          },
          {
            label: "Refine",
            icon: Wand2,
            iconOnly: true,
            tooltip: "AI refine",
            onSelect: ([row]) => openRefine(row.id),
          },
          {
            label: "Delete",
            icon: Trash2,
            variant: "danger",
            iconOnly: true,
            tooltip: "Delete document",
            onSelect: ([row]) => setDeleting(row),
          },
        ]}
      />

      <BDDrawer
        open={draft !== null}
        onClose={() => setDraft(null)}
        title={draft?.name ?? "Document"}
        description={draft ? `${draft.type} · ${draft.status}` : undefined}
        width="48rem"
        footer={
          <>
            <BDButton
              size="sm"
              variant="secondary"
              icon={Wand2}
              onClick={() => draft && openRefine(draft.id)}
            >
              AI Refine
            </BDButton>
            <BDButton
              size="sm"
              icon={Save}
              isLoading={saving}
              onClick={handleSave}
            >
              Save
            </BDButton>
          </>
        }
      >
        {draft && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400">
                {draft.sections.length} sections
                {variants.length > 0 ? ` · ${variants.length} variants` : ""}
              </span>
              <div className="flex flex-wrap gap-2">
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
                  onClick={handleHandoff}
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

            {variants.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-blue-100 bg-blue-50/50 px-3 py-2">
                <span className="text-xs font-medium text-slate-500">
                  Variants:
                </span>
                {variants.map((variant) => (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => setDraft(variant)}
                    className="flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-xs text-slate-600 hover:text-blue-600"
                  >
                    <GitCompare className="h-3 w-3" />
                    {variant.variantLabel ?? variant.name}
                  </button>
                ))}
                <BDButton
                  size="sm"
                  variant="ghost"
                  icon={GitCompare}
                  onClick={() => setCompare(variants[0])}
                >
                  Compare
                </BDButton>
              </div>
            )}

            <BDSpecComponent
              record={draft}
              onChange={update}
              onCreateVariant={createVariant}
              onDelete={() => setDeleting(draft)}
            />
          </div>
        )}
      </BDDrawer>

      <BDSpecCreateModal
        open={creating}
        onClose={() => setCreating(false)}
        onSubmit={handleCreate}
      />

      <BDModal
        open={compare !== null}
        onClose={() => setCompare(null)}
        title="Compare variants"
        size="full"
      >
        {draft && compare && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 p-4">
              <h3 className="mb-2 text-sm font-semibold text-blue-700">
                {draft.name}
              </h3>
              <BDMarkdownView content={toSpecMarkdown(draft)} />
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <h3 className="mb-2 text-sm font-semibold text-violet-700">
                {compare.name}
              </h3>
              <BDMarkdownView content={toSpecMarkdown(compare)} />
            </div>
          </div>
        )}
      </BDModal>

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

export default BDSpecBuilderComponent;
