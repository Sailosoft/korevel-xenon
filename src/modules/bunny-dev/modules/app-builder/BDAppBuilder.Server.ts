"use server";

// BDAppBuilder.Server — one-shot AI app config generation via Helix.

import type { BDGenerationMode } from "../../BDDomain.Types";
import type { BDAppConnectionType } from "../../BDDomain.Types";
import type { HelixAISchemaOptions } from "@/src/modules/helix/src/HelixAISchemaTypes";
import {
  bdGenerateStructured,
  type BDAIConfigOverride,
} from "../agent-manager/BDGeneration.Server";
import type {
  BDAppArtifact,
  BDAppConnectionDraft,
  BDAppDraft,
  BDAppFieldDraft,
  BDAppColumnDraft,
  BDAppResourceDraft,
} from "./BDApp.Types";

export interface BDAppGenerateParams {
  instruction: string;
  mode: BDGenerationMode;
  /** Names of schema models available for resources. */
  models?: string[];
  aiConfig?: BDAIConfigOverride;
}

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
            items: {
              type: "object",
              description: "A resource.",
              properties: {
                name: { type: "string", description: "PascalCase name." },
                slug: { type: "string", description: "kebab-case slug." },
                label: { type: "string", description: "Singular label." },
                model: {
                  type: "string",
                  description: "Schema model name this resource maps to.",
                },
                fields: {
                  type: "array",
                  description: "Form fields.",
                  items: {
                    type: "object",
                    description: "A form field.",
                    properties: {
                      name: { type: "string", description: "Field name." },
                      label: { type: "string", description: "Field label." },
                      type: {
                        type: "string",
                        description:
                          "One of: text, textarea, richEditor, markdown, code, slug, select, multiSelect, radio, checkbox, toggle, date, time, dateTime, color, tags, keyValue, fileUpload, image, repeater, relationSelect.",
                      },
                      required: {
                        type: "boolean",
                        description: "Whether the field is required.",
                      },
                    },
                  },
                },
                columns: {
                  type: "array",
                  description: "Table columns.",
                  items: {
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
                  },
                },
                connections: {
                  type: "array",
                  description:
                    "Relations to other resources in this app (Filament-style).",
                  items: {
                    type: "object",
                    description: "A connection to another resource.",
                    properties: {
                      name: {
                        type: "string",
                        description: "Relation name; also the default data key.",
                      },
                      type: {
                        type: "string",
                        description:
                          "One of: oneToOne, oneToMany, manyToMany.",
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
                        description:
                          "Child foreign-key data key (oneToMany only).",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
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
  return {
    name,
    label: asString(f.label) || undefined,
    type: asString(f.type) || "text",
    required: f.required === true,
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
    "Define resources with forms and tables. Return only the structured JSON " +
    "requested.";

  const context =
    params.models && params.models.length > 0
      ? `\nAvailable schema models: ${params.models.join(", ")}.`
      : "";

  const user = `Mode: ${params.mode}.${context}\n\nInstruction: ${params.instruction}`;

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
