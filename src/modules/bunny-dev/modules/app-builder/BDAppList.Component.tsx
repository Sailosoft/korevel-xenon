"use client";

// BDAppList.Component — App Builder page 1: the list of apps.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppWindow, Plus, Trash2, Sparkles, ExternalLink } from "lucide-react";
import type {
  BDApp,
  BDAppColumn,
  BDAppConnection,
  BDAppField,
  BDAppResource,
} from "../../BDDomain.Types";
import { useBDProjectContext } from "../core/BDProject.Context";
import { bdAppRepository, bdAppRecordRepository } from "./BDApp.Repository";
import { deleteAppRecordsByApp } from "../../BDAppDatabase";
import { useBDApps, useBDProjectSchemaModels } from "./BDApp.Hooks";
import {
  BD_APP_EMPTY_FORM,
  createApp,
  type BDAppArtifact,
} from "./BDApp.Types";
import { bdGenerateApp } from "./BDAppBuilder.Server";
import BDPageHeader from "../../components/BDPageHeader";
import BDButton from "../../components/BDButton";
import BDList from "../../components/BDList";
import BDBadge from "../../components/BDBadge";
import BDConfirmDialog from "../../components/BDConfirmDialog";
import BDGenerationPanel from "../agent-manager/BDGenerationPanel";
import { useBDToast } from "../../components/BDToast";

function toAppField(draft: {
  name: string;
  label?: string;
  type: string;
  required?: boolean;
  options?: { value: string; label: string }[];
}): BDAppField {
  const options =
    draft.options && draft.options.length > 0
      ? Object.fromEntries(draft.options.map((o) => [o.value, o.label]))
      : undefined;
  return {
    kind: "field",
    name: draft.name,
    label: draft.label ?? draft.name,
    type: draft.type as BDAppField["type"],
    required: draft.required,
    options,
  };
}

