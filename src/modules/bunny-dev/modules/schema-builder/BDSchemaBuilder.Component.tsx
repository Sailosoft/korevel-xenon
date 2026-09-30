"use client";

// BDSchemaBuilder.Component — the SchemaBuilder page.
//
// Left: schema group switcher. Center: the models in the active group.
// Header: AI generation modal + Prisma/model-builder export. Model editing
// happens in a drawer (BDSchemaModel.Component).

import { useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Database,
  Plus,
  Pencil,
  Trash2,
  Download,
  Copy,
  FileCode2,
  Sparkles,
  ExternalLink,
  Network,
} from "lucide-react";
import { bdDB } from "../../BDDatabase";
import type {
  BDSchemaGroup,
  BDSchemaModel,
  BDSchemaProperty,
  BDSchemaType,
  BDGenerationMode,
} from "../../BDDomain.Types";
import { useBDProjectContext } from "../core/BDProject.Context";
import { bdSchemaGroupRepository, bdSchemaModelRepository } from "./BDSchemaBuilder.Repository";
import { useBDSchemaGroups, useBDSchemaModels } from "./BDSchemaBuilder.Hooks";
import { slugifyTable, type BDSchemaArtifact, type BDSchemaGroupForm } from "./BDSchemaBuilder.Types";
import { bdGenerateSchema } from "./BDSchemaBuilder.Server";
import { generatePrismaExport } from "./BDPrismaExport.Server";
import BDSchemaGroupComponent from "./BDSchemaGroup.Component";
import BDSchemaModelComponent from "./BDSchemaModel.Component";
import BDSchemaErdComponent from "./BDSchemaErd.Component";
import BDPageHeader from "../../components/BDPageHeader";
import BDButton from "../../components/BDButton";
import BDList from "../../components/BDList";
import BDModal from "../../components/BDModal";
import BDConfirmDialog from "../../components/BDConfirmDialog";
import BDCodeEditor from "../../components/BDCodeEditor";
import BDBadge from "../../components/BDBadge";
import BDEmptyState from "../../components/BDEmptyState";
import BDGenerationPanel from "../agent-manager/BDGenerationPanel";
import { useBDToast } from "../../components/BDToast";
import { copyText, downloadText } from "../../BDDownload";

export interface BDSchemaBuilderComponentProps {
  /** Preselect a schema group (deep-route `[groupId]`). */
  initialGroupId?: string;
}

