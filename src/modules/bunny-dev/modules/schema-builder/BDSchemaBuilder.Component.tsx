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
} from "lucide-react";
import { bdDB } from "../../BDDatabase";
import type { BDSchemaModel } from "../../BDDomain.Types";
import { useBDProjectContext } from "../core/BDProject.Context";
import { bdSchemaModelRepository } from "./BDSchemaBuilder.Repository";
import { useBDSchemaGroups, useBDSchemaModels } from "./BDSchemaBuilder.Hooks";
import { generatePrismaExport } from "./BDPrismaExport.Server";
import BDSchemaModelComponent from "./BDSchemaModel.Component";
import BDSchemaErdComponent from "./BDSchemaErd.Component";
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

  const [editingModel, setEditingModel] = useState<BDSchemaModel | null>(null);
  const [deletingModel, setDeletingModel] = useState<BDSchemaModel | null>(null);
  const [savingModel, setSavingModel] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportTab, setExportTab] = useState<"prisma" | "builder">("prisma");
  const [exportText, setExportText] = useState("");
  const [erdOpen, setErdOpen] = useState(false);

  const handleAddModel = async () => {
    if (!groupId) {
      toast({ title: "Group not found", status: "warning" });
      return;
    }
    const model = await bdSchemaModelRepository.createModel(
      projectId,
      groupId,
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
            onSelect: ([row]) => setEditingModel(row),
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
