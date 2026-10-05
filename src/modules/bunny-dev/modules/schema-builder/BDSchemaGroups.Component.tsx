"use client";

// BDSchemaGroups.Component — Schema Builder page 1: the list of schema groups.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { Database, Sparkles } from "lucide-react";
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
import { useBDSchemaGroups } from "./BDSchemaBuilder.Hooks";
import { slugifyTable, type BDSchemaArtifact, type BDSchemaGroupForm } from "./BDSchemaBuilder.Types";
import { bdGenerateSchema } from "./BDSchemaBuilder.Server";
import BDSchemaGroupComponent from "./BDSchemaGroup.Component";
import BDGroupList from "../../components/BDGroupList";
import BDButton from "../../components/BDButton";
import BDConfirmDialog from "../../components/BDConfirmDialog";
import BDBadge from "../../components/BDBadge";
import BDGenerationPanel from "../agent-manager/BDGenerationPanel";
import { useBDToast } from "../../components/BDToast";

export function BDSchemaGroupListComponent() {
  const { projectId } = useBDProjectContext();
  const { toast } = useBDToast();
  const router = useRouter();

  const groups = useBDSchemaGroups(projectId);
  const allModels = useLiveQuery(
    () => bdDB.schemaModels.where("projectId").equals(projectId).toArray(),
    [projectId],
  );

  const [groupModal, setGroupModal] = useState<{
    open: boolean;
    group: BDSchemaGroup | null;
    busy: boolean;
  }>({ open: false, group: null, busy: false });
  const [deletingGroup, setDeletingGroup] = useState<BDSchemaGroup | null>(null);
  const [aiOpen, setAiOpen] = useState(false);

  const hrefFor = (group: BDSchemaGroup) =>
    `/modules/bunny-dev/projects/${projectId}/schema/${group.id}`;

  const handleGroupSubmit = async (form: BDSchemaGroupForm) => {
    setGroupModal((prev) => ({ ...prev, busy: true }));
    try {
      if (groupModal.group) {
        await bdSchemaGroupRepository.update(groupModal.group.id, {
          name: form.name,
          description: form.description,
        });
        setGroupModal({ open: false, group: null, busy: false });
        toast({ title: "Group saved", status: "success" });
      } else {
        const created = await bdSchemaGroupRepository.createGroup(
          projectId,
          form.name,
          form.description,
        );
        setGroupModal({ open: false, group: null, busy: false });
        toast({ title: "Group created", status: "success" });
        router.push(hrefFor(created));
      }
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
    toast({ title: "Group deleted", status: "success" });
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
      const group = await bdSchemaGroupRepository.createGroup(
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
  };

  const countFor = (group: BDSchemaGroup) =>
    (allModels ?? []).filter((m) => m.groupId === group.id).length;

  return (
    <>
      <BDGroupList<BDSchemaGroup>
        icon={Database}
        title="Schema Builder"
        description="Design database schemas as groups of models with columns, relations, and indexes — then export to Prisma or a TypeScript model file."
        newLabel="New group"
        groups={groups}
        countNoun="models"
        countFor={countFor}
        hrefFor={hrefFor}
        headerActions={
          <BDButton
            variant="secondary"
            icon={Sparkles}
            onClick={() => setAiOpen(true)}
          >
            AI Generate
          </BDButton>
        }
        onNew={() => setGroupModal({ open: true, group: null, busy: false })}
        onEdit={(group) => setGroupModal({ open: true, group, busy: false })}
        onDelete={(group) => setDeletingGroup(group)}
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

      <BDSchemaGroupComponent
        open={groupModal.open}
        group={groupModal.group}
        isLoading={groupModal.busy}
        onClose={() => setGroupModal({ open: false, group: null, busy: false })}
        onSubmit={handleGroupSubmit}
      />

      <BDConfirmDialog
        open={!!deletingGroup}
        title={`Delete ${deletingGroup?.name ?? "group"}?`}
        description="All models in this group will be deleted."
        confirmLabel="Delete group"
        onConfirm={handleDeleteGroup}
        onCancel={() => setDeletingGroup(null)}
      />
    </>
  );
}

export default BDSchemaGroupListComponent;
