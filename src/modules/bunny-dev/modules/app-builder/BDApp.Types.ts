// BDApp.Types.ts — App Builder form shapes, factories, and helpers that derive
// default forms/tables from a schema model.

import type {
  BDApp,
  BDAppColumn,
  BDAppComponent,
  BDAppConnection,
  BDAppConnectionType,
  BDAppEntry,
  BDAppField,
  BDAppFieldType,
  BDAppResource,
  BDAppSchema,
  BDAppTable,
} from "./BDApp.Domain";
import type {
  BDSchemaModel,
  BDSchemaProperty,
  BDSchemaType,
} from "../schema-builder/BDSchema.Domain";

export interface BDAppForm {
  name: string;
  slug: string;
  path: string;
  description: string;
  brandName: string;
  logoUrl: string;
  themeMode: "light" | "dark" | "system";
  primaryColor: string;
}

export const BD_APP_EMPTY_FORM: BDAppForm = {
  name: "",
  slug: "",
  path: "/",
  description: "",
  brandName: "",
  logoUrl: "",
  themeMode: "system",
  primaryColor: "",
};

const FIELD_TYPES: BDAppFieldType[] = [
  "text",
  "textarea",
  "richEditor",
  "markdown",
  "code",
  "slug",
  "hidden",
  "select",
  "multiSelect",
  "radio",
  "checkbox",
  "checkboxList",
  "toggle",
  "toggleButtons",
  "date",
  "time",
  "dateTime",
  "color",
  "tags",
  "keyValue",
  "fileUpload",
  "image",
  "repeater",
  "builder",
  "relationSelect",
];

export const BD_APP_FIELD_TYPE_OPTIONS = FIELD_TYPES.map((v) => ({
  label: v,
  value: v,
}));

const COLUMN_TYPES: BDAppColumn["type"][] = [
  "text",
  "badge",
  "icon",
  "image",
  "color",
  "boolean",
  "date",
  "dateTime",
  "since",
  "money",
  "numeric",
  "tags",
  "select",
  "toggle",
  "progress",
  "action",
];

export const BD_APP_COLUMN_TYPE_OPTIONS = COLUMN_TYPES.map((v) => ({
  label: v,
  value: v,
}));

const FIELD_TYPE_MAP: Record<BDSchemaType, BDAppFieldType> = {
  string: "text",
  text: "textarea",
  integer: "text",
  bigint: "text",
  float: "text",
  double: "text",
  decimal: "text",
  boolean: "toggle",
  date: "date",
  time: "time",
  datetime: "dateTime",
  timestamp: "dateTime",
  uuid: "text",
  json: "keyValue",
  jsonb: "keyValue",
  binary: "fileUpload",
  enum: "select",
  array: "tags",
};

const COLUMN_TYPE_MAP: Record<BDSchemaType, BDAppColumn["type"]> = {
  string: "text",
  text: "text",
  integer: "numeric",
  bigint: "numeric",
  float: "numeric",
  double: "numeric",
  decimal: "money",
  boolean: "toggle",
  date: "date",
  time: "text",
  datetime: "dateTime",
  timestamp: "dateTime",
  uuid: "text",
  json: "text",
  jsonb: "text",
  binary: "text",
  enum: "badge",
  array: "tags",
};

function slugify(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .toLowerCase()
    .replace(/^-+|-+$/g, "");
}

/** Build a form field from a schema column. */
export function fieldFromProperty(property: BDSchemaProperty): BDAppField {
  const type = FIELD_TYPE_MAP[property.type] ?? "text";
  return {
    kind: "field",
    type,
    name: property.name,
    label: property.name,
    required: !property.nullable && !property.primary,
    options:
      property.type === "enum" && property.values
        ? Object.fromEntries(property.values.map((v) => [v, v]))
        : undefined,
  };
}

/** Build a table column from a schema column. */
export function columnFromProperty(property: BDSchemaProperty): BDAppColumn {
  return {
    type: COLUMN_TYPE_MAP[property.type] ?? "text",
    name: property.name,
    label: property.name,
    sortable: true,
    searchable: property.type === "string" || property.type === "text",
  };
}

