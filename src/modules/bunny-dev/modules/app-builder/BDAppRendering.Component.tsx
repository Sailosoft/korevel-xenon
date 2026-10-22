"use client";

// BDAppRendering.Component — the App Rendering engine.
//
// Renders a generated Filament-style app from its BDApp config: resource nav,
// list/create/edit/view pages, full CRUD, and relation selection across schema
// models. Rows live in the dedicated `BunnyDevAppDB` database, namespaced by
// appId + resourceSlug.

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  ExternalLink,
  Search,
  ArrowLeft,
  LayoutGrid,
  Sparkles,
} from "lucide-react";
import { cn } from "@heroui/react";
import { bdAppDB, migrateLegacyAppRecords } from "../../BDAppDatabase";
import type {
  BDAppColumn,
  BDAppConnection,
  BDAppField,
  BDAppFormBehavior,
  BDAppRecord,
  BDAppResource,
} from "../../BDDomain.Types";
import { useBDApp, useBDProjectSchemaModels } from "./BDApp.Hooks";
import { bdAppRecordRepository } from "./BDApp.Repository";
import {
  BD_APP_DEFAULT_COLORS,
  collectAppEntries,
  collectAppFields,
  connectionKey,
  deriveConnectionColumns,
  deriveConnectionFields,
  formFromModel,
  readableTextColor,
  resolveFormBehavior,
  stampGeneratedId,
  tableFromModel,
} from "./BDApp.Types";
import BDAppRelationManager from "./BDAppRelationManager.Component";
import BDAppStandaloneShell from "./BDAppStandaloneShell.Component";
import BDAppRecordAIComponent from "./BDAppRecordAI.Component";
import BDSchemaForm from "../../components/BDSchemaForm";
import BDButton from "../../components/BDButton";
import BDModal from "../../components/BDModal";
import BDConfirmDialog from "../../components/BDConfirmDialog";
import BDEmptyState from "../../components/BDEmptyState";
import BDBadge from "../../components/BDBadge";
import { useBDToast } from "../../components/BDToast";
import type { BDFormOption, BDFormValues } from "../../components/BDForm";

// Palette tokens resolve to concrete colors; raw CSS colors pass through.
function resolveAppColor(value?: string): string {
  if (!value) return BD_APP_DEFAULT_COLORS.primary;
  return (
    (BD_APP_DEFAULT_COLORS as Record<string, string>)[value] ?? value
  );
}

export interface BDAppRenderingComponentProps {
  appId: string;
  /** Hide the resource nav (used when embedded in the designer preview). */
  embedded?: boolean;
  /** Standalone app chrome (no designer footer, back-to-metadata control). */
  standalone?: boolean;
}

