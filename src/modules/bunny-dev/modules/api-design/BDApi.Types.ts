// BDApi.Types.ts — API Design form shapes, defaults, and mock builders.

import type {
  BDAPI,
  BDAPIError,
  BDAPIExample,
  BDAPIProperty,
  BDAPIReturn,
} from "./BDApi.Domain";
import {
  BDAPIAuthType,
  BDAPIMethod,
  BDAPIParamLocation,
  BDAPIProtocol,
  BDAPIReturnKind,
  BDAPIVersionStrategy,
} from "./BDApi.Domain";

export interface BDApiForm {
  name: string;
  method: BDAPIMethod;
  path: string;
  protocol: BDAPIProtocol;
  group: string;
  summary: string;
  description: string;
  auth: BDAPIAuthType;
  version: string;
}

export const BD_API_EMPTY_FORM: BDApiForm = {
  name: "",
  method: BDAPIMethod.get,
  path: "/api/resource",
  protocol: BDAPIProtocol.rest,
  group: "",
  summary: "",
  description: "",
  auth: BDAPIAuthType.none,
  version: "",
};

const toOptions = (record: Record<string, string>) =>
  Object.keys(record).map((key) => ({ label: key, value: key }));

export const BD_API_METHOD_OPTIONS = toOptions(BDAPIMethod);
export const BD_API_PROTOCOL_OPTIONS = toOptions(BDAPIProtocol);
export const BD_API_AUTH_OPTIONS = toOptions(BDAPIAuthType);
export const BD_API_LOCATION_OPTIONS = toOptions(BDAPIParamLocation);
export const BD_API_RETURN_KIND_OPTIONS = toOptions(BDAPIReturnKind);
export const BD_API_VERSION_STRATEGY_OPTIONS = toOptions(BDAPIVersionStrategy);

export function createProperty(): BDAPIProperty {
  return {
    name: "param",
    type: "string",
    location: BDAPIParamLocation.query,
    required: false,
  };
}

export function createError(): BDAPIError {
  return { status: 400, message: "Bad Request" };
}

export function createExample(): BDAPIExample {
  return { name: "Example", request: "{}", response: "{}", language: "json" };
}

export function createReturn(): BDAPIReturn {
  return {
    kind: BDAPIReturnKind.object,
    type: "object",
    properties: [],
    example: {},
  };
}

export function createApi(
  projectId: string,
  form: BDApiForm,
): Omit<BDAPI, "id"> {
  return {
    projectId,
    name: form.name,
    group: form.group || undefined,
    protocol: form.protocol,
    method: form.method,
    path: form.path,
    summary: form.summary || undefined,
    description: form.description,
    properties: [],
    returns: createReturn(),
    auth: form.auth,
    version: form.version || undefined,
  };
}

export function toApiForm(api: BDAPI): BDApiForm {
  return {
    name: api.name,
    method: api.method,
    path: api.path,
    protocol: api.protocol,
    group: api.group ?? "",
    summary: api.summary ?? "",
    description: api.description,
    auth: api.auth ?? BDAPIAuthType.none,
    version: api.version ?? "",
  };
}

// ── Mock builders (no real network calls — pure local mocking) ──────────────

function sampleForType(type: string): unknown {
  const t = type.toLowerCase();
  if (t.includes("int") || t.includes("number") || t.includes("float"))
    return 1;
  if (t.includes("bool")) return true;
  if (t.includes("date")) return new Date().toISOString();
  if (t.includes("array")) return [];
  return "string";
}

/** Build a mock JSON request body from the API's body properties. */
export function buildMockRequest(api: BDAPI): Record<string, unknown> {
  const body = api.properties.filter(
    (p) => p.location === BDAPIParamLocation.body || p.location === BDAPIParamLocation.formData,
  );
  const out: Record<string, unknown> = {};
  for (const property of body) {
    out[property.name] = property.example ?? sampleForType(property.type);
  }
  return out;
}

/** Build a mock JSON response from the API's return definition. */
export function buildMockResponse(api: BDAPI): unknown {
  const { returns } = api;
  if (returns.example !== undefined && returns.example !== null) {
    return returns.example;
  }
  if (returns.kind === BDAPIReturnKind.array) {
    return [returns.item ? returns.item.example ?? "string" : {}];
  }
  if (
    returns.kind === BDAPIReturnKind.object ||
    returns.kind === BDAPIReturnKind.reference
  ) {
    const out: Record<string, unknown> = {};
    for (const property of returns.properties ?? []) {
      out[property.name] = property.example ?? sampleForType(property.type);
    }
    return out;
  }
  return { status: returns.status ?? 200, data: returns.type };
}

// ── AI artifact drafts ─────────────────────────────────────────────────────

export interface BDApiPropertyDraft {
  name: string;
  type?: string;
  location?: string;
  required?: boolean;
  description?: string;
}

export interface BDApiErrorDraft {
  status: number;
  message: string;
  description?: string;
}

export interface BDApiDraft {
  name: string;
  group?: string;
  protocol?: string;
  method?: string;
  path: string;
  summary?: string;
  description: string;
  properties?: BDApiPropertyDraft[];
  returnType?: string;
  returnKind?: string;
  auth?: string;
  errors?: BDApiErrorDraft[];
}

export interface BDApiArtifact {
  apis: BDApiDraft[];
}
