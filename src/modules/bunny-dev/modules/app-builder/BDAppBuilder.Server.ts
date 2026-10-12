"use server";

// BDAppBuilder.Server — one-shot AI app config generation via Helix.

import type { BDGenerationMode } from "../../BDDomain.Types";
import type { BDAppConnectionType } from "../../BDDomain.Types";
import type { HelixAISchemaOptions, HelixStrictPropertyDefinition } from "@/src/modules/helix/src/HelixAISchemaTypes";
import {
  bdGenerateStructured,
  type BDAIConfigOverride,
} from "../agent-manager/BDGeneration.Server";
import { bdBuildModeUser } from "../agent-manager/BDGeneration.Mode";
import type {
  BDAppArtifact,
  BDAppConnectionDraft,
  BDAppDesignAISections,
  BDAppDesignDraft,
  BDAppDraft,
  BDAppFieldDraft,
  BDAppColumnDraft,
  BDAppMetaDraft,
  BDAppRecordAIField,
  BDAppRecordAIFieldOption,
  BDAppResourceAISections,
  BDAppResourceDraft,
} from "./BDApp.Types";

export interface BDAppGenerateParams {
  instruction: string;
  mode: BDGenerationMode;
  /** Names of schema models available for resources. */
  models?: string[];
  targetContext?: string;
  aiConfig?: BDAIConfigOverride;
}

const FIELD_ITEM: HelixStrictPropertyDefinition = {
  type: "object",
  description: "A form field.",
  properties: {
    name: { type: "string", description: "Field name." },
    label: { type: "string", description: "Field label." },
    type: {
      type: "string",
      description:
        "One of: text, textarea, richEditor, markdown, code, slug, select, multiSelect, radio, checkbox, checkboxList, toggle, toggleButtons, date, time, dateTime, color, tags, keyValue, fileUpload, image, repeater, builder, relationSelect. Types select, multiSelect, radio, checkboxList and toggleButtons must supply options.",
    },
    required: {
      type: "boolean",
      description: "Whether the field is required.",
    },
    options: {
      type: "array",
      description:
        "Allowed options; required when type is select, multiSelect, radio, checkboxList or toggleButtons.",
      items: {
        type: "object",
        description: "One allowed option.",
        properties: {
          value: { type: "string", description: "Stored option value." },
          label: { type: "string", description: "Displayed option label." },
        },
      },
    },
  },
};

const COLUMN_ITEM: HelixStrictPropertyDefinition = {
  type: "object",
  description: "A table column.",
  properties: {
    name: { type: "string", description: "Column name." },
    label: { type: "string", description: "Column label." },
    type: {
      type: "string",
      description:
        "One of: text, badge, boolean, date, dateTime, since, money, numeric, tags, toggle.",
    },
  },
};

const CONNECTION_ITEM: HelixStrictPropertyDefinition = {
  type: "object",
  description: "A connection to another resource.",
  properties: {
    name: {
      type: "string",
      description: "Relation name; also the default data key.",
    },
    type: {
      type: "string",
      description: "One of: oneToOne, oneToMany, manyToMany.",
    },
    target: {
      type: "string",
      description: "Target resource slug or name.",
    },
    titleAttribute: {
      type: "string",
      description: "Attribute on the target used as its label.",
    },
    foreignKey: {
      type: "string",
      description: "Child foreign-key data key (oneToMany only).",
    },
  },
};

const RESOURCE_ITEM: HelixStrictPropertyDefinition = {
  type: "object",
  description: "A resource.",
  properties: {
    name: { type: "string", description: "PascalCase name." },
    slug: { type: "string", description: "kebab-case slug." },
    label: { type: "string", description: "Singular label." },
    pluralLabel: { type: "string", description: "Plural label." },
    model: {
      type: "string",
      description: "Schema model name this resource maps to.",
    },
    fields: {
      type: "array",
      description: "Form fields.",
      items: FIELD_ITEM,
    },
    columns: {
      type: "array",
      description: "Table columns.",
      items: COLUMN_ITEM,
    },
    connections: {
      type: "array",
      description: "Relations to other resources in this app (Filament-style).",
      items: CONNECTION_ITEM,
    },
  },
};

