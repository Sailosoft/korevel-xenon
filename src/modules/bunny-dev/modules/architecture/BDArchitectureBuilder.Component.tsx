"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Plus,
  Trash2,
  Download,
  GitCompare,
  Save,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import type { BDArchitectureRecord } from "../../BDDomain.Types";
import { useBDProjectContext } from "../core/BDProject.Context";
import { useBDArchitectures } from "./BDArchitecture.Hooks";
import { bdArchitectureRepository } from "./BDArchitecture.Repository";
import {
  BD_ARCHITECTURE_EMPTY_FORM,
  createArchitecture,
  createSection,
  slugify,
  type BDArchitectureArtifact,
  type BDArchitectureForm,
} from "./BDArchitecture.Types";
import { bdGenerateArchitecture } from "./BDArchitectureBuilder.Server";
import {
  toArchitectureHtml,
  toArchitectureMarkdown,
} from "./BDArchitectureExport";
import BDArchitectureComponent from "./BDArchitecture.Component";
import BDPageHeader from "../../components/BDPageHeader";
import BDButton from "../../components/BDButton";
import BDList from "../../components/BDList";
import BDModal from "../../components/BDModal";
import BDForm from "../../components/BDForm";
import BDBadge from "../../components/BDBadge";
import BDMarkdownView from "../../components/BDMarkdownView";
import BDEmptyState from "../../components/BDEmptyState";
import BDConfirmDialog from "../../components/BDConfirmDialog";
import BDGenerationPanel from "../agent-manager/BDGenerationPanel";
import { useBDToast } from "../../components/BDToast";
import { downloadText } from "../../BDDownload";

const ARCH_FIELDS = [
  { name: "name", label: "Name", type: "text" as const, required: true },
  { name: "slug", label: "Slug", type: "text" as const },
  {
    name: "summary",
    label: "Summary",
    type: "textarea" as const,
    columnSpan: "full" as const,
  },
];

export interface BDArchitectureBuilderComponentProps {
  /** Preselect a document (deep-route `[architectureId]`). */
  initialId?: string;
}

