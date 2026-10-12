"use client";

// BDAppBuilder.Component — App Builder page 2: the designer for one app.
// App creation/deletion lives on page 1 (BDAppListComponent).

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AppWindow,
  Plus,
  Pencil,
  Trash2,
  Save,
  LayoutGrid,
  Eye,
  ExternalLink,
  Wand2,
  Sparkles,
} from "lucide-react";
import type { BDApp, BDAppResource } from "../../BDDomain.Types";
import { useBDApps, useBDProjectSchemaModels } from "./BDApp.Hooks";
import { bdAppRepository, bdAppRecordRepository } from "./BDApp.Repository";
import { migrateLegacyAppRecords } from "../../BDAppDatabase";
import {
  collectAppFields,
  createAppResource,
  deriveAppMeta,
  resourcesFromDrafts,
  toAppForm,
} from "./BDApp.Types";
import type {
  BDAppDesignAISections,
  BDAppDesignDraft,
  BDAppForm,
} from "./BDApp.Types";
import { useBDProjectContext } from "../core/BDProject.Context";
import BDAppResourceComponent from "./BDAppResource.Component";
import BDAppRenderingComponent from "./BDAppRendering.Component";
import BDAppFillerComponent from "./BDAppFiller.Component";
import BDAppDesignAIComponent from "./BDAppDesignAI.Component";
import BDPageHeader from "../../components/BDPageHeader";
import BDBackLink from "../../components/BDBackLink";
import BDButton from "../../components/BDButton";
import BDIconButton from "../../components/BDIconButton";
import BDEmptyState from "../../components/BDEmptyState";
import BDConfirmDialog from "../../components/BDConfirmDialog";
import { useBDToast } from "../../components/BDToast";

const CELL =
  "w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-blue-400";

export interface BDAppBuilderComponentProps {
  /** The app being designed. */
  initialAppId?: string;
}