export function BDAppListComponent() {
  const { projectId } = useBDProjectContext();
  const { toast } = useBDToast();
  const router = useRouter();

  const apps = useBDApps(projectId);
  const models = useBDProjectSchemaModels(projectId);

  const [deletingApp, setDeletingApp] = useState<BDApp | null>(null);
  const [aiOpen, setAiOpen] = useState(false);

  const hrefFor = (app: BDApp) =>
    `/modules/bunny-dev/projects/${projectId}/app/${app.id}`;

  const handleCreateApp = async () => {
    const created = await bdAppRepository.create(
      createApp(projectId, {
        ...BD_APP_EMPTY_FORM,
        name: "New App",
        slug: "new-app",
        path: "/",
      }),
    );
    router.push(hrefFor(created));
  };

  const handleDeleteApp = async () => {
    if (!deletingApp) return;
    await Promise.all(
      (deletingApp.resources ?? []).map((r) =>
        bdAppRecordRepository.deleteByResource(deletingApp.id, r.slug),
      ),
    );
    await deleteAppRecordsByApp(deletingApp.id);
    await bdAppRepository.delete(deletingApp.id);
    setDeletingApp(null);
    toast({ title: "App deleted", status: "success" });
  };

  const applyArtifact = async (artifact: BDAppArtifact) => {
    const slugFor = (r: { name: string; slug?: string }) =>
      r.slug ?? r.name.toLowerCase().replace(/\s+/g, "-");

    const buildResources = (
      appDraft: BDAppArtifact["apps"][number],
    ): BDAppResource[] => {
      const reference = appDraft.resources.map((r) => ({
        name: r.name,
        slug: slugFor(r),
      }));
      return appDraft.resources.map((r) => {
        const model = (models ?? []).find((m) => m.name === r.model);
        const resource: BDAppResource = {
          name: r.name,
          slug: slugFor(r),
          label: r.label ?? r.name,
          pluralLabel: `${r.label ?? r.name}s`,
          modelId: model?.id,
          form: { components: (r.fields ?? []).map(toAppField) },
          table: {
            columns: (r.columns ?? []).map((c) => ({
              type: c.type as BDAppColumn["type"],
              name: c.name,
              label: c.label ?? c.name,
            })),
          },
        };
        const connections: BDAppConnection[] = (r.connections ?? [])
          .map((c) => {
            const target = reference.find(
              (x) => x.slug === c.target || x.name === c.target,
            );
            return {
              name: c.name,
              type: c.type,
              targetSlug: target ? target.slug : "",
              titleAttribute: c.titleAttribute,
              foreignKey: c.foreignKey,
              label: c.label,
            } satisfies BDAppConnection;
          })
          .filter((c) => c.targetSlug);
        if (connections.length > 0) resource.connections = connections;
        return resource;
      });
    };

    for (const appDraft of artifact.apps) {
      const created = await bdAppRepository.create(
        createApp(projectId, {
          ...BD_APP_EMPTY_FORM,
          name: appDraft.name,
          slug: appDraft.slug ?? appDraft.name.toLowerCase().replace(/\s+/g, "-"),
          path: appDraft.path ?? "/",
        }),
      );
      await bdAppRepository.update(created.id, {
        resources: buildResources(appDraft),
      });
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <BDPageHeader
        icon={AppWindow}
        title="App Builder"
        description="Design Filament-style resources, forms, and tables — then render a working CRUD app with relation selection."
        actions={
          <>
            <BDButton
              variant="secondary"
              icon={Sparkles}
              onClick={() => setAiOpen(true)}
            >
              AI Generate
            </BDButton>
            <BDButton icon={Plus} onClick={handleCreateApp}>
              New app
            </BDButton>
          </>
        }
      />

      <BDGenerationPanel<BDAppArtifact>
        projectId={projectId}
        subsystem="app"
        open={aiOpen}
        onOpenChange={setAiOpen}
        title="AI App Generation"
        description="Generate an app config (resources, forms, tables) from a description, then review and apply."
        placeholder="e.g. An admin panel for the e-commerce schema with product and order management"
        generate={({ instruction, mode, aiConfig }) =>
          bdGenerateApp({
            instruction,
            mode,
            models: models?.map((m) => m.name),
            aiConfig,
          })
        }
        onApply={applyArtifact}
        defaultMode="create"
        modes={["create"]}
        renderPreview={(artifact) => (
          <div className="flex flex-col gap-3">
            {artifact.apps.map((a, i) => (
              <div key={i} className="rounded-lg border border-slate-200 p-3">
                <p className="text-sm font-semibold text-slate-800">
                  {a.name} · {a.resources.length} resources
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {a.resources.map((r) => (
                    <BDBadge key={r.name} color="primary">
                      {r.name} · {(r.fields ?? []).length} fields
                    </BDBadge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      />

      <BDList<BDApp>
        title="Apps"
        data={apps ?? []}
        isLoading={apps === undefined}
        getRowId={(row) => row.id}
        searchable
        getSearchText={(row) => row.name}
        emptyState={{
          title: "No apps yet",
          description: "Create an app or generate one with AI.",
        }}
        onRowClick={(row) => router.push(hrefFor(row))}
        columns={[
          {
            key: "name",
            label: "App",
            render: (row) => (
              <span className="font-medium text-slate-800">{row.name}</span>
            ),
          },
          {
            key: "resources",
            label: "Resources",
            render: (row) => <BDBadge>{row.resources.length}</BDBadge>,
          },
        ]}
        rowActions={[
          {
            label: "View",
            icon: ExternalLink,
            iconOnly: true,
            tooltip: "View app",
            onSelect: ([row]) => router.push(hrefFor(row)),
          },
          {
            label: "Delete",
            icon: Trash2,
            variant: "danger",
            iconOnly: true,
            tooltip: "Delete app",
            onSelect: ([row]) => setDeletingApp(row),
          },
        ]}
      />

      <BDConfirmDialog
        open={!!deletingApp}
        title={`Delete ${deletingApp?.name ?? "app"}?`}
        description="All records rendered by this app will be removed."
        confirmLabel="Delete app"
        onConfirm={handleDeleteApp}
        onCancel={() => setDeletingApp(null)}
      />
    </div>
  );
}

export default BDAppListComponent;
