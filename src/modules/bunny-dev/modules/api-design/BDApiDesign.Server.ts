"use server";

// BDApiDesign.Server — one-shot AI API documentation/mock generation.

import type { BDGenerationMode } from "../../BDDomain.Types";
import type { HelixAISchemaOptions } from "@/src/modules/helix/src/HelixAISchemaTypes";
import {
  bdGenerateStructured,
  type BDAIConfigOverride,
} from "../agent-manager/BDGeneration.Server";
import { isValidFakeType } from "./BDApi.Types";
import type {
  BDApiArtifact,
  BDApiDraft,
  BDApiErrorDraft,
  BDApiPropertyDraft,
  BDApiReturnItemDraft,
} from "./BDApi.Types";

const FAKE_TYPE_DSL_DESCRIPTION =
  "Optional mock generator used by the mock view when the type is a " +
  "string, number, boolean or date. One of: name, firstName, email, uuid, " +
  "url, phone, company, date, number, boolean.";

export interface BDApiSchemaColumn {
  name: string;
  type: string;
  primary?: boolean;
}

export interface BDApiSchemaModelContext {
  name: string;
  table?: string;
  columns: BDApiSchemaColumn[];
  relations?: string[];
}

export interface BDApiGenerateParams {
  instruction: string;
  mode: BDGenerationMode;
  schemaGroupName?: string;
  schemaModels?: BDApiSchemaModelContext[];
  aiConfig?: BDAIConfigOverride;
}