export function BDAppBuilderComponent({
  initialAppId,
}: BDAppBuilderComponentProps = {}) {
  const { projectId } = useBDProjectContext();
  const { toast } = useBDToast();
  const router = useRouter();
  const apps = useBDApps(projectId);
  const models = useBDProjectSchemaModels(projectId);

  const [draft, setDraft] = useState<BDApp | null>(null);
  const [form, setForm] = useState<BDAppForm | null>(null);
  const [mode, setMode] = useState<"design" | "preview">("design");
  const [resourceIndex, setResourceIndex] = useState<number | null>(null);
  const [creatingResource, setCreatingResource] = useState<BDAppResource | null>(
    null,
  );
  const [createCounter, setCreateCounter] = useState(0);
  const [deletingResource, setDeletingResource] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [appFillerOpen, setAppFillerOpen] = useState(false);
  const [designAiOpen, setDesignAiOpen] = useState(false);

  // Copy any pre-existing records from the legacy table once.
  useEffect(() => {
    void migrateLegacyAppRecords();
  }, []);

  // Load the deep-linked app once its live query arrives (render-time
  // adjustment, not an effect).
  if (initialAppId && apps && loadedId !== initialAppId) {
    const target = apps.find((a) => a.id === initialAppId);
    if (target) {
      setLoadedId(target.id);
      setDraft(target);
      setForm(toAppForm(target));
      setResourceIndex(null);
      setMode("design");
    }
  }

  const update = (patch: Partial<BDApp>) =>
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));

  const handleSaveApp = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      await bdAppRepository.update(draft.id, draft);
      toast({ title: "App saved", status: "success" });
    } finally {
      setSaving(false);
    }
  };

  const updateMeta = (patch: Partial<BDAppForm>) => {
    if (!form || !draft) return;
    const next = { ...form, ...patch };
    setForm(next);
    update({
      description: next.description || undefined,
      brand:
        next.brandName || next.logoUrl
          ? {
              name: next.brandName || next.name,
              logo: next.logoUrl || undefined,
            }
          : undefined,
      theme:
        next.themeMode !== "system" || next.primaryColor
          ? { mode: next.themeMode, primary: next.primaryColor || undefined }
          : undefined,
    });
  };

  const openNewResource = () => {
    setResourceIndex(null);
    setCreatingResource(createAppResource());
    setCreateCounter((count) => count + 1);
  };

  const closeResource = () => {
    setResourceIndex(null);
    setCreatingResource(null);
  };

  const persistResources = async (resources: BDAppResource[]) => {
    if (!draft) return;
    update({ resources });
    await bdAppRepository.update(draft.id, { resources });
  };

  const saveResource = async (resource: BDAppResource) => {
    if (!draft) return;
    const resources =
      creatingResource !== null
        ? [...draft.resources, resource]
        : resourceIndex !== null
          ? draft.resources.map((r, i) => (i === resourceIndex ? resource : r))
          : draft.resources;
    setSaving(true);
    try {
      await persistResources(resources);
      closeResource();
      toast({ title: "Resource saved", status: "success" });
    } finally {
      setSaving(false);
    }
  };

  const deleteResource = async () => {
    if (!draft || deletingResource === null) return;
    const resource = draft.resources[deletingResource];
    await bdAppRecordRepository.deleteResourceWithLinks(draft, resource.slug);
    await persistResources(
      draft.resources.filter((_, i) => i !== deletingResource),
    );
    if (resourceIndex === deletingResource) setResourceIndex(null);
    setDeletingResource(null);
    toast({ title: "Resource deleted", status: "success" });
  };

  const applyAppMetaFiller = (name: string) => {
    if (!form || !draft) return;
    const meta = deriveAppMeta(name);
    const nextForm: BDAppForm = { ...form, ...meta };
    setForm(nextForm);
    update({
      name: meta.name,
      slug: meta.slug,
      path: meta.path,
      brand:
        nextForm.brandName || nextForm.logoUrl
          ? {
              name: nextForm.brandName || nextForm.name,
              logo: nextForm.logoUrl || undefined,
            }
          : undefined,
    });
  };

  const applyDesignAI = (
    result: BDAppDesignDraft,
    sections: BDAppDesignAISections,
  ) => {
    if (!draft || !form) return;
    const patch: Partial<BDApp> = {};

    if (sections.meta && result.meta) {
      const meta = result.meta;
      const nextForm: BDAppForm = {
        ...form,
        name: meta.name ?? form.name,
        slug: meta.slug ?? form.slug,
        path: meta.path ?? form.path,
        description: meta.description ?? form.description,
        brandName: meta.brandName ?? form.brandName,
        logoUrl: meta.logoUrl ?? form.logoUrl,
        themeMode: meta.themeMode ?? form.themeMode,
        primaryColor: meta.primaryColor ?? form.primaryColor,
      };
      setForm(nextForm);
      patch.name = nextForm.name;
      patch.slug = nextForm.slug;
      patch.path = nextForm.path;
      patch.description = nextForm.description || undefined;
      patch.brand =
        nextForm.brandName || nextForm.logoUrl
          ? {
              name: nextForm.brandName || nextForm.name,
              logo: nextForm.logoUrl || undefined,
            }
          : undefined;
      patch.theme =
        nextForm.themeMode !== "system" || nextForm.primaryColor
          ? {
              mode: nextForm.themeMode,
              primary: nextForm.primaryColor || undefined,
            }
          : undefined;
    }

    if (sections.resources && result.resources && result.resources.length > 0) {
      const refs = draft.resources.map((r) => ({
        name: r.name,
        slug: r.slug,
      }));
      const generated = resourcesFromDrafts(result.resources, models ?? [], refs);
      patch.resources = [...draft.resources, ...generated];
    }

    if (Object.keys(patch).length > 0) {
      update(patch);
      void bdAppRepository.update(draft.id, patch);
    }
    toast({ title: "AI generation applied", status: "success" });
  };

  const resourceOpen = resourceIndex !== null || creatingResource !== null;

  if (apps && initialAppId && !apps.some((a) => a.id === initialAppId)) {
    return (
      <div className="flex flex-col gap-5">
        <BDBackLink
          href={`/modules/bunny-dev/projects/${projectId}/app`}
          label="Back to App Builder"
        />
        <BDEmptyState
          icon={AppWindow}
          title="App not found"
          description="This app may have been deleted."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <BDBackLink
        href={`/modules/bunny-dev/projects/${projectId}/app`}
        label="Back to App Builder"
      />
      <BDPageHeader
        icon={AppWindow}
        title={draft?.name ?? "App Builder"}
        description="Design Filament-style resources, forms, and tables — then render a working CRUD app with relation selection."
        actions={
          draft ? (
            <>
              <BDButton
                variant="secondary"
                icon={ExternalLink}
                onClick={() => router.push(`/modules/bunny-dev/render/${draft.id}`)}
              >
                Open as application
              </BDButton>
              <BDButton icon={Save} isLoading={saving} onClick={handleSaveApp}>
                Save app
              </BDButton>
            </>
          ) : undefined
        }
      />

      {draft && form ? (
        <>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMode("design")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm ${
                    mode === "design"
                      ? "bg-blue-100 font-semibold text-blue-700"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  <Pencil className="h-3.5 w-3.5" /> Design
                </button>
                <button
                  type="button"
                  onClick={() => setMode("preview")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm ${
                    mode === "preview"
                      ? "bg-blue-100 font-semibold text-blue-700"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  <Eye className="h-3.5 w-3.5" /> Render
                </button>
              </div>
              <div className="flex items-center gap-2">
                <BDButton
                  size="sm"
                  variant="secondary"
                  icon={Wand2}
                  onClick={() => setAppFillerOpen(true)}
                >
                  Fill details
                </BDButton>
                <BDButton
                  size="sm"
                  variant="secondary"
                  icon={Sparkles}
                  onClick={() => setDesignAiOpen(true)}
                >
                  Generate AI
                </BDButton>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-600">Name</span>
                <input
                  className={CELL}
                  value={form.name}
                  onChange={(e) => {
                    setForm({ ...form, name: e.target.value });
                    update({ name: e.target.value });
                  }}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-600">Slug</span>
                <input
                  className={CELL}
                  value={form.slug}
                  onChange={(e) => {
                    setForm({ ...form, slug: e.target.value });
                    update({ slug: e.target.value });
                  }}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-600">Path</span>
                <input
                  className={CELL}
                  value={form.path}
                  onChange={(e) => {
                    setForm({ ...form, path: e.target.value });
                    update({ path: e.target.value });
                  }}
                />
              </label>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              <label className="flex flex-col gap-1 md:col-span-3">
                <span className="text-xs font-medium text-slate-600">
                  Description
                </span>
                <input
                  className={CELL}
                  value={form.description}
                  onChange={(e) => updateMeta({ description: e.target.value })}
                  placeholder="Shown in the standalone application header."
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-600">
                  Brand name
                </span>
                <input
                  className={CELL}
                  value={form.brandName}
                  onChange={(e) => updateMeta({ brandName: e.target.value })}
                  placeholder={form.name || "App title"}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-600">
                  Logo URL
                </span>
                <input
                  className={CELL}
                  value={form.logoUrl}
                  onChange={(e) => updateMeta({ logoUrl: e.target.value })}
                  placeholder="https://…"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-600">
                  Theme mode
                </span>
                <select
                  className={CELL}
                  value={form.themeMode}
                  onChange={(e) =>
                    updateMeta({
                      themeMode: e.target.value as BDAppForm["themeMode"],
                    })
                  }
                >
                  <option value="system">system</option>
                  <option value="light">light</option>
                  <option value="dark">dark</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-600">
                  Primary color
                </span>
                <input
                  className={CELL}
                  value={form.primaryColor}
                  onChange={(e) => updateMeta({ primaryColor: e.target.value })}
                  placeholder="#1976d2"
                />
              </label>
            </div>
          </div>

          {mode === "design" ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">
                  Resources ({draft.resources.length})
                </h3>
                <BDButton
                  size="sm"
                  variant="secondary"
                  icon={Plus}
                  onClick={openNewResource}
                >
                  Add resource
                </BDButton>
              </div>
              {draft.resources.length === 0 ? (
                <BDEmptyState
                  icon={LayoutGrid}
                  title="No resources"
                  description="Add a resource to define a CRUD entity."
                  action={
                    <BDButton icon={Plus} onClick={openNewResource}>
                      Add resource
                    </BDButton>
                  }
                />
              ) : (
                <div className="flex flex-col gap-2">
                  {draft.resources.map((resource, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"
                    >
                      <button
                        type="button"
                        className="flex-1 text-left"
                        onClick={() => setResourceIndex(index)}
                      >
                        <p className="text-sm font-medium text-slate-800">
                          {resource.label ?? resource.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {resource.slug} ·{" "}
                          {collectAppFields(resource.form?.components).length}{" "}
                          fields · {resource.table?.columns?.length ?? 0} columns ·{" "}
                          {resource.connections?.length ?? 0} connections
                        </p>
                      </button>
                      <div className="flex items-center gap-1">
                        <BDIconButton
                          icon={Pencil}
                          label="Edit resource"
                          size="sm"
                          onClick={() => setResourceIndex(index)}
                        />
                        <BDIconButton
                          icon={Trash2}
                          label="Delete resource"
                          size="sm"
                          onClick={() => setDeletingResource(index)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <BDAppRenderingComponent appId={draft.id} embedded />
          )}
        </>
      ) : (
        <BDEmptyState
          icon={AppWindow}
          title="App not found"
          description="This app may have been deleted."
        />
      )}

      <BDAppResourceComponent
        open={resourceOpen}
        resource={
          creatingResource ??
          (resourceIndex !== null
            ? draft?.resources[resourceIndex] ?? null
            : null)
        }
        models={models ?? []}
        resources={draft?.resources ?? []}
        isNew={creatingResource !== null}
        resetToken={creatingResource !== null ? `new-${createCounter}` : resourceIndex ?? undefined}
        projectId={projectId}
        isSaving={saving}
        onClose={closeResource}
        onSave={saveResource}
        onDelete={() => {
          if (resourceIndex !== null) setDeletingResource(resourceIndex);
        }}
      />

      <BDAppFillerComponent
        open={appFillerOpen}
        onClose={() => setAppFillerOpen(false)}
        title="Fill app details"
        description="Enter an app name and the slug, path and brand name are derived from it."
        label="App name"
        placeholder="e.g. Shop Admin"
        submitLabel="Fill details"
        initialName={form?.name ?? ""}
        onSubmit={applyAppMetaFiller}
      />

      <BDAppDesignAIComponent
        open={designAiOpen}
        onOpenChange={setDesignAiOpen}
        projectId={projectId}
        currentMeta={{
          name: form?.name,
          slug: form?.slug,
          path: form?.path,
        }}
        models={models ?? []}
        resources={draft?.resources ?? []}
        onAccept={applyDesignAI}
      />

      <BDConfirmDialog
        open={deletingResource !== null}
        title="Delete resource?"
        description="All records for this resource will be removed."
        confirmLabel="Delete resource"
        onConfirm={deleteResource}
        onCancel={() => setDeletingResource(null)}
      />
    </div>
  );
}

export default BDAppBuilderComponent;