/** A default form definition derived from a schema model. */
export function formFromModel(model: BDSchemaModel): BDAppSchema {
  return {
    components: model.properties
      .filter((p) => !p.primary)
      .map((p) => fieldFromProperty(p)),
  };
}

/** A default table definition derived from a schema model. */
export function tableFromModel(model: BDSchemaModel): BDAppTable {
  return {
    columns: model.properties.map((p) => columnFromProperty(p)),
    defaultSort: { column: "id", direction: "desc" },
  };
}

/** Flatten a (possibly nested) App schema into its field list. */
export function collectAppFields(
  components: BDAppComponent[] | undefined,
): BDAppField[] {
  if (!components) return [];
  const out: BDAppField[] = [];
  for (const component of components) {
    if (component.kind === "field") {
      out.push(component);
      if (component.fields) out.push(...collectAppFields(component.fields));
    } else if (component.kind === "layout") {
      out.push(...collectAppFields(component.components));
      for (const tab of component.tabs ?? []) {
        out.push(...collectAppFields(tab.components));
      }
      for (const step of component.steps ?? []) {
        out.push(...collectAppFields(step.components));
      }
    }
  }
  return out;
}

/** Flatten a (possibly nested) App schema into its entry list. */
export function collectAppEntries(
  components: BDAppComponent[] | undefined,
): BDAppEntry[] {
  if (!components) return [];
  const out: BDAppEntry[] = [];
  for (const component of components) {
    if (component.kind === "entry") {
      out.push(component);
    } else if (component.kind === "layout") {
      out.push(...collectAppEntries(component.components));
      for (const tab of component.tabs ?? []) {
        out.push(...collectAppEntries(tab.components));
      }
      for (const step of component.steps ?? []) {
        out.push(...collectAppEntries(step.components));
      }
    }
  }
  return out;
}

/**
 * Resolve the connection on `target` that points back at `ownerSlug` — used to
 * render inverse one-to-one sections. Matches `connection.inverseName` when set,
 * otherwise the first connection targeting the owner.
 */
export function findInverseConnection(
  target: BDAppResource,
  ownerSlug: string,
  connection: BDAppConnection,
): BDAppConnection | undefined {
  const candidates = (target.connections ?? []).filter(
    (c) => c.targetSlug === ownerSlug,
  );
  if (connection.inverseName) {
    const named = candidates.find((c) => c.name === connection.inverseName);
    if (named) return named;
  }
  return candidates[0];
}

export function createAppResource(name = "NewResource"): BDAppResource {
  const slug = slugify(name);
  return {
    name,
    slug,
    label: name,
    pluralLabel: `${name}s`,
    form: { components: [] },
    table: { columns: [] },
  };
}

// ── Resource connections (Filament-style relations) ────────────────────────

/** Create a connection with sensible defaults. */
export function createAppConnection(
  partial: Partial<BDAppConnection> = {},
): BDAppConnection {
  return {
    name: partial.name ?? "connection",
    type: partial.type ?? "oneToOne",
    targetSlug: partial.targetSlug ?? "",
    foreignKey: partial.foreignKey,
    titleAttribute: partial.titleAttribute ?? "name",
    label: partial.label,
    inverseName: partial.inverseName,
    pivotAttributes: partial.pivotAttributes,
    relationManager: partial.relationManager,
  };
}

/**
 * The `data` key that holds a connection's link, from the owning resource's
 * perspective. oneToOne/manyToMany store one value on the owner; oneToMany
 * stores the parent id on each child.
 */
export function connectionKey(
  connection: BDAppConnection,
  ownerSlug: string,
): string {
  if (connection.foreignKey) return connection.foreignKey;
  return connection.type === "oneToMany" ? `${ownerSlug}Id` : connection.name;
}

/** Synthetic single/multi relation fields for a resource's connections. */
export function deriveConnectionFields(resource: BDAppResource): BDAppField[] {
  const out: BDAppField[] = [];
  for (const connection of resource.connections ?? []) {
    if (connection.type !== "oneToOne" && connection.type !== "manyToMany") {
      continue;
    }
    out.push({
      kind: "field",
      type: "relationSelect",
      name: connectionKey(connection, resource.slug),
      label: connection.label ?? connection.name,
      relation: {
        name: connection.name,
        titleAttribute: connection.titleAttribute ?? "name",
        multiple: connection.type === "manyToMany",
        targetSlug: connection.targetSlug,
        searchable: connection.relationManager?.searchable,
      },
    });
  }
  return out;
}

