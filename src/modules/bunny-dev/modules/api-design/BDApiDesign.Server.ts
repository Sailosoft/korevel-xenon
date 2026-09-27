"use server";

// BDApiDesign.Server — one-shot AI API documentation/mock generation.

import type { BDGenerationMode } from "../../BDDomain.Types";
import type { HelixAISchemaOptions } from "@/src/modules/helix/src/HelixAISchemaTypes";
import {
  bdGenerateStructured,
  type BDAIConfigOverride,
} from "../agent-manager/BDGeneration.Server";
import type {
  BDApiArtifact,
  BDApiDraft,
  BDApiErrorDraft,
  BDApiPropertyDraft,
} from "./BDApi.Types";

export interface BDApiGenerateParams {
  instruction: string;
  mode: BDGenerationMode;
  models?: string[];
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
              "object, array, scalar, enum, union, void, stream, file or reference.",
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
    properties: Array.isArray(a.properties)
      ? a.properties
          .map(normalizeProperty)
          .filter((p): p is BDApiPropertyDraft => p !== null)
      : [],
    returnType: asString(a.returnType) || undefined,
    returnKind: asString(a.returnKind) || "object",
    errors: Array.isArray(a.errors)
      ? a.errors
          .map(normalizeError)
          .filter((e): e is BDApiErrorDraft => e !== null)
      : [],
  };
}

export async function bdGenerateApi(
  params: BDApiGenerateParams,
): Promise<BDApiArtifact> {
  const system =
    "You are an API architect. Document RESTful endpoints precisely, with " +
    "typed parameters and error responses. Return only the structured JSON " +
    "requested.";

  const context =
    params.models && params.models.length > 0
      ? `\nSchema models available: ${params.models.join(", ")}.`
      : "";

  const user = `Mode: ${params.mode}.${context}\n\nInstruction: ${params.instruction}`;

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
