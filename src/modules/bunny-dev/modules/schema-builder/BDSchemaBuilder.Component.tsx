"use client";

// BDSchemaBuilder.Component — Schema Builder page 2: the models inside one
// schema group. Group management lives on page 1 (BDSchemaGroupListComponent).

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Database,
  Plus,
  Pencil,
  Trash2,
  Download,
  Copy,
  FileCode2,
  Network,
  BookOpen,
} from "lucide-react";
import { bdDB } from "../../BDDatabase";
import type { BDSchemaModel, BDSchemaRelation } from "../../BDDomain.Types";
import { useBDProjectContext } from "../core/BDProject.Context";
import { bdSchemaModelRepository } from "./BDSchemaBuilder.Repository";
import {
  createEmptyModel,
  suggestRelationName,
  type BDSchemaInverseRelationRequest,
} from "./BDSchemaBuilder.Types";
import { useBDSchemaGroups, useBDSchemaModels } from "./BDSchemaBuilder.Hooks";
import { generatePrismaExport } from "./BDPrismaExport.Server";
import BDSchemaModelComponent from "./BDSchemaModel.Component";
import BDSchemaErdComponent from "./BDSchemaErd.Component";
import BDSchemaDocComponent from "./BDSchemaDoc.Component";
import BDPageHeader from "../../components/BDPageHeader";
import BDBackLink from "../../components/BDBackLink";
import BDButton from "../../components/BDButton";
import BDList from "../../components/BDList";
import BDModal from "../../components/BDModal";
import BDConfirmDialog from "../../components/BDConfirmDialog";
import BDCodeEditor from "../../components/BDCodeEditor";
import BDBadge from "../../components/BDBadge";
import BDEmptyState from "../../components/BDEmptyState";
import { useBDToast } from "../../components/BDToast";
import { copyText, downloadText } from "../../BDDownload";

export interface BDSchemaBuilderComponentProps {
  /** The schema group whose models are shown. */
  initialGroupId?: string;
}

/**
 * Add the inverse side of relations created through "Add relation column".
 * Runs only after the current model is saved, so new models have a real id.
 */