export function BDAppRenderingComponent({
  appId,
  embedded = false,
  standalone = false,
}: BDAppRenderingComponentProps) {
  const app = useBDApp(appId);
  const router = useRouter();
  const { toast } = useBDToast();
  const models = useBDProjectSchemaModels(app?.projectId ?? "");

  const liveRecords = useLiveQuery(
    () => bdAppDB.appRecords.where("appId").equals(appId).toArray(),
    [appId],
  );
  const allRecords = useMemo(() => liveRecords ?? [], [liveRecords]);

  const [activeSlug, setActiveSlug] = useState<string | undefined>();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<{
    mode: "create" | "edit";
    row?: BDAppRecord;
  } | null>(null);
  const [formValues, setFormValues] = useState<BDFormValues>({});
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<BDAppRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [childEditing, setChildEditing] = useState<{
    connection: BDAppConnection;
    mode: "create" | "edit";
    row?: BDAppRecord;
  } | null>(null);
  const [childValues, setChildValues] = useState<BDFormValues>({});
  const [childSaving, setChildSaving] = useState(false);
  const [recordAiOpen, setRecordAiOpen] = useState(false);
  // SPA chrome state (standalone only): icon-rail collapse + mobile drawer.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const viewing = useMemo(
    () => allRecords.find((row) => row.id === viewingId) ?? null,
    [allRecords, viewingId],
  );

  // Copy any pre-existing records from the legacy table once.
  useEffect(() => {
    void migrateLegacyAppRecords();
  }, []);

  // Standalone apps own the browser tab title.
  useEffect(() => {
    if (!standalone) return;
    const previous = document.title;
    document.title = app?.brand?.name || app?.name || "Application";
    return () => {
      document.title = previous;
    };
  }, [standalone, app?.brand?.name, app?.name]);

  const resources = useMemo(() => app?.resources ?? [], [app]);
  const resolvedSlug =
    activeSlug && resources.some((r) => r.slug === activeSlug)
      ? activeSlug
      : resources[0]?.slug;
  if (resolvedSlug !== activeSlug) setActiveSlug(resolvedSlug);

  const activeResource = resources.find((r) => r.slug === resolvedSlug);
  // Schema models only drive rendering when the app is tied to a schema group.
  const schemaTied = !!app?.schemaGroupId;
  const modelFor = (resource: BDAppResource | undefined) =>
    schemaTied
      ? (models ?? []).find((m) => m.id === resource?.modelId)
      : undefined;

  /** Add the model's generated primary-key value to new record data. */
  const stampIdFor = (
    resource: BDAppResource | undefined,
    data: Record<string, unknown>,
  ) => (resource ? stampGeneratedId(resource, modelFor(resource), allRecords, data) : data);

  const fieldsForResource = (resource: BDAppResource): BDAppField[] => {
    const model = modelFor(resource);
    const defined = collectAppFields(resource.form?.components);
    const base =
      defined.length > 0
        ? defined
        : model
          ? collectAppFields(formFromModel(model).components)
          : [];
    const derived = deriveConnectionFields(resource);
    const derivedNames = new Set(derived.map((f) => f.name));
    return [...base.filter((f) => !derivedNames.has(f.name)), ...derived];
  };

  const columnsForResource = (resource: BDAppResource): BDAppColumn[] => {
    const model = modelFor(resource);
    const base =
      resource.table?.columns && resource.table.columns.length > 0
        ? resource.table.columns
        : model
          ? tableFromModel(model).columns
          : [];
    const merged = [...base];
    const seen = new Set(merged.map((c) => c.name));
    for (const column of deriveConnectionColumns(resource)) {
      if (seen.has(column.name)) continue;
      merged.push(column);
      seen.add(column.name);
    }
    return merged;
  };

  const resolveTarget = (field: BDAppField): BDAppResource | undefined => {
    if (!field.relation) return undefined;
    if (field.relation.targetSlug) {
      return resources.find((r) => r.slug === field.relation?.targetSlug);
    }
    return resources.find((r) => r.modelId === field.relation?.modelId);
  };

  const relationOptionsFor = (
    resource: BDAppResource,
  ): Record<string, BDFormOption[]> => {
    const map: Record<string, BDFormOption[]> = {};
    for (const field of fieldsForResource(resource)) {
      if (field.type !== "relationSelect") continue;
      const target = resolveTarget(field);
      if (!target) continue;
      const titleKey = field.relation?.titleAttribute ?? "name";
      map[field.name] = allRecords
        .filter((r) => r.resourceSlug === target.slug)
        .map((r) => ({
          value: r.id,
          label: String(r.data[titleKey] ?? r.id),
        }));
    }
    return map;
  };

  const fields = activeResource ? fieldsForResource(activeResource) : [];
  const columns = activeResource ? columnsForResource(activeResource) : [];
  const relationOptions = activeResource
    ? relationOptionsFor(activeResource)
    : {};
  const childTarget = childEditing
    ? resources.find((r) => r.slug === childEditing.connection.targetSlug)
    : undefined;

  const rows = useMemo(() => {
    const forSlug = allRecords.filter(
      (r) => r.resourceSlug === resolvedSlug,
    );
    if (!query.trim()) return forSlug;
    const q = query.toLowerCase();
    return forSlug.filter((row) =>
      Object.values(row.data).some((v) => String(v ?? "").toLowerCase().includes(q)),
    );
  }, [allRecords, resolvedSlug, query]);

  if (app === undefined) {
    return standalone ? (
      <p className="flex h-full items-center justify-center text-sm text-slate-500">
        Loading app…
      </p>
    ) : (
      <p className="p-6 text-sm text-slate-500">Loading app…</p>
    );
  }
  if (app === null) {
    return standalone ? (
      <div className="flex h-full items-center justify-center p-6">
        <BDEmptyState
          icon={LayoutGrid}
          title="App not found"
          description="This generated app may have been deleted."
        />
      </div>
    ) : (
      <BDEmptyState
        icon={LayoutGrid}
        title="App not found"
        description="This generated app may have been deleted."
      />
    );
  }

  const openCreate = () => {
    setFormValues({});
    setRecordAiOpen(false);
    setEditing({ mode: "create" });
  };

  const openEdit = (row: BDAppRecord) => {
    setFormValues({ ...row.data });
    setRecordAiOpen(false);
    setEditing({ mode: "edit", row });
  };

  const handleSubmit = async (
    values: BDFormValues,
    then: BDAppFormBehavior,
  ) => {
    if (!editing || !resolvedSlug) return;
    setSaving(true);
    try {
      if (editing.mode === "create") {
        const created = await bdAppRecordRepository.createRow({
          projectId: app.projectId,
          appId,
          resourceSlug: resolvedSlug,
          data: stampIdFor(activeResource, values),
        });
        setEditing(null);
        if (then === "view") setViewingId(created.id);
      } else if (editing.row) {
        const id = editing.row.id;
        await bdAppRecordRepository.update(id, { data: values });
        setEditing(null);
        if (then === "view") setViewingId(id);
      }
      toast({ title: "Saved", status: "success" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    await bdAppRecordRepository.deleteRowWithLinks(app, deleting);
    setDeleting(null);
    toast({ title: "Deleted", status: "success" });
  };

  const handleRecordAiBatch = async (records: Record<string, unknown>[]) => {
    if (!resolvedSlug || records.length === 0) return;
    // Feed each stamped record back in so incremental ids advance per row.
    const pending: { resourceSlug: string; data: Record<string, unknown> }[] = [
      ...allRecords,
    ];
    const rows = records.map((data) => {
      const stamped = activeResource
        ? stampGeneratedId(
            activeResource,
            modelFor(activeResource),
            pending,
            data,
          )
        : data;
      pending.push({ resourceSlug: resolvedSlug, data: stamped });
      return stamped;
    });
    await Promise.all(
      rows.map((data) =>
        bdAppRecordRepository.createRow({
          projectId: app.projectId,
          appId,
          resourceSlug: resolvedSlug,
          data,
        }),
      ),
    );
    setEditing(null);
    setRecordAiOpen(false);
    toast({
      title: `Created ${records.length} record${records.length === 1 ? "" : "s"}`,
      status: "success",
    });
  };

  const openChildCreate = (connection: BDAppConnection) => {
    setChildValues({});
    setChildEditing({ connection, mode: "create" });
  };

  const openChildEdit = (connection: BDAppConnection, row: BDAppRecord) => {
    setChildValues({ ...row.data });
    setChildEditing({ connection, mode: "edit", row });
  };

  const handleChildSubmit = async (values: BDFormValues) => {
    if (!childEditing) return;
    setChildSaving(true);
    try {
      const key = activeResource
        ? connectionKey(childEditing.connection, activeResource.slug)
        : "";
      if (childEditing.mode === "create") {
        const data =
          key && viewing ? { ...values, [key]: viewing.id } : values;
        await bdAppRecordRepository.createRow({
          projectId: app.projectId,
          appId,
          resourceSlug: childEditing.connection.targetSlug,
          data: stampIdFor(childTarget, data),
        });
      } else if (childEditing.row) {
        await bdAppRecordRepository.update(childEditing.row.id, {
          data: values,
        });
      }
      setChildEditing(null);
      toast({ title: "Saved", status: "success" });
    } finally {
      setChildSaving(false);
    }
  };

  const handleChildDelete = async (row: BDAppRecord) => {
    await bdAppRecordRepository.deleteRowWithLinks(app, row);
    toast({ title: "Deleted", status: "success" });
  };

  const fieldLabel = (name: string) =>
    fields.find((f) => f.name === name)?.label ?? name;

  const renderCell = (
    name: string,
    row: BDAppRecord,
    resource: BDAppResource | undefined = activeResource,
  ) => {
    const resourceFields = resource ? fieldsForResource(resource) : [];
    const field = resourceFields.find((f) => f.name === name);
    const value = row.data[name];
    if (field?.type === "relationSelect" && field.relation) {
      const options = resource ? relationOptionsFor(resource)[field.name] ?? [] : [];
      if (field.relation.multiple) {
        const ids = Array.isArray(value) ? (value as string[]) : [];
        const labels = ids
          .map((id) => options.find((o) => o.value === id)?.label)
          .filter((label): label is string => Boolean(label));
        if (labels.length === 0) return "—";
        return (
          <span className="flex flex-wrap gap-1">
            {labels.map((label, index) => (
              <BDBadge key={index} color="info">
                {label}
              </BDBadge>
            ))}
          </span>
        );
      }
      const option = options.find((o) => o.value === value);
      return option ? <BDBadge color="info">{option.label}</BDBadge> : "—";
    }
    if (typeof value === "boolean") {
      return <BDBadge color={value ? "success" : "gray"}>{String(value)}</BDBadge>;
    }
    if (Array.isArray(value)) {
      return value.length > 0 ? value.map(String).join(", ") : "—";
    }
    if (value === undefined || value === null || value === "") return "—";
    return String(value);
  };

  const openLinkedRecord = (row: BDAppRecord) => {
    const owner = resources.find((r) => r.slug === row.resourceSlug);
    if (owner) setActiveSlug(owner.slug);
    setViewingId(row.id);
  };

  const renderConnectionSection = (connection: BDAppConnection) => {
    if (!viewing || !activeResource) return null;
    const target = resources.find((r) => r.slug === connection.targetSlug);
    if (!target) return null;
    return (
      <BDAppRelationManager
        key={connection.name}
        connection={connection}
        ownerResource={activeResource}
        viewing={viewing}
        target={target}
        allRecords={allRecords}
        fieldsForResource={fieldsForResource}
        columnsForResource={columnsForResource}
        renderCell={renderCell}
        onCreateChild={openChildCreate}
        onEditChild={openChildEdit}
        onDeleteChild={handleChildDelete}
        onViewRecord={openLinkedRecord}
      />
    );
  };

  const infolistEntries = activeResource?.infolist
    ? collectAppEntries(activeResource.infolist.components)
    : [];

  const formBehavior: BDAppFormBehavior = activeResource
    ? resolveFormBehavior(activeResource)
    : "close";
  const altFormBehavior: BDAppFormBehavior =
    formBehavior === "view" ? "close" : "view";
  const submitVerb = editing?.mode === "create" ? "Create" : "Save";
  const submitWithView = `${submitVerb} & view`;

  const themeColors = {
    ...app.colors,
    ...app.brand?.colors,
    ...app.theme?.colors,
  };
  const primaryColor = resolveAppColor(app.theme?.primary);
  const standaloneStyle = standalone
    ? ({
        "--bd-primary": primaryColor,
        "--bd-on-primary": readableTextColor(primaryColor),
        ...Object.fromEntries(
          Object.entries(themeColors)
            .filter(([, value]) => typeof value === "string" && value)
            .map(([key, value]) => [`--bd-color-${key}`, value]),
        ),
        ...(app.theme?.mode === "dark"
          ? { backgroundColor: "#0f172a", color: "#e2e8f0" }
          : {}),
      } as unknown as CSSProperties)
    : undefined;

  const brandName = app.brand?.name || app.name || "Application";
  const activeLabel = activeResource
    ? activeResource.pluralLabel ?? activeResource.label ?? activeResource.name
    : undefined;
  const totalForActive = allRecords.filter(
    (record) => record.resourceSlug === resolvedSlug,
  ).length;

  // Resource page — toolbar + table + footer. Shared by the SPA shell content
  // pane (standalone) and the designer's preview grid (embedded).
  const resourcePage = (
    <div
      className={cn(
        "flex min-h-0 flex-col gap-3",
        standalone && "h-full p-4 md:p-6",
      )}
    >
      {activeResource ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">
                {activeLabel}
              </p>
              <p className="text-xs text-slate-500">{rows.length} records</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search…"
                  className="w-52 rounded-lg border border-slate-200 py-1.5 pl-8 pr-3 text-sm outline-none focus:border-[var(--bd-primary)]"
                />
              </div>
              <BDButton size="sm" icon={Plus} onClick={openCreate}>
                Create
              </BDButton>
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="flex min-h-0 flex-1 items-center justify-center p-4">
              <BDEmptyState
                icon={LayoutGrid}
                title={query.trim() ? "No matches" : "No records yet"}
                description={
                  query.trim()
                    ? "No records match your search."
                    : "Create the first record for this resource."
                }
                action={
                  <BDButton icon={Plus} onClick={openCreate}>
                    Create record
                  </BDButton>
                }
              />
            </div>
          ) : (
            <div
              className={cn(
                "bd-scroll overflow-auto rounded-xl border border-slate-200 bg-white",
                standalone && "min-h-40",
              )}
            >
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    {columns.map((col) => (
                      <th
                        key={col.name}
                        className="bd-sticky-head whitespace-nowrap bg-slate-50 px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500"
                      >
                        {col.label ?? col.name}
                      </th>
                    ))}
                    <th className="bd-sticky-head w-28 bg-slate-50 px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-t border-slate-100 transition-colors hover:bg-blue-50/40"
                    >
                      {columns.map((col) => {
                        const cell = renderCell(col.name, row);
                        return (
                          <td
                            key={col.name}
                            className="px-3 py-2.5 align-middle text-slate-700"
                          >
                            {typeof cell === "string" ? (
                              <span
                                className="block max-w-[18rem] truncate"
                                title={cell}
                              >
                                {cell}
                              </span>
                            ) : (
                              cell
                            )}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600"
                            onClick={() => setViewingId(row.id)}
                            aria-label="View"
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600"
                            onClick={() => openEdit(row)}
                            aria-label="Edit"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-500"
                            onClick={() => setDeleting(row)}
                            aria-label="Delete"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="shrink-0 px-1 text-[11px] text-slate-500">
            {rows.length}
            {rows.length !== totalForActive ? ` of ${totalForActive}` : ""}{" "}
            {rows.length === 1 ? "record" : "records"}
            {query.trim() ? ` · filtered by "${query.trim()}"` : ""}
          </p>
        </>
      ) : (
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <BDEmptyState
            icon={LayoutGrid}
            title="No resource selected"
            description="Add a resource in the designer to render a CRUD page."
          />
        </div>
      )}
    </div>
  );

  return (
    <div
      className={standalone ? "h-full" : "flex flex-col gap-4"}
      style={standaloneStyle}
      data-bd-theme={standalone ? app.theme?.mode ?? "system" : undefined}
    >
      {standalone ? (
        <BDAppStandaloneShell
          brand={{ name: brandName, logo: app.brand?.logo }}
          breadcrumb={activeLabel ? [brandName, activeLabel] : [brandName]}
          resources={resources.map((resource) => ({
            slug: resource.slug,
            label: resource.pluralLabel ?? resource.label ?? resource.name,
          }))}
          activeSlug={resolvedSlug}
          onSelect={(slug) => {
            setActiveSlug(slug);
            setQuery("");
          }}
          sidebarCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((value) => !value)}
          drawerOpen={drawerOpen}
          onToggleDrawer={() => setDrawerOpen((value) => !value)}
          onCloseDrawer={() => setDrawerOpen(false)}
          stats={
            <>
              {allRecords.length} records · {app.path}
            </>
          }
          actions={
            <BDButton
              size="sm"
              variant="ghost"
              icon={ExternalLink}
              title="Open the designer"
              className="text-[var(--bd-on-primary)] hover:bg-white/15 hover:text-[var(--bd-on-primary)]"
              onClick={() =>
                router.push(
                  `/modules/bunny-dev/projects/${app.projectId}/app/${appId}`,
                )
              }
            >
              Designer
            </BDButton>
          }
        >
          {resourcePage}
        </BDAppStandaloneShell>
      ) : (
        <>
          {!embedded && (
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
              <LayoutGrid className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {app.name}
                </p>
                <p className="text-xs text-slate-500">
                  {app.path} · {resources.length} resources
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[14rem_1fr]">
            {/* Resource nav */}
            <nav className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-2">
              {resources.map((resource) => (
                <button
                  key={resource.slug}
                  type="button"
                  onClick={() => {
                    setActiveSlug(resource.slug);
                    setQuery("");
                  }}
                  className={`rounded-lg px-3 py-2 text-left text-sm ${
                    resource.slug === resolvedSlug
                      ? "bg-blue-50 font-semibold text-blue-700"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {resource.pluralLabel ?? resource.label ?? resource.name}
                </button>
              ))}
              {resources.length === 0 && (
                <p className="px-3 py-2 text-xs text-slate-400">
                  No resources defined.
                </p>
              )}
            </nav>

            <div className="min-w-0">{resourcePage}</div>
          </div>
        </>
      )}

      {/* Create / Edit form */}
      <BDModal
        open={editing !== null}
        onClose={() => {
          setEditing(null);
          setRecordAiOpen(false);
        }}
        title={
          editing?.mode === "create"
            ? `Create ${activeResource?.label ?? "record"}`
            : `Edit ${activeResource?.label ?? "record"}`
        }
        size="lg"
        closeOnEscape={!recordAiOpen}
      >
        {editing?.mode === "create" && (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="text-xs text-slate-500">
              Fill this record with AI, then review before creating.
            </span>
            <BDButton
              size="sm"
              variant="secondary"
              icon={Sparkles}
              onClick={() => setRecordAiOpen(true)}
            >
              Generate with AI
            </BDButton>
          </div>
        )}
        <BDSchemaForm
          fields={fields}
          value={formValues}
          onChange={setFormValues}
          onSubmit={(values) => handleSubmit(values, formBehavior)}
          onSecondarySubmit={(values) => handleSubmit(values, altFormBehavior)}
          onCancel={() => {
            setEditing(null);
            setRecordAiOpen(false);
          }}
          submitLabel={formBehavior === "view" ? submitWithView : submitVerb}
          secondarySubmitLabel={
            formBehavior === "view" ? submitVerb : submitWithView
          }
          isLoading={saving}
          relationOptions={relationOptions}
        />
      </BDModal>

      {/* AI record fill (Create modal only) */}
      <BDAppRecordAIComponent
        open={recordAiOpen}
        onOpenChange={setRecordAiOpen}
        projectId={app.projectId}
        resourceLabel={activeResource?.label ?? activeResource?.name}
        fields={fields}
        relationOptions={relationOptions}
        current={formValues}
        onAccept={(values) =>
          setFormValues((prev) => ({ ...prev, ...values }))
        }
        onAcceptBatch={handleRecordAiBatch}
      />

      {/* View */}
      <BDModal
        open={viewing !== null}
        onClose={() => setViewingId(null)}
        title={activeResource?.label ?? "Record"}
        size="md"
        closeOnEscape={childEditing === null}
      >
        <div className="flex flex-col gap-3">
          {infolistEntries.length > 0
            ? infolistEntries.map((entry) => (
                <div key={entry.name} className="flex flex-col gap-0.5">
                  <span className="text-xs text-slate-400">
                    {entry.label ?? entry.name}
                  </span>
                  <span className="text-sm text-slate-800">
                    {viewing ? renderCell(entry.name, viewing) : "—"}
                  </span>
                </div>
              ))
            : fields.map((field) => (
                <div key={field.name} className="flex flex-col gap-0.5">
                  <span className="text-xs text-slate-400">
                    {fieldLabel(field.name)}
                  </span>
                  <span className="text-sm text-slate-800">
                    {viewing ? renderCell(field.name, viewing) : "—"}
                  </span>
                </div>
              ))}

          {(activeResource?.connections ?? []).map((connection) =>
            renderConnectionSection(connection),
          )}
        </div>
      </BDModal>

      {/* Related-record editor (one-to-many / many-to-many) */}
      <BDModal
        open={childEditing !== null}
        onClose={() => setChildEditing(null)}
        title={
          childEditing?.mode === "create"
            ? `Create ${childTarget?.label ?? "record"}`
            : `Edit ${childTarget?.label ?? "record"}`
        }
        size="lg"
      >
        {childTarget ? (
          <BDSchemaForm
            fields={fieldsForResource(childTarget)}
            value={childValues}
            onChange={setChildValues}
            onSubmit={handleChildSubmit}
            onCancel={() => setChildEditing(null)}
            submitLabel={childEditing?.mode === "create" ? "Create" : "Save"}
            isLoading={childSaving}
            relationOptions={relationOptionsFor(childTarget)}
          />
        ) : (
          <p className="text-sm text-slate-500">
            Target resource not found.
          </p>
        )}
      </BDModal>

      <BDConfirmDialog
        open={!!deleting}
        title="Delete record?"
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />

      {embedded && !standalone && (
        <p className="flex items-center gap-1 text-[11px] text-slate-400">
          <ArrowLeft className="h-3 w-3" /> Preview uses live app records.
        </p>
      )}
    </div>
  );
}

export default BDAppRenderingComponent;