/** Synthetic badge columns for a resource's single/multi connections. */
export function deriveConnectionColumns(resource: BDAppResource): BDAppColumn[] {
  const existing = new Set(
    (resource.table?.columns ?? []).map((column) => column.name),
  );
  const out: BDAppColumn[] = [];
  for (const connection of resource.connections ?? []) {
    if (connection.type !== "oneToOne" && connection.type !== "manyToMany") {
      continue;
    }
    const key = connectionKey(connection, resource.slug);
    if (existing.has(key)) continue;
    out.push({
      type: "badge",
      name: key,
      label: connection.label ?? connection.name,
    });
  }
  return out;
}

/** A place where a link to a deleted resource may be stored. */
export interface BDAppConnectionReference {
  resourceSlug: string;
  key: string;
  array: boolean;
}

/**
 * Every `data` location that may hold a reference to a record of
 * `deletedResourceSlug`, given the app's connection graph.
 */
export function collectConnectionReferences(
  app: BDApp,
  deletedResourceSlug: string,
): BDAppConnectionReference[] {
  const out: BDAppConnectionReference[] = [];
  for (const resource of app.resources ?? []) {
    for (const connection of resource.connections ?? []) {
      const key = connectionKey(connection, resource.slug);
      if (connection.type === "oneToOne") {
        if (connection.targetSlug === deletedResourceSlug) {
          out.push({ resourceSlug: resource.slug, key, array: false });
        }
      } else if (connection.type === "manyToMany") {
        if (connection.targetSlug === deletedResourceSlug) {
          out.push({ resourceSlug: resource.slug, key, array: true });
        }
      } else if (connection.type === "oneToMany") {
        // The owner is the parent; children hold its id in the target resource.
        if (resource.slug === deletedResourceSlug) {
          out.push({ resourceSlug: connection.targetSlug, key, array: false });
        }
      }
    }
  }
  return out;
}

export function createApp(projectId: string, form: BDAppForm): Omit<BDApp, "id"> {
  return {
    projectId,
    name: form.name,
    slug: form.slug || slugify(form.name),
    path: form.path || "/",
    description: form.description || undefined,
    brand:
      form.brandName || form.logoUrl
        ? {
            name: form.brandName || form.name,
            logo: form.logoUrl || undefined,
          }
        : undefined,
    theme:
      form.themeMode !== "system" || form.primaryColor
        ? {
            mode: form.themeMode,
            primary: form.primaryColor || undefined,
          }
        : undefined,
    resources: [],
  };
}

export function toAppForm(app: BDApp): BDAppForm {
  return {
    name: app.name,
    slug: app.slug,
    path: app.path,
    description: app.description ?? "",
    brandName: app.brand?.name ?? "",
    logoUrl: app.brand?.logo ?? "",
    themeMode: app.theme?.mode ?? "system",
    primaryColor:
      typeof app.theme?.primary === "string" ? app.theme.primary : "",
  };
}

// ── AI artifact drafts ─────────────────────────────────────────────────────

export interface BDAppFieldDraft {
  name: string;
  label?: string;
  type: string;
  required?: boolean;
  options?: { value: string; label: string }[];
}

export interface BDAppColumnDraft {
  name: string;
  label?: string;
  type: string;
}

export interface BDAppConnectionDraft {
  name: string;
  type: BDAppConnectionType;
  /** Target resource slug or name. */
  target: string;
  titleAttribute?: string;
  foreignKey?: string;
  label?: string;
}

export interface BDAppResourceDraft {
  name: string;
  slug?: string;
  label?: string;
  model?: string;
  fields?: BDAppFieldDraft[];
  columns?: BDAppColumnDraft[];
  connections?: BDAppConnectionDraft[];
}

export interface BDAppDraft {
  name: string;
  slug?: string;
  path?: string;
  resources: BDAppResourceDraft[];
}

export interface BDAppArtifact {
  apps: BDAppDraft[];
}
