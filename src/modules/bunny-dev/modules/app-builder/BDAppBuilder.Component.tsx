"use client";

// BDAppBuilder.Component — App Builder page 2: the designer for one app.
// Laid out as a VSCode-style shell: slim title bar with menus, explorer
// sidebar, inline resource tabs in the workspace, and a status bar.
// App creation/deletion lives on page 1 (BDAppListComponent).

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AppWindow,
  ExternalLink,
  Eye,
  Layers,
  LayoutGrid,
  PanelLeft,
  Pencil,
  Plus,
  Save,
  Settings,
  Sparkles,
  Wand2,
} from "lucide-react";
import { cn } from "@heroui/react";
import type { BDApp, BDAppResource } from "../../BDDomain.Types";
import { useBDApps, useBDProjectSchemaModels } from "./BDApp.Hooks";
import { useBDSchemaGroups } from "../schema-builder/BDSchemaBuilder.Hooks";
import { bdAppRepository, bdAppRecordRepository } from "./BDApp.Repository";
import { migrateLegacyAppRecords } from "../../BDAppDatabase";
import {
  buildBrand,
  buildTheme,
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
import { BD_PROJECT_DEFAULT_BUILDER_LAYOUT } from "../core/BDProject.Types";
import BDAppResourceComponent, {
  type BDAppResourceComponentHandle,
} from "./BDAppResource.Component";
import BDAppRenderingComponent from "./BDAppRendering.Component";
import BDAppFillerComponent from "./BDAppFiller.Component";
import BDAppDesignAIComponent from "./BDAppDesignAI.Component";
import BDAppBuilderShell from "./BDAppBuilderShell.Component";
import type { BDAppBuilderMenu } from "./BDAppBuilderShell.Component";
import BDAppBuilderSidebar from "./BDAppBuilderSidebar.Component";
import BDAppBuilderTabs from "./BDAppBuilderTabs.Component";
import BDAppSettingsModal, {
  type BDAppSettingsResourceActions,
} from "./BDAppSettingsModal.Component";
import BDBackLink from "../../components/BDBackLink";
import BDButton from "../../components/BDButton";
import BDEmptyState from "../../components/BDEmptyState";
import BDConfirmDialog from "../../components/BDConfirmDialog";
import { useBDToast } from "../../components/BDToast";

/** Special tab id for the app overview panel. */
const OVERVIEW_TAB = "overview";
/** Special tab id for the new-resource editor. */
const NEW_RESOURCE_TAB = "__new_resource__";

export interface BDAppBuilderComponentProps {
  /** The app being designed. */
  initialAppId?: string;
}

function BDAppBuilderOverview({
  app,
  form,
  onOpenSettings,
  onFillDetails,
  onOpenApp,
}: {
  app: BDApp;
  form: BDAppForm;
  onOpenSettings: () => void;
  onFillDetails: () => void;
  onOpenApp: () => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-base font-semibold text-slate-800">
          {form.name || app.name || "Untitled app"}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {form.description || "No description yet."}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-400">
              Slug
            </p>
            <p className="text-sm text-slate-700">{form.slug || "—"}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-400">
              Path
            </p>
            <p className="text-sm text-slate-700">{form.path || "—"}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-400">
              Resources
            </p>
            <p className="text-sm text-slate-700">{app.resources.length}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-400">
              Status
            </p>
            <p className="text-sm text-slate-700">
              {form.published ? "Published" : "Draft"}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-400">
              Theme
            </p>
            <p className="text-sm text-slate-700">
              {form.themeMode}
              {form.primaryColor ? ` · ${form.primaryColor}` : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">
          Quick actions
        </h3>
        <div className="flex flex-wrap gap-2">
          <BDButton size="sm" variant="secondary" icon={Settings} onClick={onOpenSettings}>
            App settings
          </BDButton>
          <BDButton size="sm" variant="secondary" icon={Wand2} onClick={onFillDetails}>
            Fill details
          </BDButton>
          <BDButton size="sm" variant="secondary" icon={ExternalLink} onClick={onOpenApp}>
            Open as application
          </BDButton>
        </div>
      </div>
    </div>
  );
}

export function BDAppBuilderComponent({
  initialAppId,
}: BDAppBuilderComponentProps = {}) {
  const { projectId, project } = useBDProjectContext();
  const { toast } = useBDToast();
  const router = useRouter();
  const apps = useBDApps(projectId);

  // "Open as application" always opens the standalone app in a new browser
  // tab so the designer stays intact.
  const openAppInNewTab = (appId: string) =>
    window.open(`/modules/bunny-dev/render/${appId}`, "_blank", "noopener");
  const models = useBDProjectSchemaModels(projectId);
  const schemaGroups = useBDSchemaGroups(projectId);

  const [draft, setDraft] = useState<BDApp | null>(null);
  const [form, setForm] = useState<BDAppForm | null>(null);
  const [mode, setMode] = useState<"design" | "preview">("design");
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [creatingResource, setCreatingResource] = useState<BDAppResource | null>(
    null,
  );
  const [createCounter, setCreateCounter] = useState(0);
  const [deletingResource, setDeletingResource] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [appFillerOpen, setAppFillerOpen] = useState(false);
  const [designAiOpen, setDesignAiOpen] = useState(false);
  // Handle on the inline resource editor (its actions live in the settings
  // modal, so the builder triggers save imperatively).
  const resourceEditorRef = useRef<BDAppResourceComponentHandle>(null);

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
      setOpenTabs([OVERVIEW_TAB]);
      setActiveTab(OVERVIEW_TAB);
      setCreatingResource(null);
      setSettingsOpen(false);
      setMode("design");
      setDirty(false);
    }
  }

  const update = (patch: Partial<BDApp>) => {
    setDirty(true);
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const handleSaveApp = useCallback(async () => {
    if (!draft) return;
    setSaving(true);
    try {
      await bdAppRepository.update(draft.id, draft);
      setDirty(false);
      toast({ title: "App saved", status: "success" });
    } finally {
      setSaving(false);
    }
  }, [draft, toast]);

  const updateMeta = (patch: Partial<BDAppForm>) => {
    if (!form || !draft) return;
    const next = { ...form, ...patch };
    setForm(next);
    update({
      description: next.description || undefined,
      schemaGroupId: next.schemaGroupId || undefined,
      published: next.published,
      brand: buildBrand(next),
      theme: buildTheme(next),
    });
  };

  // --- Tabs ---------------------------------------------------------------

  const activateTab = (id: string) => {
    setActiveTab(id);
    setMode("design");
  };

  const openResourceTab = (slug: string) => {
    setOpenTabs((tabs) => (tabs.includes(slug) ? tabs : [...tabs, slug]));
    activateTab(slug);
  };

  const openOverview = () => {
    setOpenTabs((tabs) =>
      tabs.includes(OVERVIEW_TAB) ? tabs : [...tabs, OVERVIEW_TAB],
    );
    activateTab(OVERVIEW_TAB);
  };

  const closeTab = (id: string) => {
    const index = openTabs.indexOf(id);
    const next = openTabs.filter((t) => t !== id);
    setOpenTabs(next);
    if (activeTab === id) {
      setActiveTab(next[Math.min(index, next.length - 1)] ?? null);
    }
    if (id === NEW_RESOURCE_TAB) setCreatingResource(null);
  };

  const openNewResource = () => {
    setCreatingResource(createAppResource());
    setCreateCounter((count) => count + 1);
    setOpenTabs((tabs) =>
      tabs.includes(NEW_RESOURCE_TAB) ? tabs : [...tabs, NEW_RESOURCE_TAB],
    );
    activateTab(NEW_RESOURCE_TAB);
  };

  // --- Resource persistence ----------------------------------------------

  const persistResources = async (resources: BDAppResource[]) => {
    if (!draft) return;
    setDraft((prev) => (prev ? { ...prev, resources } : prev));
    await bdAppRepository.update(draft.id, { resources });
  };

  const saveResource = async (resource: BDAppResource) => {
    if (!draft) return;
    const isNewResource = creatingResource !== null;
    const previousSlug = isNewResource ? null : activeTab;
    const resources = isNewResource
      ? [...draft.resources, resource]
      : previousSlug !== null
        ? draft.resources.map((r) => (r.slug === previousSlug ? resource : r))
        : draft.resources;
    setSaving(true);
    try {
      await persistResources(resources);
      if (isNewResource) {
        setCreatingResource(null);
        setOpenTabs((tabs) => [
          ...tabs.filter((t) => t !== NEW_RESOURCE_TAB),
          resource.slug,
        ]);
        setActiveTab(resource.slug);
      } else if (previousSlug && previousSlug !== resource.slug) {
        setOpenTabs((tabs) =>
          tabs.map((t) => (t === previousSlug ? resource.slug : t)),
        );
        setActiveTab(resource.slug);
      }
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
    if (openTabs.includes(resource.slug)) closeTab(resource.slug);
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
      brand: buildBrand(nextForm),
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
      patch.published = nextForm.published;
      patch.brand = buildBrand(nextForm);
      patch.theme = buildTheme(nextForm);
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

  // --- Derived view state -------------------------------------------------

  const activeResourceIndex =
    draft &&
    activeTab !== null &&
    activeTab !== OVERVIEW_TAB &&
    activeTab !== NEW_RESOURCE_TAB
      ? draft.resources.findIndex((r) => r.slug === activeTab)
      : -1;
  const activeResource =
    activeResourceIndex >= 0 && draft
      ? draft.resources[activeResourceIndex]
      : undefined;

  // Models available to resource editors: only when the app is tied to a
  // schema design. Untied apps have no schema-driven UI (model picker, derive,
  // fill from schema) and the renderer ignores stale model links.
  const designerModels =
    draft?.schemaGroupId && models
      ? models.filter((m) => m.groupId === draft.schemaGroupId)
      : [];

  // Project-wide layout: "full" breaks out of the BDShell document shell into
  // a dedicated full-screen workspace, "shell" embeds the designer in the
  // workspace chrome (viewport-height card). Unset projects default to shell.
  // Only resolved once the app and project are loaded so the loading/empty
  // state does not flash full-screen.
  const builderLayout =
    project?.builderLayout ?? BD_PROJECT_DEFAULT_BUILDER_LAYOUT;
  const fullView =
    draft && form && project !== undefined
      ? builderLayout === "full"
      : false;

  // True while a resource editor tab is active in design mode — gates the
  // title-bar "Save resource" action and the Ctrl/Cmd+S shortcut.
  const resourceTabActive =
    activeTab !== null &&
    mode === "design" &&
    (activeTab === NEW_RESOURCE_TAB
      ? creatingResource !== null
      : activeResource !== undefined);

  // Resource info surfaced in the App settings modal (close only — saving
  // lives in the title bar / Ctrl+S, deleting in the sidebar).
  const resourceActions: BDAppSettingsResourceActions | null =
    activeTab !== null && mode === "design"
      ? activeTab === NEW_RESOURCE_TAB && creatingResource
        ? {
            label: "New resource",
            isNew: true,
            onClose: () => closeTab(NEW_RESOURCE_TAB),
          }
        : activeResource
          ? {
              label: activeResource.label ?? activeResource.name,
              onClose: () => closeTab(activeResource.slug),
            }
          : null
      : null;

  // Ctrl/Cmd+S — save the active resource editor, or the app itself.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (resourceTabActive) {
          resourceEditorRef.current?.save();
        } else {
          void handleSaveApp();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [resourceTabActive, handleSaveApp]);

  const tabItems = (draft ? openTabs : []).flatMap<{
    id: string;
    label: string;
  }>((id) => {
    if (id === OVERVIEW_TAB) return [{ id, label: "Overview" }];
    if (id === NEW_RESOURCE_TAB) return [{ id, label: "New resource" }];
    const resource = draft?.resources.find((r) => r.slug === id);
    return resource ? [{ id, label: resource.label ?? resource.name }] : [];
  });

  const menus: BDAppBuilderMenu[] | undefined = draft
    ? [
        {
          label: "File",
          items: [
            {
              label: "App settings…",
              icon: Settings,
              onClick: () => setSettingsOpen(true),
            },
            {
              label: "Fill details…",
              icon: Wand2,
              onClick: () => setAppFillerOpen(true),
            },
            {
              label: "Open as application",
              icon: ExternalLink,
              onClick: () => openAppInNewTab(draft.id),
            },
            {
              label: "Back to App Builder",
              icon: Layers,
              onClick: () =>
                router.push(`/modules/bunny-dev/projects/${projectId}/app`),
            },
          ],
        },
        {
          label: "Edit",
          items: [
            {
              label: "Fill details…",
              icon: Wand2,
              onClick: () => setAppFillerOpen(true),
            },
            {
              label: "Generate AI…",
              icon: Sparkles,
              onClick: () => setDesignAiOpen(true),
            },
          ],
        },
        {
          label: "View",
          items: [
            {
              label: sidebarCollapsed ? "Show sidebar" : "Hide sidebar",
              icon: PanelLeft,
              onClick: () => setSidebarCollapsed((v) => !v),
            },
            { label: "Design", icon: Pencil, onClick: () => setMode("design") },
            {
              label: "Render preview",
              icon: Eye,
              onClick: () => setMode("preview"),
            },
          ],
        },
      ]
    : undefined;

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
    <>
      <div
        className={
          fullView
            ? "fixed inset-0 z-40 flex flex-col bg-[#f4f7fb] p-3"
            : "flex flex-col"
        }
      >
        <BDAppBuilderShell
          icon={AppWindow}
          heightClassName={fullView ? "h-full" : undefined}
          title={draft?.name || "App Builder"}
          menus={menus}
          onBack={() =>
            router.push(`/modules/bunny-dev/projects/${projectId}/app`)
          }
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
          actions={
            draft ? (
              <>
                <BDButton
                  size="sm"
                  variant="secondary"
                  icon={Sparkles}
                  onClick={() => setDesignAiOpen(true)}
                >
                  AI
                </BDButton>
                <BDButton
                  size="sm"
                  variant="secondary"
                  icon={ExternalLink}
                  onClick={() => openAppInNewTab(draft.id)}
                >
                  Open
                </BDButton>
                {resourceTabActive && (
                  <BDButton
                    size="sm"
                    icon={Save}
                    isLoading={saving}
                    title="Save resource (Ctrl+S)"
                    onClick={() => resourceEditorRef.current?.save()}
                  >
                    Save resource
                  </BDButton>
                )}
              </>
            ) : undefined
          }
          sidebar={
            draft ? (
              <BDAppBuilderSidebar
                resources={draft.resources}
                activeTab={activeTab}
                collapsed={sidebarCollapsed}
                onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
                onSelectResource={openResourceTab}
                onNewResource={openNewResource}
                onDeleteResource={(index) => setDeletingResource(index)}
                onOpenOverview={openOverview}
                onOpenSettings={() => setSettingsOpen(true)}
              />
            ) : undefined
          }
          tabBar={
            draft && form ? (
              <BDAppBuilderTabs
                tabs={
                  mode === "preview"
                    ? [{ id: "preview", label: "Preview" }]
                    : tabItems
                }
                activeTab={mode === "preview" ? "preview" : activeTab}
                onChange={(id) => {
                  if (mode === "design") activateTab(id);
                }}
                onClose={mode === "design" ? closeTab : undefined}
                onNew={mode === "design" ? openNewResource : undefined}
                mode={mode}
                onModeChange={setMode}
              />
            ) : undefined
          }
          statusBar={
            draft ? (
              <>
                <div className="flex min-w-0 items-center gap-2 overflow-hidden">
                  <span>{draft.resources.length} resources</span>
                  <span>·</span>
                  <span>{openTabs.length} open tabs</span>
                  <span>·</span>
                  <span>{form?.published ? "Published" : "Draft"}</span>
                  {mode === "preview" && (
                    <>
                      <span>·</span>
                      <span>Render preview</span>
                    </>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {draft.slug && (
                    <span className="max-w-48 truncate">
                      {draft.slug}
                      {draft.path ? ` · ${draft.path}` : ""}
                    </span>
                  )}
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      dirty ? "bg-amber-500" : "bg-emerald-500",
                    )}
                  />
                  <span>{dirty ? "Unsaved changes" : "Saved"}</span>
                </div>
              </>
            ) : undefined
          }
        >
          {draft && form ? (
            mode === "preview" ? (
              <BDAppRenderingComponent appId={draft.id} embedded />
            ) : activeTab === OVERVIEW_TAB ? (
              <BDAppBuilderOverview
                app={draft}
                form={form}
                onOpenSettings={() => setSettingsOpen(true)}
                onFillDetails={() => setAppFillerOpen(true)}
                onOpenApp={() => openAppInNewTab(draft.id)}
              />
            ) : activeTab === NEW_RESOURCE_TAB && creatingResource ? (
              <BDAppResourceComponent
                ref={resourceEditorRef}
                open
                variant="inline"
                resource={creatingResource}
                models={designerModels}
                schemaTied={!!draft.schemaGroupId}
                resources={draft.resources}
                isNew
                resetToken={`new-${createCounter}`}
                projectId={projectId}
                isSaving={saving}
                onClose={() => closeTab(NEW_RESOURCE_TAB)}
                onSave={saveResource}
                onDelete={() => {}}
              />
            ) : activeResource ? (
              <BDAppResourceComponent
                ref={resourceEditorRef}
                open
                variant="inline"
                resource={activeResource}
                models={designerModels}
                schemaTied={!!draft.schemaGroupId}
                resources={draft.resources}
                isNew={false}
                resetToken={activeResource.slug}
                projectId={projectId}
                isSaving={saving}
                onClose={() => closeTab(activeResource.slug)}
                onSave={saveResource}
                onDelete={() => setDeletingResource(activeResourceIndex)}
              />
            ) : (
              <div className="flex h-full items-center justify-center p-6">
                <BDEmptyState
                  icon={LayoutGrid}
                  title="No tab open"
                  description="Select a resource in the sidebar, or create a new one."
                  action={
                    <BDButton icon={Plus} onClick={openNewResource}>
                      New resource
                    </BDButton>
                  }
                />
              </div>
            )
          ) : (
            <BDEmptyState
              icon={AppWindow}
              title="App not found"
              description="This app may have been deleted."
            />
          )}
        </BDAppBuilderShell>
      </div>

      {draft && form && (
        <BDAppSettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          form={form}
          onChange={updateMeta}
          onFillDetails={() => setAppFillerOpen(true)}
          onSave={handleSaveApp}
          isSaving={saving}
          resourceActions={resourceActions}
          schemaGroups={schemaGroups ?? []}
        />
      )}

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
    </>
  );
}

export default BDAppBuilderComponent;