const API_DSL: HelixAISchemaOptions = {
  name: "api_design_artifact",
  description: "A set of documented API operations.",
  properties: {
    apis: {
      type: "array",
      description: "API operations.",
      items: {
        type: "object",
        description: "An API operation.",
        properties: {
          name: { type: "string", description: "Operation name." },
          group: { type: "string", description: "Group/resource." },
          protocol: {
            type: "string",
            description: "rest, graphql, grpc, websocket, rpc, soap or webhook.",
          },
          method: {
            type: "string",
            description:
              "HTTP method or GraphQL operation: get, post, put, patch, delete, query, mutation, subscription, event.",
          },
          path: { type: "string", description: "Path or operation." },
          summary: { type: "string", description: "Short summary." },
          description: { type: "string", description: "Full description." },
          auth: {
            type: "string",
            description: "none, apiKey, bearer, basic, oauth2 or session.",
          },
          properties: {
            type: "array",
            description: "Input parameters.",
            items: {
              type: "object",
              description: "A parameter.",
              properties: {
                name: { type: "string", description: "Parameter name." },
                type: { type: "string", description: "Data type." },
                location: {
                  type: "string",
                  description:
                    "path, query, header, cookie, body, formData or field.",
                },
                required: {
                  type: "boolean",
                  description: "Whether required.",
                },
                description: {
                  type: "string",
                  description: "Parameter description.",
                },
                fakeType: {
                  type: "string",
                  description: FAKE_TYPE_DSL_DESCRIPTION,
                },
              },
            },
          },
          returnType: {
            type: "string",
            description: "Return type name.",
          },
          returnKind: {
            type: "string",
            description:
              "object, array, any, scalar, enum, union, void, stream, file or reference.",
          },
          returnProperties: {
            type: "array",
            description:
              "Response fields when returnKind is object. Each field's own type may be 'object' or 'any'.",
            items: {
              type: "object",
              description: "A response field.",
              properties: {
                name: { type: "string", description: "Field name." },
                type: { type: "string", description: "Data type." },
                required: {
                  type: "boolean",
                  description: "Whether the field is always present.",
                },
                description: {
                  type: "string",
                  description: "Field description.",
                },
                fakeType: {
                  type: "string",
                  description: FAKE_TYPE_DSL_DESCRIPTION,
                },
              },
            },
          },
          returnItem: {
            type: "object",
            description:
              "Item shape when returnKind is array. Set kind to object, scalar or any; for object include its fields in properties.",
            properties: {
              kind: { type: "string", description: "object, scalar or any." },
              type: { type: "string", description: "Item type name." },
              fakeType: {
                type: "string",
                description: FAKE_TYPE_DSL_DESCRIPTION,
              },
              properties: {
                type: "array",
                description: "Item fields when kind is object.",
                items: {
                  type: "object",
                  description: "An item field.",
                  properties: {
                    name: { type: "string", description: "Field name." },
                    type: { type: "string", description: "Data type." },
                    required: {
                      type: "boolean",
                      description: "Whether the field is always present.",
                    },
                    description: {
                      type: "string",
                      description: "Field description.",
                    },
                    fakeType: {
                      type: "string",
                      description: FAKE_TYPE_DSL_DESCRIPTION,
                    },
                  },
                },
              },
            },
          },
          errors: {
            type: "array",
            description: "Error responses.",
            items: {
              type: "object",
              description: "An error.",
              properties: {
                status: { type: "number", description: "HTTP status." },
                message: { type: "string", description: "Error message." },
                description: {
                  type: "string",
                  description: "When this happens.",
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

/** Keep only known faker generators so the DSL cannot inject arbitrary values. */
function normalizeFakeType(value: unknown): string | undefined {
  const v = asString(value);
  return v && isValidFakeType(v) ? v : undefined;
}

function normalizeProperty(raw: unknown): BDApiPropertyDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  const name = asString(p.name);
  if (!name) return null;
  return {
    name,
    type: asString(p.type) || "string",
    location: asString(p.location) || "query",
    required: p.required === true,
    description: asString(p.description) || undefined,
    fakeType: normalizeFakeType(p.fakeType),
  };
}

function normalizeError(raw: unknown): BDApiErrorDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as Record<string, unknown>;
  const status = typeof e.status === "number" ? e.status : Number(e.status) || 400;
  return {
    status,
    message: asString(e.message) || "Error",
    description: asString(e.description) || undefined,
  };
}

function normalizePropertyList(raw: unknown): BDApiPropertyDraft[] {
  return Array.isArray(raw)
    ? raw
        .map(normalizeProperty)
        .filter((p): p is BDApiPropertyDraft => p !== null)
    : [];
}

function normalizeReturnItem(raw: unknown): BDApiReturnItemDraft | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const item = raw as Record<string, unknown>;
  return {
    kind: asString(item.kind) || undefined,
    type: asString(item.type) || undefined,
    fakeType: normalizeFakeType(item.fakeType),
    properties: normalizePropertyList(item.properties),
  };
}

function normalizeApi(raw: unknown): BDApiDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const a = raw as Record<string, unknown>;
  const name = asString(a.name);
  const path = asString(a.path);
  if (!name || !path) return null;
  return {
    name,
    group: asString(a.group) || undefined,
    protocol: asString(a.protocol) || "rest",
    method: asString(a.method) || "get",
    path,
    summary: asString(a.summary) || undefined,
    description: asString(a.description),
    auth: asString(a.auth) || "none",
    properties: normalizePropertyList(a.properties),
    returnType: asString(a.returnType) || undefined,
    returnKind: asString(a.returnKind) || "object",
    returnProperties: normalizePropertyList(a.returnProperties),
    returnItem: normalizeReturnItem(a.returnItem),
    errors: Array.isArray(a.errors)
      ? a.errors
          .map(normalizeError)
          .filter((e): e is BDApiErrorDraft => e !== null)
      : [],
  };
}

function buildSchemaBasis(params: BDApiGenerateParams): string {
  const models = params.schemaModels ?? [];
  if (models.length === 0) return "";

  const lines = models.map((m) => {
    const columns = m.columns
      .map((c) => `${c.name}: ${c.type}${c.primary ? " (primary)" : ""}`)
      .join(", ");
    const relations =
      m.relations && m.relations.length > 0
        ? `; relations: ${m.relations.join(", ")}`
        : "";
    const table = m.table ? ` (table ${m.table})` : "";
    return `- Model ${m.name}${table}: ${columns || "no columns"}${relations}`;
  });

  const groupLabel = params.schemaGroupName
    ? ` (group "${params.schemaGroupName}")`
    : "";
  return (
    `\n\nSchema basis${groupLabel}: generate CRUD-style endpoints for these ` +
    `models. Set each operation's group to the resource/model name.\n` +
    lines.join("\n")
  );
}

export async function bdGenerateApi(
  params: BDApiGenerateParams,
): Promise<BDApiArtifact> {
  const system =
    "You are an API architect. Document RESTful endpoints precisely, with " +
    "typed parameters and error responses. Return only the structured JSON " +
    "requested.";

  const user = `Mode: ${params.mode}.${buildSchemaBasis(params)}\n\nInstruction: ${params.instruction}`;

  const raw = await bdGenerateStructured({
    system,
    user,
    schema: API_DSL,
    aiConfig: params.aiConfig,
    temperature: 0.3,
  });

  const apisRaw = Array.isArray(raw.apis) ? raw.apis : [];
  const apis = apisRaw
    .map(normalizeApi)
    .filter((a): a is BDApiDraft => a !== null);

  return { apis };
}
