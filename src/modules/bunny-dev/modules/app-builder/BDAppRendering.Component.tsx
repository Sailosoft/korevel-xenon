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
  Search,
  ArrowLeft,
  LayoutGrid,
} from "lucide-react";
import { bdAppDB, migrateLegacyAppRecords } from "../../BDAppDatabase";
import type {
  BDAppColumn,
  BDAppConnection,
  BDAppField,
  BDAppRecord,
  BDAppResource,
} from "../../BDDomain.Types";
import { useBDApp, useBDProjectSchemaModels } from "./BDApp.Hooks";
import { bdAppRecordRepository } from "./BDApp.Repository";
import {
  collectAppEntries,
  collectAppFields,
  connectionKey,
  deriveConnectionColumns,
  deriveConnectionFields,
  formFromModel,
  tableFromModel,
} from "./BDApp.Types";
import BDAppRelationManager from "./BDAppRelationManager.Component";
import BDSchemaForm from "../../components/BDSchemaForm";
import BDButton from "../../components/BDButton";
import BDModal from "../../components/BDModal";
import BDConfirmDialog from "../../components/BDConfirmDialog";
import BDEmptyState from "../../components/BDEmptyState";
import BDBadge from "../../components/BDBadge";
import { useBDToast } from "../../components/BDToast";
import type { BDFormOption, BDFormValues } from "../../components/BDForm";

// Palette tokens resolve to concrete colors; raw CSS colors pass through.
const BD_APP_COLOR_HEX: Record<string, string> = {
  primary: "#1976d2",
  success: "#16a34a",
  warning: "#d97706",
  danger: "#dc2626",
  info: "#0288d1",
  gray: "#64748b",
};

function resolveAppColor(value?: string): string {
  if (!value) return BD_APP_COLOR_HEX.primary;
  return BD_APP_COLOR_HEX[value] ?? value;
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
  const modelFor = (resource: BDAppResource | undefined) =>
    (models ?? []).find((m) => m.id === resource?.modelId);

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
    return <p className="p-6 text-sm text-slate-500">Loading app…</p>;
  }
  if (app === null) {
    return (
      <BDEmptyState
        icon={LayoutGrid}
        title="App not found"
        description="This generated app may have been deleted."
      />
    );
  }

  const openCreate = () => {
    setFormValues({});
    setEditing({ mode: "create" });
  };

  const openEdit = (row: BDAppRecord) => {
    setFormValues({ ...row.data });
    setEditing({ mode: "edit", row });
  };

  const handleSubmit = async (values: BDFormValues) => {
    if (!editing || !resolvedSlug) return;
    setSaving(true);
    try {
      if (editing.mode === "create") {
        await bdAppRecordRepository.createRow({
          projectId: app.projectId,
          appId,
          resourceSlug: resolvedSlug,
          data: values,
        });
      } else if (editing.row) {
        await bdAppRecordRepository.update(editing.row.id, { data: values });
      }
      setEditing(null);
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
        await bdAppRecordRepository.createRow({
          projectId: app.projectId,
          appId,
          resourceSlug: childEditing.connection.targetSlug,
          data: key && viewing ? { ...values, [key]: viewing.id } : values,
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

  const themeColors = {
    ...app.colors,
    ...app.brand?.colors,
    ...app.theme?.colors,
  };
  const standaloneStyle = standalone
    ? ({
        "--bd-primary": resolveAppColor(app.theme?.primary),
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

  return (
    <div
      className="flex flex-col gap-4"
      style={standaloneStyle}
      data-bd-theme={standalone ? app.theme?.mode ?? "system" : undefined}
    >
      {standalone && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            {app.brand?.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={app.brand.logo}
                alt=""
                className="h-8 w-8 rounded object-contain"
              />
            ) : (
              <LayoutGrid className="h-5 w-5 text-blue-600" />
            )}
            <div>
              <p className="text-sm font-semibold text-slate-800">
                {app.brand?.name || app.name}
              </p>
              <p className="text-xs text-slate-500">
                {app.description || `${app.path} · ${resources.length} resources`}
              </p>
            </div>
          </div>
          <BDButton
            size="sm"
            variant="secondary"
            icon={ArrowLeft}
            onClick={() =>
              router.push(
                `/modules/bunny-dev/projects/${app.projectId}/app/${appId}`,
              )
            }
          >
            Back to metadata
          </BDButton>
        </div>
      )}

      {!embedded && !standalone && (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
          <LayoutGrid className="h-4 w-4 text-blue-600" />
          <div>
            <p className="text-sm font-semibold text-slate-800">{app.name}</p>
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

        {/* Resource page */}
        <div className="flex flex-col gap-3">
          {activeResource ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {activeResource.pluralLabel ??
                      activeResource.label ??
                      activeResource.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {rows.length} records
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search…"
                      className="w-52 rounded-lg border border-slate-200 py-1.5 pl-8 pr-3 text-sm outline-none focus:border-blue-400"
                    />
                  </div>
                  <BDButton size="sm" icon={Plus} onClick={openCreate}>
                    Create
                  </BDButton>
                </div>
              </div>

              {rows.length === 0 ? (
                <BDEmptyState
                  icon={LayoutGrid}
                  title="No records yet"
                  description="Create the first record for this resource."
                  action={
                    <BDButton icon={Plus} onClick={openCreate}>
                      Create record
                    </BDButton>
                  }
                />
              ) : (
                <div className="bd-scroll overflow-x-auto rounded-xl border border-slate-200 bg-white">
                  <table className="w-full border-collapse text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                      <tr>
                        {columns.map((col) => (
                          <th key={col.name} className="px-3 py-2 font-medium">
                            {col.label ?? col.name}
                          </th>
                        ))}
                        <th className="w-px px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.id} className="border-t border-slate-100">
                          {columns.map((col) => (
                            <td key={col.name} className="px-3 py-2 text-slate-700">
                              {renderCell(col.name, row)}
                            </td>
                          ))}
                          <td className="px-3 py-2">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                className="rounded p-1 text-slate-400 hover:text-blue-600"
                                onClick={() => setViewingId(row.id)}
                                aria-label="View"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                className="rounded p-1 text-slate-400 hover:text-blue-600"
                                onClick={() => openEdit(row)}
                                aria-label="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                className="rounded p-1 text-slate-400 hover:text-red-500"
                                onClick={() => setDeleting(row)}
                                aria-label="Delete"
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
            </>
          ) : (
            <BDEmptyState
              icon={LayoutGrid}
              title="No resource selected"
              description="Add a resource in the designer to render a CRUD page."
            />
          )}
        </div>
      </div>

      {/* Create / Edit form */}
      <BDModal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={
          editing?.mode === "create"
            ? `Create ${activeResource?.label ?? "record"}`
            : `Edit ${activeResource?.label ?? "record"}`
        }
        size="lg"
      >
        <BDSchemaForm
          fields={fields}
          value={formValues}
          onChange={setFormValues}
          onSubmit={handleSubmit}
          onCancel={() => setEditing(null)}
          submitLabel={editing?.mode === "create" ? "Create" : "Save"}
          isLoading={saving}
          relationOptions={relationOptions}
        />
      </BDModal>

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