async function applyInverseRelations(
  saved: BDSchemaModel,
  requests: BDSchemaInverseRelationRequest[],
): Promise<void> {
  for (const request of requests) {
    const belongsTo = saved.relations.some(
      (relation) =>
        relation.type === "belongsTo" &&
        relation.targetModelId === request.targetModelId &&
        relation.foreignKey === request.foreignKey,
    );
    if (!belongsTo) continue;
    if (request.targetModelId === saved.id) continue;

    const target = await bdSchemaModelRepository.get(request.targetModelId);
    if (!target) continue;
    if (
      target.relations.some(
        (relation) =>
          relation.targetModelId === saved.id &&
          relation.foreignKey === request.foreignKey,
      )
    ) {
      continue;
    }

    const ownerKey =
      saved.primaryKey[0] ??
      saved.properties.find((property) => property.primary)?.name ??
      saved.properties[0]?.name ??
      "id";
    const inverse: BDSchemaRelation = {
      name: suggestRelationName(
        "hasMany",
        saved.name.trim() || "model",
      ),
      type: "hasMany",
      targetModelId: saved.id,
      foreignKey: request.foreignKey,
      ownerKey,
    };

    try {
      await bdSchemaModelRepository.update(target.id, {
        relations: [...target.relations, inverse],
      });
    } catch {
      // The model is already saved; a failed inverse must not undo it.
    }
  }
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

  const groupId = initialGroupId;
  const activeGroup = groups?.find((g) => g.id === groupId);
  const models = useBDSchemaModels(groupId);
  const exportBaseName =
    (activeGroup?.name ?? "schema")
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "schema";

  const [editingModel, setEditingModel] = useState<BDSchemaModel | null>(null);
  const [isNewModel, setIsNewModel] = useState(false);
  const [deletingModel, setDeletingModel] = useState<BDSchemaModel | null>(null);
  const [savingModel, setSavingModel] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportTab, setExportTab] = useState<"prisma" | "builder">("prisma");
  const [exportText, setExportText] = useState("");
  const [erdOpen, setErdOpen] = useState(false);
  const [docOpen, setDocOpen] = useState(false);

  const openModel = (model: BDSchemaModel) => {
    setIsNewModel(false);
    setEditingModel(model);
  };

  const closeModel = () => {
    setIsNewModel(false);
    setEditingModel(null);
  };

  const handleAddModel = () => {
    if (!groupId) {
      toast({ title: "Group not found", status: "warning" });
      return;
    }
    setIsNewModel(true);
    setEditingModel(createEmptyModel(projectId, groupId));
  };

  const handleSaveModel = async (
    draft: BDSchemaModel,
    inverseRequests: BDSchemaInverseRelationRequest[] = [],
  ): Promise<boolean> => {
    setSavingModel(true);
    try {
      const saved = isNewModel
        ? await bdSchemaModelRepository.createFromDraft(draft)
        : await bdSchemaModelRepository.update(draft.id, draft);
      if (!saved) {
        toast({ title: "Model not found", status: "error" });
        return false;
      }
      setIsNewModel(false);
      setEditingModel(saved);
      await applyInverseRelations(saved, inverseRequests);
      toast({ title: "Model saved", status: "success" });
      return true;
    } catch (err) {
      toast({
        title: "Could not save model",
        description: err instanceof Error ? err.message : undefined,
        status: "error",
      });
      return false;
    } finally {
      setSavingModel(false);
    }
  };

  const handleDeleteModel = async () => {
    if (!deletingModel) return;
    await bdSchemaModelRepository.delete(deletingModel.id);
    if (editingModel?.id === deletingModel.id) closeModel();
    setDeletingModel(null);
    toast({ title: "Model deleted", status: "success" });
  };

  const openExport = async () => {
    const result = await generatePrismaExport(models ?? [], activeGroup?.name);
    setExportText(exportTab === "prisma" ? result.prisma : result.modelBuilder);
    setExportOpen(true);
  };

  if (groups && !activeGroup) {
    return (
      <div className="flex flex-col gap-5">
        <BDBackLink
          href={`/modules/bunny-dev/projects/${projectId}/schema`}
          label="Back to Schema"
        />
        <BDEmptyState
          icon={Database}
          title="Group not found"
          description="This schema group may have been deleted."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <BDBackLink
        href={`/modules/bunny-dev/projects/${projectId}/schema`}
        label="Back to Schema"
      />
      <BDPageHeader
        icon={Database}
        title={activeGroup?.name ?? "Schema group"}
        description={
          activeGroup?.description ||
          "Design the models in this group with columns, relations, and indexes — then export to Prisma or a TypeScript model file."
        }
        actions={
          <>
            <BDButton variant="secondary" icon={FileCode2} onClick={openExport}>
              Export
            </BDButton>
            <BDButton
              variant="secondary"
              icon={BookOpen}
              onClick={() => setDocOpen(true)}
            >
              Schema
            </BDButton>
            <BDButton
              variant="secondary"
              icon={Network}
              onClick={() => setErdOpen(true)}
            >
              ER Diagram
            </BDButton>
            <BDButton icon={Plus} onClick={handleAddModel}>
              Add model
            </BDButton>
          </>
        }
      />

      <BDList<BDSchemaModel>
        title={activeGroup ? `Models in ${activeGroup.name}` : "Models"}
        data={models ?? []}
        isLoading={models === undefined}
        getRowId={(row) => row.id}
        searchable
        getSearchText={(row) => `${row.name} ${row.table}`}
        emptyState={{
          title: "No models yet",
          description: "Add a model to start designing tables.",
        }}
        onRowClick={(row) => openModel(row)}
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
            render: (row) => <BDBadge>{row.properties.length}</BDBadge>,
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
            iconOnly: true,
            tooltip: "Edit model",
            onSelect: ([row]) => openModel(row),
          },
          {
            label: "Delete",
            icon: Trash2,
            variant: "danger",
            iconOnly: true,
            tooltip: "Delete model",
            onSelect: ([row]) => setDeletingModel(row),
          },
        ]}
      />

      <BDSchemaErdComponent
        open={erdOpen}
        onClose={() => setErdOpen(false)}
        group={activeGroup ?? null}
        models={models ?? []}
      />

      <BDSchemaDocComponent
        open={docOpen}
        onClose={() => setDocOpen(false)}
        group={activeGroup ?? null}
        models={models ?? []}
      />

      <BDSchemaModelComponent
        open={!!editingModel}
        model={editingModel}
        allModels={allModels ?? []}
        isSaving={savingModel}
        onClose={closeModel}
        onSave={handleSaveModel}
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
        title={`Schema export${activeGroup ? ` — ${activeGroup.name}` : ""}`}
        description="Only the models in this schema group are included."
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
                  exportTab === "prisma"
                    ? `${exportBaseName}.prisma`
                    : `${exportBaseName}.models.ts`,
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
                  const result = await generatePrismaExport(
                    models ?? [],
                    activeGroup?.name,
                  );
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