const META_ITEM: HelixStrictPropertyDefinition = {
  type: "object",
  description: "App-level metadata.",
  properties: {
    name: { type: "string", description: "App name." },
    slug: { type: "string", description: "kebab-case slug." },
    path: { type: "string", description: "Base path, e.g. /admin." },
    description: { type: "string", description: "Short app description." },
    brandName: {
      type: "string",
      description: "Brand / title shown in the app header.",
    },
    logoUrl: { type: "string", description: "Optional logo URL." },
    themeMode: {
      type: "string",
      description: "One of: light, dark, system.",
    },
    primaryColor: {
      type: "string",
      description: "Optional hex primary color, e.g. #1976d2.",
    },
  },
};

const APP_DSL: HelixAISchemaOptions = {
  name: "app_builder_artifact",
  description: "One or more Filament-style apps with resources.",
  properties: {
    apps: {
      type: "array",
      description: "Generated apps.",
      items: {
        type: "object",
        description: "An app.",
        properties: {
          name: { type: "string", description: "App name." },
          slug: { type: "string", description: "kebab-case slug." },
          path: { type: "string", description: "Base path." },
          resources: {
            type: "array",
            description: "Resources (CRUD entities).",
            items: RESOURCE_ITEM,
          },
        },
      },
    },
  },
};

const RESOURCE_DSL: HelixAISchemaOptions = {
  name: "app_builder_resource",
  description: "A single Filament-style resource.",
  properties: RESOURCE_ITEM.properties ?? {},
};

const DESIGN_DSL: HelixAISchemaOptions = {
  name: "app_builder_design",
  description: "App metadata and/or resources for an existing app.",
  properties: {
    meta: META_ITEM,
    resources: {
      type: "array",
      description: "Resources to append to the app.",
      items: RESOURCE_ITEM,
    },
  },
};

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizeField(raw: unknown): BDAppFieldDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const f = raw as Record<string, unknown>;
  const name = asString(f.name);
  if (!name) return null;
  const options = Array.isArray(f.options)
    ? f.options
        .map((opt) => {
          if (!opt || typeof opt !== "object") return null;
          const o = opt as Record<string, unknown>;
          const value = asString(o.value);
          if (!value) return null;
          return { value, label: asString(o.label) || value };
        })
        .filter((o): o is { value: string; label: string } => o !== null)
    : [];
  return {
    name,
    label: asString(f.label) || undefined,
    type: asString(f.type) || "text",
    required: f.required === true,
    options: options.length > 0 ? options : undefined,
  };
}

function normalizeColumn(raw: unknown): BDAppColumnDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Record<string, unknown>;
  const name = asString(c.name);
  if (!name) return null;
  return {
    name,
    label: asString(c.label) || undefined,
    type: asString(c.type) || "text",
  };
}

const CONNECTION_TYPES: BDAppConnectionType[] = [
  "oneToOne",
  "oneToMany",
  "manyToMany",
];

function normalizeConnection(raw: unknown): BDAppConnectionDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Record<string, unknown>;
  const name = asString(c.name);
  const target = asString(c.target);
  if (!name || !target) return null;
  const typeRaw = asString(c.type);
  const type = (CONNECTION_TYPES as string[]).includes(typeRaw)
    ? (typeRaw as BDAppConnectionType)
    : "oneToOne";
  return {
    name,
    type,
    target,
    titleAttribute: asString(c.titleAttribute) || undefined,
    foreignKey: asString(c.foreignKey) || undefined,
    label: asString(c.label) || undefined,
  };
}

function normalizeResource(raw: unknown): BDAppResourceDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const name = asString(r.name);
  if (!name) return null;
  return {
    name,
    slug: asString(r.slug) || undefined,
    label: asString(r.label) || undefined,
    pluralLabel: asString(r.pluralLabel) || undefined,
    model: asString(r.model) || undefined,
    fields: Array.isArray(r.fields)
      ? r.fields
          .map(normalizeField)
          .filter((f): f is BDAppFieldDraft => f !== null)
      : [],
    columns: Array.isArray(r.columns)
      ? r.columns
          .map(normalizeColumn)
          .filter((c): c is BDAppColumnDraft => c !== null)
      : [],
    connections: Array.isArray(r.connections)
      ? r.connections
          .map(normalizeConnection)
          .filter((c): c is BDAppConnectionDraft => c !== null)
      : [],
  };
}

function normalizeMeta(raw: unknown): BDAppMetaDraft | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const m = raw as Record<string, unknown>;
  const themeRaw = asString(m.themeMode);
  const out: BDAppMetaDraft = {
    name: asString(m.name) || undefined,
    slug: asString(m.slug) || undefined,
    path: asString(m.path) || undefined,
    description: asString(m.description) || undefined,
    brandName: asString(m.brandName) || undefined,
    logoUrl: asString(m.logoUrl) || undefined,
    themeMode:
      themeRaw === "light" || themeRaw === "dark" || themeRaw === "system"
        ? themeRaw
        : undefined,
    primaryColor: asString(m.primaryColor) || undefined,
  };
  const hasAny = Object.values(out).some((value) => value !== undefined);
  return hasAny ? out : undefined;
}

