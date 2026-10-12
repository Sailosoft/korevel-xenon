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
