"use client";

// BDAppList.Component — App Builder page 1: the list of apps.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppWindow, Plus, Trash2, Sparkles, ExternalLink } from "lucide-react";
import type { BDApp } from "../../BDDomain.Types";
import { useBDProjectContext } from "../core/BDProject.Context";
import { bdAppRepository, bdAppRecordRepository } from "./BDApp.Repository";
import { deleteAppRecordsByApp } from "../../BDAppDatabase";
import { useBDApps, useBDProjectSchemaModels } from "./BDApp.Hooks";
import {
  BD_APP_EMPTY_FORM,
  createApp,
  deriveAppMeta,
  resourcesFromDrafts,
  slugify,
  type BDAppArtifact,
} from "./BDApp.Types";
import { bdGenerateApp } from "./BDAppBuilder.Server";
import BDPageHeader from "../../components/BDPageHeader";
import BDButton from "../../components/BDButton";
import BDList from "../../components/BDList";
import BDBadge from "../../components/BDBadge";
import BDConfirmDialog from "../../components/BDConfirmDialog";
import BDAppCreateComponent from "./BDAppCreate.Component";
import BDGenerationPanel from "../agent-manager/BDGenerationPanel";
import { useBDToast } from "../../components/BDToast";

export function BDAppListComponent() {
  const { projectId } = useBDProjectContext();
  const { toast } = useBDToast();
  const router = useRouter();

  const apps = useBDApps(projectId);
  const models = useBDProjectSchemaModels(projectId);

  const [deletingApp, setDeletingApp] = useState<BDApp | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const hrefFor = (app: BDApp) =>
    `/modules/bunny-dev/projects/${projectId}/app/${app.id}`;

  const createNewApp = async (values: {
    name: string;
    schemaGroupId: string;
  }) => {
    const meta = deriveAppMeta(values.name);
    const created = await bdAppRepository.create(
      createApp(projectId, {
        ...BD_APP_EMPTY_FORM,
        name: meta.name,
        slug: meta.slug,
        path: meta.path,
        brandName: meta.brandName,
        schemaGroupId: values.schemaGroupId,
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
    for (const appDraft of artifact.apps) {
      const created = await bdAppRepository.create(
        createApp(projectId, {
          ...BD_APP_EMPTY_FORM,
          name: appDraft.name,
          slug: appDraft.slug ?? slugify(appDraft.name),
          path: appDraft.path ?? "/",
        }),
      );
      await bdAppRepository.update(created.id, {
        resources: resourcesFromDrafts(appDraft.resources, models ?? []),
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
            <BDButton icon={Plus} onClick={() => setCreating(true)}>
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
          {
            key: "published",
            label: "Status",
            render: (row) => (
              <BDBadge color={row.published ? "success" : "gray"}>
                {row.published ? "Published" : "Draft"}
              </BDBadge>
            ),
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

      <BDAppCreateComponent
        open={creating}
        onClose={() => setCreating(false)}
        projectId={projectId}
        onSubmit={createNewApp}
      />
    </div>
  );
}

export default BDAppListComponent;