function normalizeApp(raw: unknown): BDAppDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const a = raw as Record<string, unknown>;
  const name = asString(a.name);
  if (!name) return null;
  return {
    name,
    slug: asString(a.slug) || undefined,
    path: asString(a.path) || undefined,
    resources: Array.isArray(a.resources)
      ? a.resources
          .map(normalizeResource)
          .filter((r): r is BDAppResourceDraft => r !== null)
      : [],
  };
}

export async function bdGenerateApp(
  params: BDAppGenerateParams,
): Promise<BDAppArtifact> {
  const system =
    "You are a product engineer designing an admin panel (Filament-style). " +
    "Define resources with forms and tables. For select, multiSelect, radio, " +
    "checkboxList and toggleButtons fields you must supply a populated options " +
    "array of { value, label } pairs. Return only the structured JSON " +
    "requested.";

  const context =
    params.models && params.models.length > 0
      ? `Available schema models: ${params.models.join(", ")}.`
      : undefined;

  const user = bdBuildModeUser({
    mode: params.mode,
    instruction: params.instruction,
    targetContext: params.targetContext,
    context,
  });

  const raw = await bdGenerateStructured({
    system,
    user,
    schema: APP_DSL,
    aiConfig: params.aiConfig,
    temperature: 0.3,
  });

  const appsRaw = Array.isArray(raw.apps) ? raw.apps : [];
  const apps = appsRaw
    .map(normalizeApp)
    .filter((a): a is BDAppDraft => a !== null);

  return { apps };
}

// ── Per-resource and design-view generation ────────────────────────────────

export interface BDAppResourceGenerateParams {
  instruction: string;
  sections: BDAppResourceAISections;
  /** Names of schema models available for form/table derivation. */
  models?: string[];
  /** Sibling resources available as connection targets. */
  existingResources?: { slug: string; label: string }[];
  aiConfig?: BDAIConfigOverride;
}

function describeResourceRefs(
  resources: { slug: string; label: string }[],
): string {
  return resources.map((r) => `${r.label} (${r.slug})`).join(", ");
}

export async function bdGenerateAppResource(
  params: BDAppResourceGenerateParams,
): Promise<BDAppResourceDraft> {
  const requested: string[] = [];
  if (params.sections.meta) {
    requested.push("meta (name, slug, label, pluralLabel, model)");
  }
  if (params.sections.form) requested.push("form fields");
  if (params.sections.table) requested.push("table columns");
  if (params.sections.connections) {
    requested.push("connections to other resources");
  }
  if (requested.length === 0) {
    throw new Error("Select at least one section to generate.");
  }

  const contextLines = [
    `Fill ONLY: ${requested.join(", ")}.`,
    params.models && params.models.length > 0
      ? `Available schema models: ${params.models.join(", ")}.`
      : undefined,
    params.sections.connections &&
    params.existingResources &&
    params.existingResources.length > 0
      ? `Existing resources (connections may only target these or itself): ${describeResourceRefs(
          params.existingResources,
        )}.`
      : undefined,
    "Leave every unrequested section empty.",
  ].filter((line): line is string => !!line);

  const system =
    "You are a product engineer designing one Filament-style resource for an " +
    "admin panel. For select, multiSelect, radio, checkboxList and " +
    "toggleButtons fields you must supply a populated options array of " +
    "{ value, label } pairs. Return only the structured JSON requested.";

  const user = bdBuildModeUser({
    mode: "create",
    instruction: params.instruction,
    context: contextLines.join(" "),
  });

  const raw = await bdGenerateStructured({
    system,
    user,
    schema: RESOURCE_DSL,
    aiConfig: params.aiConfig,
    temperature: 0.3,
  });

  const resource = normalizeResource(raw);
  if (!resource) {
    throw new Error("AI returned no resource. Please retry.");
  }
  return resource;
}

export interface BDAppDesignGenerateParams {
  instruction: string;
  sections: BDAppDesignAISections;
  /** Optional bounds on how many resources to generate. */
  minResources?: number;
  maxResources?: number;
  models?: string[];
  existingResources?: { slug: string; label: string }[];
  currentMeta?: { name?: string; slug?: string; path?: string };
  aiConfig?: BDAIConfigOverride;
}

