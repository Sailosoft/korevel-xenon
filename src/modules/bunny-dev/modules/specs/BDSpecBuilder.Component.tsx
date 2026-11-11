"use client";

// BDSpecBuilder.Component — Specs page 2: the documents inside
// one spec group. Group management lives on page 1
// (BDSpecGroupListComponent); individual documents live on page 3
// (BDSpecDetailComponent).

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Eye,
  Plus,
  Sparkles,
  Trash2,
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
  specDraftToMarkdown,
  type BDSpecGenerationArtifact,
  type BDSpecSectionDraft,
} from "./BDSpec.Types";
import { applySpecPatches, serializeSpecTarget } from "./BDSpec.Patch";
import { setBDSpecPendingPatches } from "./BDSpec.Pending";
import { bdGenerateSpec, bdPatchSpec } from "./BDSpecBuilder.Server";
import BDSpecChangesView from "./BDSpecChangesView";
import BDSpecCreateModal, {
  type BDSpecCreateInput,
} from "./BDSpecCreateModal.Component";
import BDPageHeader from "../../components/BDPageHeader";
import BDBackLink from "../../components/BDBackLink";
import BDButton from "../../components/BDButton";
import BDList from "../../components/BDList";
import BDBadge from "../../components/BDBadge";
import BDMarkdownView from "../../components/BDMarkdownView";
import BDEmptyState from "../../components/BDEmptyState";
import BDConfirmDialog from "../../components/BDConfirmDialog";
import BDGenerationPanel from "../agent-manager/BDGenerationPanel";
import { useBDToast } from "../../components/BDToast";

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

export interface BDSpecBuilderComponentProps {
  /** The spec group whose documents are shown. */
  initialGroupId?: string;
}

export function BDSpecBuilderComponent({
  initialGroupId,
}: BDSpecBuilderComponentProps = {}) {
  const { projectId } = useBDProjectContext();
  const { toast } = useBDToast();
  const router = useRouter();
  const groups = useBDSpecGroups(projectId);
  const records = useBDSpecs(projectId);

  const groupId = initialGroupId;
  const activeGroup = groups?.find((g) => g.id === groupId);
  const groupRecords = (records ?? []).filter((r) => r.groupId === groupId);

  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<BDSpecRecord | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiType, setAiType] = useState<BDSpecType>("architecture");
  const [aiDocMode, setAiDocMode] = useState<BDSpecDocMode>("sectioned");

  const specHref = (id: string) =>
    `/modules/bunny-dev/projects/${projectId}/specs/${groupId}/${id}`;

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
    toast({ title: "Spec created", status: "success" });
    router.push(specHref(created.id));
  };

  const handleDelete = async () => {
    if (!deleting) return;
    await bdSpecRepository.delete(deleting.id);
    setDeleting(null);
    toast({ title: "Deleted", status: "success" });
  };

  const applyGeneration = async (
    artifact: BDSpecGenerationArtifact,
    _mode: BDGenerationMode,
    targetId?: string,
  ) => {
    if (artifact.kind === "patches") {
      if (!targetId) throw new Error("Select a document first.");
      setBDSpecPendingPatches({
        specId: targetId,
        patches: artifact.patches,
        source: "generate",
      });
      return;
    }

    let baseId: string | undefined;
    let firstId: string | undefined;
    for (let index = 0; index < artifact.artifact.specs.length; index++) {
      const draftSpec = artifact.artifact.specs[index];
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
      if (index === 0) {
        baseId = created.id;
        firstId = created.id;
      }
    }

    if (firstId && groupId) router.push(specHref(firstId));
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
            <BDButton icon={Plus} onClick={() => setCreating(true)}>
              New document
            </BDButton>
          </>
        }
      />

      <BDGenerationPanel<BDSpecGenerationArtifact>
        projectId={projectId}
        subsystem="specs"
        open={aiOpen}
        onOpenChange={setAiOpen}
        title="AI Document Assist · Generate"
        description="Generate a spec document or several alternative variants to compare."
        placeholder="e.g. Propose two architectures for a multi-tenant SaaS"
        generate={async ({
          instruction,
          mode,
          aiConfig,
          targetContext,
          targetId,
        }): Promise<BDSpecGenerationArtifact> => {
          if (mode === "create") {
            const artifact = await bdGenerateSpec({
              instruction,
              mode,
              type: aiType,
              docMode: aiDocMode,
              variants: 1,
              targetContext,
              aiConfig,
            });
            return { kind: "create", artifact };
          }

          if (!targetId) throw new Error("Select a document first.");
          const target = groupRecords.find((record) => record.id === targetId);
          if (!target) throw new Error("The selected document no longer exists.");

          const { patches } = await bdPatchSpec({
            documentContext: targetContext ?? serializeSpecTarget(target),
            docMode: inferDocMode(target),
            mode,
            instruction,
            aiConfig,
          });
          const { record: after, summary } = applySpecPatches(target, patches);
          return { kind: "patches", patches, before: target, after, summary };
        }}
        onApply={applyGeneration}
        onApplied={(proposal) => {
          if (proposal.mode !== "create" && proposal.targetId) {
            router.push(specHref(proposal.targetId));
          }
        }}
        getAppliedToast={(_artifact, mode) =>
          mode === "create"
            ? { title: "Generated" }
            : {
                title: "AI changes staged",
                description: "Review the diff and Save to persist.",
              }
        }
        getReviewDescription={(mode) =>
          mode === "create"
            ? "Nothing is written until you apply. Applying creates new documents."
            : "Nothing is saved until you click Save in the document. Applying stages these patches in the document draft for review."
        }
        defaultMode="create"
        targets={groupRecords.map((r) => ({ id: r.id, label: r.name }))}
        targetLabel="Document"
        buildTargetContext={(id) => {
          const record = groupRecords.find((r) => r.id === id);
          return record ? serializeSpecTarget(record) : undefined;
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
        renderPreview={(artifact) => {
          if (artifact.kind === "create") {
            return (
              <div className="flex flex-col gap-3">
                {artifact.artifact.specs.map((a, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 p-3">
                    <div className="mb-2">
                      <p className="text-sm font-semibold text-slate-800">
                        {a.name}
                      </p>
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
            );
          }

          return (
            <div className="flex flex-col gap-3">
              <BDSpecChangesView
                before={artifact.before}
                after={artifact.after}
                patches={artifact.patches}
                fileName={artifact.after.name}
              />
              <div className="bd-scroll max-h-[50vh] overflow-y-auto rounded-lg border border-slate-100 p-3">
                <BDMarkdownView content={specDraftToMarkdown(artifact.after)} />
              </div>
            </div>
          );
        }}
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
        onRowClick={(row) => router.push(specHref(row.id))}
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
            label: "Open",
            icon: Eye,
            iconOnly: true,
            tooltip: "Open document",
            onSelect: ([row]) => router.push(specHref(row.id)),
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

      <BDSpecCreateModal
        open={creating}
        onClose={() => setCreating(false)}
        onSubmit={handleCreate}
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

export default BDSpecBuilderComponent;