export function BDSchemaBuilderComponent({
  initialGroupId,
}: BDSchemaBuilderComponentProps = {}) {
  const { projectId } = useBDProjectContext();
  const { toast } = useBDToast();

  const groups = useBDSchemaGroups(projectId);
  const allModels = useLiveQuery(
    () => bdDB.schemaModels.where("projectId").equals(projectId).toArray(),
    [projectId],
  );

  const [activeGroupId, setActiveGroupId] = useState<string | undefined>(
    initialGroupId,
  );
  const [groupModal, setGroupModal] = useState<{
    open: boolean;
    group: BDSchemaGroup | null;
    busy: boolean;
  }>({ open: false, group: null, busy: false });
  const [deletingGroup, setDeletingGroup] = useState<BDSchemaGroup | null>(null);
  const [editingModel, setEditingModel] = useState<BDSchemaModel | null>(null);
  const [deletingModel, setDeletingModel] = useState<BDSchemaModel | null>(null);
  const [savingModel, setSavingModel] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportTab, setExportTab] = useState<"prisma" | "builder">("prisma");
  const [exportText, setExportText] = useState("");
  const [aiOpen, setAiOpen] = useState(false);
  const [erdOpen, setErdOpen] = useState(false);

  // Adopt a new `initialGroupId` from the deep route (render-time adjustment).
  const [prevInitialGroupId, setPrevInitialGroupId] = useState(initialGroupId);
  if (initialGroupId !== prevInitialGroupId) {
    setPrevInitialGroupId(initialGroupId);
    if (initialGroupId) setActiveGroupId(initialGroupId);
  }

  // Keep a valid active group selected (render-time adjustment). While the
  // groups query is still loading, keep the requested id so a deep-linked
  // group is not cleared before it arrives.
  const resolvedGroupId =
    activeGroupId && groups?.some((g) => g.id === activeGroupId)
      ? activeGroupId
      : groups === undefined
        ? activeGroupId
        : groups[0]?.id;
  if (resolvedGroupId !== activeGroupId) {
    setActiveGroupId(resolvedGroupId);
  }

  const models = useBDSchemaModels(resolvedGroupId);
  const activeGroup = groups?.find((g) => g.id === resolvedGroupId);

  const handleGroupSubmit = async (form: BDSchemaGroupForm) => {
    setGroupModal((prev) => ({ ...prev, busy: true }));
    try {
      if (groupModal.group) {
        await bdSchemaGroupRepository.update(groupModal.group.id, {
          name: form.name,
          description: form.description,
        });
      } else {
        const created = await bdSchemaGroupRepository.createGroup(
          projectId,
          form.name,
          form.description,
        );
        setActiveGroupId(created.id);
      }
      setGroupModal({ open: false, group: null, busy: false });
      toast({ title: "Group saved", status: "success" });
    } catch (err) {
      setGroupModal((prev) => ({ ...prev, busy: false }));
      toast({
        title: "Could not save group",
        description: err instanceof Error ? err.message : undefined,
        status: "error",
      });
    }
  };

  const handleDeleteGroup = async () => {
    if (!deletingGroup) return;
    await bdSchemaGroupRepository.delete(deletingGroup.id);
    setDeletingGroup(null);
    setActiveGroupId(undefined);
    toast({ title: "Group deleted", status: "success" });
  };

  const handleAddModel = async () => {
    if (!resolvedGroupId) {
      toast({ title: "Create a schema group first", status: "warning" });
      return;
    }
    const model = await bdSchemaModelRepository.createModel(
      projectId,
      resolvedGroupId,
      "",
    );
    setEditingModel(model);
  };

  const handleSaveModel = async (draft: BDSchemaModel) => {
    setSavingModel(true);
    try {
      await bdSchemaModelRepository.update(draft.id, draft);
      setEditingModel(draft);
      toast({ title: "Model saved", status: "success" });
    } finally {
      setSavingModel(false);
    }
  };

  const handleDeleteModel = async () => {
    if (!deletingModel) return;
    await bdSchemaModelRepository.delete(deletingModel.id);
    if (editingModel?.id === deletingModel.id) setEditingModel(null);
    setDeletingModel(null);
    toast({ title: "Model deleted", status: "success" });
  };

  const openExport = async () => {
    const result = await generatePrismaExport(allModels ?? []);
    setExportText(exportTab === "prisma" ? result.prisma : result.modelBuilder);
    setExportOpen(true);
  };

  const applyArtifact = async (
    artifact: BDSchemaArtifact,
    mode: BDGenerationMode,
  ) => {
    if (mode === "replace") {
      for (const group of groups ?? []) {
        await bdSchemaGroupRepository.delete(group.id);
      }
    }

    for (const groupDraft of artifact.groups) {
      const group =
        mode === "append" && activeGroup
          ? activeGroup
          : await bdSchemaGroupRepository.createGroup(
              projectId,
              groupDraft.name,
              groupDraft.description ?? "",
            );

      const created: BDSchemaModel[] = [];
      for (const modelDraft of groupDraft.models) {
        const properties: BDSchemaProperty[] = modelDraft.properties.map((p) => ({
          name: p.name,
          type: p.type as BDSchemaType,
          nullable: !!p.nullable,
          primary: !!p.primary,
          unique: !!p.unique,
          default: p.default,
          values: p.values,
        }));
        const createdModel = await bdSchemaModelRepository.create({
          projectId,
          groupId: group.id,
          name: modelDraft.name,
          table: modelDraft.table || slugifyTable(modelDraft.name),
          description: modelDraft.description,
          properties,
          relations: [],
          indexes: (modelDraft.indexes ?? []).map((i) => ({
            columns: i.columns,
            type: i.type as BDSchemaModel["indexes"][number]["type"],
          })),
          primaryKey: properties.filter((p) => p.primary).map((p) => p.name),
          timestamps: modelDraft.timestamps ?? true,
          softDeletes: modelDraft.softDeletes ?? false,
        });
        created.push(createdModel);
      }

      const byName = new Map(created.map((m) => [m.name, m.id]));
      for (let index = 0; index < groupDraft.models.length; index++) {
        const relDrafts = groupDraft.models[index].relations ?? [];
        if (relDrafts.length === 0) continue;
        const relations = relDrafts
          .map((r) => ({
            name: r.name,
            type: r.type as BDSchemaModel["relations"][number]["type"],
            targetModelId: byName.get(r.target) ?? "",
            foreignKey: r.foreignKey,
            nullable: r.nullable,
          }))
          .filter((r) => r.targetModelId);
        await bdSchemaModelRepository.update(created[index].id, { relations });
      }
    }

    setActiveGroupId(undefined);
  };

  return (
    <div className="flex flex-col gap-5">
      <BDPageHeader
        icon={Database}
        title="Schema Builder"
        description="Design database schemas as groups of models with columns, relations, and indexes — then export to Prisma or a TypeScript model file."
        actions={
          <>
            <BDButton
              variant="secondary"
              icon={Sparkles}
              onClick={() => setAiOpen(true)}
            >
              AI Generate
            </BDButton>
            <BDButton variant="secondary" icon={FileCode2} onClick={openExport}>
              Export
            </BDButton>
            <BDButton
              variant="secondary"
              icon={Network}
              onClick={() => setErdOpen(true)}
            >
              ER Diagram
            </BDButton>
            <BDButton
              icon={Plus}
              onClick={() => setGroupModal({ open: true, group: null, busy: false })}
            >
              New group
            </BDButton>
          </>
        }
      />

      <BDGenerationPanel<BDSchemaArtifact>
        projectId={projectId}
        subsystem="schema"
        open={aiOpen}
        onOpenChange={setAiOpen}
        title="AI Schema Generation"
        description="Generate schema groups and models from a description. Relations are resolved by model name on apply."
        placeholder="e.g. An e-commerce schema with users, products, orders, order items"
        generate={({ instruction, mode, aiConfig }) =>
          bdGenerateSchema({
            instruction,
            mode,
            existingModels: allModels?.map((m) => m.name),
            aiConfig,
          })
        }
        onApply={applyArtifact}
        renderPreview={(artifact) => (
          <div className="flex flex-col gap-3">
            {artifact.groups.map((group, index) => (
              <div key={index} className="rounded-lg border border-slate-200 p-3">
                <p className="text-sm font-semibold text-slate-800">
                  {group.name}
                </p>
                <p className="text-xs text-slate-500">{group.description}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {group.models.map((model) => (
                    <BDBadge key={model.name} color="primary">
                      {model.name} · {model.properties.length} cols
                    </BDBadge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[16rem_1fr]">
        {/* Groups */}
        <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3">
          <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Schema groups
          </h3>
          {(groups ?? []).map((group) => (
            <div
              key={group.id}
              className={`group flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                group.id === resolvedGroupId
                  ? "bg-blue-50 font-semibold text-blue-700"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <button
                type="button"
                className="flex-1 text-left"
                onClick={() => setActiveGroupId(group.id)}
              >
                {group.name}
              </button>
              <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <Link
                  href={`/modules/bunny-dev/projects/${projectId}/schema/${group.id}`}
                  className="rounded p-1 text-slate-400 hover:text-blue-600"
                  aria-label="Open group"
                  title="Open group"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
                <button
                  type="button"
                  className="rounded p-1 text-slate-400 hover:text-blue-600"
                  onClick={() =>
                    setGroupModal({ open: true, group, busy: false })
                  }
                  aria-label="Rename group"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="rounded p-1 text-slate-400 hover:text-red-500"
                  onClick={() => setDeletingGroup(group)}
                  aria-label="Delete group"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
          {groups && groups.length === 0 && (
            <p className="px-2 py-3 text-xs text-slate-400">
              No groups yet. Create one to start.
            </p>
          )}
          <BDButton
            size="sm"
            variant="secondary"
            icon={Plus}
            onClick={() => setGroupModal({ open: true, group: null, busy: false })}
          >
            Add group
          </BDButton>
        </div>

        {/* Models */}
        <div className="flex flex-col gap-3">
          {activeGroup ? (
            <BDList<BDSchemaModel>
              title={`Models in ${activeGroup.name}`}
              data={models ?? []}
              isLoading={models === undefined}
              getRowId={(row) => row.id}
              searchable
              getSearchText={(row) => `${row.name} ${row.table}`}
              emptyState={{
                title: "No models yet",
                description: "Add a model to start designing tables.",
              }}
              onRowClick={(row) => setEditingModel(row)}
              toolbar={
                <BDButton size="sm" icon={Plus} onClick={handleAddModel}>
                  Add model
                </BDButton>
              }
              columns={[
                {
                  key: "name",
                  label: "Model",
                  sortable: true,
                  render: (row) => (
                    <span className="font-medium text-slate-800">
                      {row.name || "Untitled model"}
                    </span>
                  ),
                },
                { key: "table", label: "Table", sortable: true },
                {
                  key: "properties",
                  label: "Columns",
                  render: (row) => (
                    <BDBadge>{row.properties.length}</BDBadge>
                  ),
                },
                {
                  key: "relations",
                  label: "Relations",
                  render: (row) => <BDBadge>{row.relations.length}</BDBadge>,
                },
              ]}
              rowActions={[
                {
                  label: "Edit",
                  icon: Pencil,
                  onSelect: ([row]) => setEditingModel(row),
                },
                {
                  label: "Delete",
                  icon: Trash2,
                  variant: "danger",
                  onSelect: ([row]) => setDeletingModel(row),
                },
              ]}
            />
          ) : (
            <BDEmptyState
              icon={Database}
              title="No active group"
              description="Create a schema group to begin modelling."
              action={
                <BDButton
                  icon={Plus}
                  onClick={() =>
                    setGroupModal({ open: true, group: null, busy: false })
                  }
                >
                  New group
                </BDButton>
              }
            />
          )}
        </div>
      </div>

      <BDSchemaGroupComponent
        open={groupModal.open}
        group={groupModal.group}
        isLoading={groupModal.busy}
        onClose={() => setGroupModal({ open: false, group: null, busy: false })}
        onSubmit={handleGroupSubmit}
      />

      <BDSchemaErdComponent
        open={erdOpen}
        onClose={() => setErdOpen(false)}
        group={activeGroup ?? null}
        models={models ?? []}
      />

      <BDSchemaModelComponent
        open={!!editingModel}
        model={editingModel}
        allModels={allModels ?? []}
        isSaving={savingModel}
        onClose={() => setEditingModel(null)}
        onSave={handleSaveModel}
        onDelete={() => {
          if (editingModel) setDeletingModel(editingModel);
        }}
      />

      <BDConfirmDialog
        open={!!deletingGroup}
        title={`Delete ${deletingGroup?.name ?? "group"}?`}
        description="All models in this group will be deleted."
        confirmLabel="Delete group"
        onConfirm={handleDeleteGroup}
        onCancel={() => setDeletingGroup(null)}
      />

      <BDConfirmDialog
        open={!!deletingModel}
        title={`Delete ${deletingModel?.name ?? "model"}?`}
        confirmLabel="Delete model"
        onConfirm={handleDeleteModel}
        onCancel={() => setDeletingModel(null)}
      />

      <BDModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title="Schema export"
        size="xl"
        footer={
          <>
            <BDButton
              variant="secondary"
              icon={Copy}
              onClick={async () => {
                const ok = await copyText(exportText);
                toast({
                  title: ok ? "Copied to clipboard" : "Copy failed",
                  status: ok ? "success" : "error",
                });
              }}
            >
              Copy
            </BDButton>
            <BDButton
              icon={Download}
              onClick={() =>
                downloadText(
                  exportTab === "prisma" ? "schema.prisma" : "models.ts",
                  exportText,
                )
              }
            >
              Download
            </BDButton>
          </>
        }
      >
        <div className="mb-3 flex gap-2">
          {(
            [
              ["prisma", "Prisma schema"],
              ["builder", "Model builder (.ts)"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setExportTab(key);
                void (async () => {
                  const result = await generatePrismaExport(allModels ?? []);
                  setExportText(key === "prisma" ? result.prisma : result.modelBuilder);
                })();
              }}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                exportTab === key
                  ? "bg-blue-100 font-semibold text-blue-700"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <BDCodeEditor
          value={exportText}
          language={exportTab === "prisma" ? "text" : "typescript"}
          readOnly
          height={420}
        />
      </BDModal>
    </div>
  );
}

export default BDSchemaBuilderComponent;