export async function bdGenerateAppDesign(
  params: BDAppDesignGenerateParams,
): Promise<BDAppDesignDraft> {
  const requested: string[] = [];
  if (params.sections.meta) requested.push("app metadata");
  if (params.sections.resources) {
    requested.push("resources (each with fields, columns and connections)");
  }
  if (requested.length === 0) {
    throw new Error("Select at least one section to generate.");
  }

  const contextLines = [
    `Fill ONLY: ${requested.join(", ")}.`,
    params.currentMeta?.name
      ? `Current app: ${params.currentMeta.name}${
          params.currentMeta.path ? ` at ${params.currentMeta.path}` : ""
        }.`
      : undefined,
    params.models && params.models.length > 0
      ? `Available schema models: ${params.models.join(", ")}.`
      : undefined,
    params.sections.resources &&
    params.existingResources &&
    params.existingResources.length > 0
      ? `Existing resources (new resource connections may target these): ${describeResourceRefs(
          params.existingResources,
        )}.`
      : undefined,
    params.sections.resources
      ? "New resources may also connect to each other by slug or name."
      : undefined,
    params.sections.resources && params.minResources
      ? `Generate at least ${params.minResources} resource${
          params.minResources === 1 ? "" : "s"
        }.`
      : undefined,
    params.sections.resources && params.maxResources
      ? `Generate at most ${params.maxResources} resource${
          params.maxResources === 1 ? "" : "s"
        }.`
      : undefined,
    "Leave every unrequested section empty.",
  ].filter((line): line is string => !!line);

  const system =
    "You are a product engineer designing a Filament-style admin panel. For " +
    "select, multiSelect, radio, checkboxList and toggleButtons fields you " +
    "must supply a populated options array of { value, label } pairs. Return " +
    "only the structured JSON requested.";

  const user = bdBuildModeUser({
    mode: "create",
    instruction: params.instruction,
    context: contextLines.join(" "),
  });

  const raw = await bdGenerateStructured({
    system,
    user,
    schema: DESIGN_DSL,
    aiConfig: params.aiConfig,
    temperature: 0.3,
  });

  const meta = params.sections.meta ? normalizeMeta(raw.meta) : undefined;
  const resources =
    params.sections.resources && Array.isArray(raw.resources)
      ? raw.resources
          .map(normalizeResource)
          .filter((r): r is BDAppResourceDraft => r !== null)
      : [];

  if (!meta && resources.length === 0) {
    throw new Error("AI returned no content. Please retry.");
  }
  return { meta, resources };
}

// ── Record generation (rendered app "Create with AI") ──────────────────────

export interface BDAppRecordGenerateParams {
  instruction: string;
  /** Label of the resource the record belongs to (prompt context). */
  resourceLabel?: string;
  /** Generate a single record (default) or a batch of records. */
  mode?: "single" | "batch";
  /** Batch only: optional lower/upper bounds on how many records to make. */
  minRecords?: number;
  maxRecords?: number;
  /** Field descriptors for the target resource. */
  fields: BDAppRecordAIField[];
  /** Current form values, sent as context (may be empty). */
  current?: Record<string, unknown>;
  aiConfig?: BDAIConfigOverride;
}

/** Maximum relation candidates included per field in the prompt. */
const RECORD_AI_MAX_CANDIDATES = 25;

const RECORD_AI_MULTI_TYPES = new Set([
  "multiSelect",
  "checkboxList",
  "tags",
]);

function describeFieldOptions(options: BDAppRecordAIFieldOption[]): string {
  return options.map((o) => `${o.value} — ${o.label}`).join("; ");
}

function describeRecordFields(fields: BDAppRecordAIField[]): string {
  return fields
    .map((field) => {
      const required = field.required ? " (required)" : "";
      if (field.relation) {
        const candidates = field.relation.candidates;
        const shown = candidates.slice(0, RECORD_AI_MAX_CANDIDATES);
        const more =
          candidates.length > shown.length
            ? ` …(${candidates.length - shown.length} more not shown)`
            : "";
        const list = shown.length > 0 ? describeFieldOptions(shown) : "";
        const kind = field.relation.multiple ? "one or more ids" : "one id";
        return `- ${field.label} [${field.name}]: relationSelect${required}. Choose ${kind} from: ${
          list || "(no candidates available — leave unset)"
        }${more}`;
      }
      if (field.options && field.options.length > 0) {
        return `- ${field.label} [${field.name}]: ${field.type}${required}. Allowed: ${describeFieldOptions(
          field.options,
        )}`;
      }
      return `- ${field.label} [${field.name}]: ${field.type}${required}.`;
    })
    .join("\n");
}