export function BDArchitectureBuilderComponent({
  initialId,
}: BDArchitectureBuilderComponentProps = {}) {
  const { projectId } = useBDProjectContext();
  const { toast } = useBDToast();
  const router = useRouter();
  const records = useBDArchitectures(projectId);

  const [draft, setDraft] = useState<BDArchitectureRecord | null>(null);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<BDArchitectureForm>(
    BD_ARCHITECTURE_EMPTY_FORM,
  );
  const [deleting, setDeleting] = useState<BDArchitectureRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [compare, setCompare] = useState<BDArchitectureRecord | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [initialPending, setInitialPending] = useState(Boolean(initialId));

  // Preselect the deep-linked document once its live query arrives (render-time
  // adjustment, not an effect).
  if (initialPending && initialId && records) {
    const target = records.find((r) => r.id === initialId);
    if (target) {
      setInitialPending(false);
      setDraft(target);
    }
  }

  const update = (patch: Partial<BDArchitectureRecord>) =>
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));

  const variants = (records ?? []).filter(
    (r) => r.variantOfId && r.variantOfId === draft?.id,
  );

  const handleCreate = async (values: Record<string, unknown>) => {
    const created = await bdArchitectureRepository.create(
      createArchitecture(projectId, values as unknown as BDArchitectureForm),
    );
    setCreating(false);
    setDraft(created);
    toast({ title: "Architecture created", status: "success" });
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      await bdArchitectureRepository.update(draft.id, {
        ...draft,
        updatedAt: new Date().toISOString(),
      });
      toast({ title: "Architecture saved", status: "success" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    await bdArchitectureRepository.delete(deleting.id);
    if (draft?.id === deleting.id) setDraft(null);
    setDeleting(null);
    toast({ title: "Deleted", status: "success" });
  };

  const createVariant = async () => {
    if (!draft) return;
    const label = `Variant ${variants.length + 1}`;
    const variant = await bdArchitectureRepository.create({
      projectId: draft.projectId,
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

  const applyArtifact = async (artifact: BDArchitectureArtifact) => {
    let baseId: string | undefined;
    for (let index = 0; index < artifact.architectures.length; index++) {
      const draftArch = artifact.architectures[index];
      const created = await bdArchitectureRepository.create({
        ...createArchitecture(projectId, {
          name: draftArch.name,
          slug: "",
          type: (draftArch.type ?? "architecture") as BDArchitectureRecord["type"],
          status: (draftArch.status ?? "draft") as BDArchitectureRecord["status"],
          summary: draftArch.summary ?? "",
        }),
        sections: (draftArch.sections ?? []).map((s, i) => ({
          ...createSection(s.title, (s.level ?? 2) as 1 | 2 | 3 | 4 | 5 | 6, i),
          content: s.content ?? "",
        })),
        variantOfId: index === 0 ? undefined : baseId,
        variantLabel: index === 0 ? undefined : draftArch.variantLabel ?? `Variant ${index}`,
      });
      if (index === 0) baseId = created.id;
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <BDPageHeader
        icon={Building2}
        title="Architecture Design"
        description="Author architecture docs, ADRs, RFCs, plans, and variants — with markdown export and side-by-side comparison."
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
                setCreateForm(BD_ARCHITECTURE_EMPTY_FORM);
                setCreating(true);
              }}
            >
              New document
            </BDButton>
          </>
        }
      />

      <BDGenerationPanel<BDArchitectureArtifact>
        projectId={projectId}
        subsystem="architecture"
        open={aiOpen}
        onOpenChange={setAiOpen}
        title="AI Architecture Generation"
        description="Generate an architecture document or several alternative variants to compare."
        placeholder="e.g. Propose two architectures for a multi-tenant SaaS"
        generate={({ instruction, mode, aiConfig }) =>
          bdGenerateArchitecture({
            instruction,
            mode,
            variants: mode === "create" ? 1 : 2,
            aiConfig,
          })
        }
        onApply={applyArtifact}
        defaultMode="create"
        renderPreview={(artifact) => (
          <div className="flex flex-col gap-2">
            {artifact.architectures.map((a, i) => (
              <div key={i} className="rounded-lg border border-slate-200 p-3">
                <p className="text-sm font-semibold text-slate-800">{a.name}</p>
                <p className="text-xs text-slate-500">
                  {a.type} · {(a.sections ?? []).length} sections
                  {a.variantLabel ? ` · ${a.variantLabel}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[20rem_1fr]">
        <BDList<BDArchitectureRecord>
          title="Documents"
          data={records ?? []}
          isLoading={records === undefined}
          getRowId={(row) => row.id}
          searchable
          getSearchText={(row) => `${row.name} ${row.type} ${row.status}`}
          emptyState={{
            title: "No documents yet",
            description: "Create an architecture document or generate one.",
          }}
          onRowClick={(row) => setDraft(row)}
          columns={[
            {
              key: "name",
              label: "Name",
              render: (row) => (
                <div>
                  <span className="font-medium text-slate-800">
                    {row.name}
                  </span>
                  {row.variantLabel && (
                    <BDBadge color="info" className="ml-1">
                      {row.variantLabel}
                    </BDBadge>
                  )}
                </div>
              ),
            },
            { key: "type", label: "Type", width: 100 },
          ]}
          rowActions={[
            {
              label: "Open",
              icon: ExternalLink,
              onSelect: ([row]) =>
                router.push(
                  `/modules/bunny-dev/projects/${projectId}/architecture/${row.id}`,
                ),
            },
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
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {draft.sections.length} sections
                  {variants.length > 0 ? ` · ${variants.length} variants` : ""}
                </span>
                <div className="flex gap-2">
                  <BDButton
                    size="sm"
                    variant="secondary"
                    icon={Download}
                    onClick={() =>
                      downloadText(
                        `${draft.slug}.md`,
                        toArchitectureMarkdown(draft),
                        "text/markdown",
                      )
                    }
                  >
                    Export markdown
                  </BDButton>
                  <BDButton
                    size="sm"
                    variant="secondary"
                    icon={Download}
                    onClick={() =>
                      downloadText(
                        `${draft.slug}.html`,
                        toArchitectureHtml(draft),
                        "text/html",
                      )
                    }
                  >
                    HTML
                  </BDButton>
                  <BDButton size="sm" icon={Save} isLoading={saving} onClick={handleSave}>
                    Save
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

              <BDArchitectureComponent
                record={draft}
                onChange={update}
                onCreateVariant={createVariant}
                onDelete={() => setDeleting(draft)}
              />
            </>
          ) : (
            <BDEmptyState
              icon={Building2}
              title="Select a document"
              description="Pick an architecture document or create a new one."
            />
          )}
        </div>
      </div>

      <BDModal
        open={creating}
        onClose={() => setCreating(false)}
        title="New architecture document"
        size="lg"
      >
        <BDForm
          fields={ARCH_FIELDS}
          value={createForm as unknown as Record<string, unknown>}
          onChange={(v) => setCreateForm(v as unknown as BDArchitectureForm)}
          onSubmit={handleCreate}
          onCancel={() => setCreating(false)}
          submitLabel="Create document"
        />
      </BDModal>

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
              <BDMarkdownView content={toArchitectureMarkdown(draft)} />
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <h3 className="mb-2 text-sm font-semibold text-violet-700">
                {compare.name}
              </h3>
              <BDMarkdownView content={toArchitectureMarkdown(compare)} />
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

export default BDArchitectureBuilderComponent;