function fieldToSchemaProperty(
  field: BDAppRecordAIField,
): HelixStrictPropertyDefinition {
  if (field.relation) {
    const candidates = field.relation.candidates.slice(
      0,
      RECORD_AI_MAX_CANDIDATES,
    );
    const allowed = describeFieldOptions(candidates);
    const description = allowed
      ? `Relation. Choose ${
          field.relation.multiple ? "one or more ids" : "one id"
        } from: ${allowed}.`
      : "Relation. No candidates are available; leave this field unset.";
    return field.relation.multiple
      ? {
          type: "array",
          description,
          items: { type: "string", description: "Target record id." },
        }
      : { type: "string", description };
  }

  if (field.options && field.options.length > 0) {
    const description = `One of: ${describeFieldOptions(field.options)}.`;
    return RECORD_AI_MULTI_TYPES.has(field.type)
      ? {
          type: "array",
          description,
          items: { type: "string", description: "An allowed value." },
        }
      : { type: "string", description };
  }

  switch (field.type) {
    case "toggle":
    case "checkbox":
      return { type: "boolean", description: "Boolean flag." };
    case "date":
      return { type: "string", description: "Date, formatted YYYY-MM-DD." };
    case "time":
      return { type: "string", description: "Time, formatted HH:MM." };
    case "dateTime":
      return { type: "string", description: "ISO-8601 date-time string." };
    case "keyValue":
      return { type: "object", description: "Arbitrary key/value object.", properties: {} };
    case "repeater":
    case "builder":
      return {
        type: "array",
        description: "Repeatable list of objects.",
        items: { type: "object", description: "One item.", properties: {} },
      };
    case "tags":
      return {
        type: "array",
        description: "List of tag strings.",
        items: { type: "string", description: "A tag." },
      };
    default:
      return { type: "string", description: "Text value." };
  }
}

function buildRecordSchema(
  fields: BDAppRecordAIField[],
  batch: boolean,
): HelixAISchemaOptions {
  const fieldProperties: Record<string, HelixStrictPropertyDefinition> = {};
  for (const field of fields) {
    fieldProperties[field.name] = fieldToSchemaProperty(field);
  }
  if (!batch) {
    return {
      name: "app_builder_record",
      description: "A single record's field values.",
      properties: fieldProperties,
    };
  }
  return {
    name: "app_builder_records",
    description: "A batch of generated records.",
    properties: {
      records: {
        type: "array",
        description: "Generated records.",
        items: {
          type: "object",
          description: "One record.",
          properties: fieldProperties,
        },
      },
    },
  };
}

/** Prompt line describing the requested batch size bounds. */
function describeBatchCount(min?: number, max?: number): string {
  if (min !== undefined && max !== undefined) {
    return `Generate between ${min} and ${max} records.`;
  }
  if (min !== undefined) return `Generate at least ${min} records.`;
  if (max !== undefined) return `Generate at most ${max} records.`;
  return "Generate a reasonable number of varied records (about 5 to 10).";
}

function matchRecordOption(
  candidate: unknown,
  options: BDAppRecordAIFieldOption[],
): string | undefined {
  const text =
    typeof candidate === "string" ? candidate : String(candidate ?? "");
  const byValue = options.find((o) => o.value === text);
  if (byValue) return byValue.value;
  const lower = text.trim().toLowerCase();
  const byLabel = options.find((o) => o.label.trim().toLowerCase() === lower);
  return byLabel?.value;
}

function resolveRelationValue(
  value: unknown,
  relation: { multiple: boolean; candidates: BDAppRecordAIFieldOption[] },
): unknown {
  if (relation.multiple) {
    const list = Array.isArray(value) ? value : [value];
    const ids: string[] = [];
    for (const entry of list) {
      const id = matchRecordOption(entry, relation.candidates);
      if (id && !ids.includes(id)) ids.push(id);
    }
    return ids.length > 0 ? ids : undefined;
  }
  return matchRecordOption(value, relation.candidates);
}

function resolveOptionValue(
  value: unknown,
  options: BDAppRecordAIFieldOption[],
  type: string,
): unknown {
  if (RECORD_AI_MULTI_TYPES.has(type)) {
    const list = Array.isArray(value) ? value : [value];
    const values: string[] = [];
    for (const entry of list) {
      const resolved = matchRecordOption(entry, options);
      if (resolved && !values.includes(resolved)) values.push(resolved);
    }
    return values.length > 0 ? values : undefined;
  }
  return matchRecordOption(value, options);
}

function toRecordTags(value: unknown): string[] | undefined {
  const list = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  const tags = list
    .map((entry) => String(entry ?? "").trim())
    .filter((entry) => entry.length > 0);
  return tags.length > 0 ? tags : undefined;
}

/** Coerce AI output against field/relation/option constraints; drop misses. */
function normalizeRecordValues(
  raw: Record<string, unknown>,
  fields: BDAppRecordAIField[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of fields) {
    if (!(field.name in raw)) continue;
    const value = raw[field.name];
    if (value === undefined || value === null) continue;

    if (field.relation) {
      const resolved = resolveRelationValue(value, field.relation);
      if (resolved !== undefined) out[field.name] = resolved;
      continue;
    }

    if (field.options && field.options.length > 0) {
      const resolved = resolveOptionValue(value, field.options, field.type);
      if (resolved !== undefined) out[field.name] = resolved;
      continue;
    }

    switch (field.type) {
      case "toggle":
      case "checkbox":
        out[field.name] = Boolean(value);
        break;
      case "tags": {
        const tags = toRecordTags(value);
        if (tags) out[field.name] = tags;
        break;
      }
      case "keyValue":
        if (value && typeof value === "object" && !Array.isArray(value)) {
          out[field.name] = value;
        }
        break;
      case "repeater":
      case "builder":
        if (Array.isArray(value)) out[field.name] = value;
        break;
      default:
        out[field.name] = typeof value === "string" ? value : String(value);
    }
  }
  return out;
}

export async function bdGenerateAppRecord(
  params: BDAppRecordGenerateParams,
): Promise<Record<string, unknown>[]> {
  const batch = params.mode === "batch";
  if (!params.instruction.trim()) {
    throw new Error("Describe the record first.");
  }
  if (params.fields.length === 0) {
    throw new Error("This resource has no generatable fields.");
  }
  if (batch) {
    if (params.minRecords !== undefined && params.minRecords < 1) {
      throw new Error("Minimum records must be at least 1.");
    }
    if (params.maxRecords !== undefined && params.maxRecords < 1) {
      throw new Error("Maximum records must be at least 1.");
    }
    if (
      params.minRecords !== undefined &&
      params.maxRecords !== undefined &&
      params.minRecords > params.maxRecords
    ) {
      throw new Error("Minimum records cannot exceed the maximum.");
    }
  }

  const contextLines = [
    params.resourceLabel ? `Resource: ${params.resourceLabel}.` : undefined,
    batch
      ? "Generate a batch of records. Field definitions:"
      : "Generate ONE record. Field definitions:",
    describeRecordFields(params.fields),
    params.current && Object.keys(params.current).length > 0
      ? `Current form values (context, may be empty): ${JSON.stringify(
          params.current,
        )}`
      : undefined,
    batch
      ? describeBatchCount(params.minRecords, params.maxRecords)
      : undefined,
    batch ? "Make the records varied and distinct from one another." : undefined,
    "Use relation and select values only from the allowed lists above; omit a field when no valid value applies.",
  ].filter((line): line is string => !!line);

  const system = batch
    ? "You generate a batch of valid, varied records for a Filament-style " +
      "admin resource. Choose relation and select values only from the " +
      "allowed lists provided. Return only the structured JSON requested."
    : "You generate a single valid record for a Filament-style admin " +
      "resource. Choose relation and select values only from the allowed " +
      "lists provided. Return only the structured JSON requested.";

  const user = bdBuildModeUser({
    mode: "create",
    instruction: params.instruction,
    context: contextLines.join("\n"),
  });

  const raw = await bdGenerateStructured({
    system,
    user,
    schema: buildRecordSchema(params.fields, batch),
    aiConfig: params.aiConfig,
    temperature: 0.2,
  });

  if (!batch) {
    const record = normalizeRecordValues(raw, params.fields);
    return Object.keys(record).length > 0 ? [record] : [];
  }

  const list = Array.isArray(raw.records) ? raw.records : [];
  return list
    .map((entry) =>
      entry && typeof entry === "object"
        ? normalizeRecordValues(entry as Record<string, unknown>, params.fields)
        : {},
    )
    .filter((record) => Object.keys(record).length > 0);
}
