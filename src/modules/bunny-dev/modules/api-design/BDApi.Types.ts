// BDApi.Types.ts — API Design form shapes, defaults, and mock builders.

import type {
  BDAPI,
  BDAPIError,
  BDAPIExample,
  BDAPIProperty,
  BDAPIReturn,
  BDApiGroup,
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

export interface BDApiGroupForm {
  name: string;
  description: string;
}

export const BD_API_GROUP_EMPTY: BDApiGroupForm = {
  name: "",
  description: "",
};

export function toGroupForm(group: BDApiGroup): BDApiGroupForm {
  return { name: group.name, description: group.description ?? "" };
}

const toOptions = (record: Record<string, string>) =>
  Object.keys(record).map((key) => ({ label: key, value: key }));

export const BD_API_METHOD_OPTIONS = toOptions(BDAPIMethod);
export const BD_API_PROTOCOL_OPTIONS = toOptions(BDAPIProtocol);
export const BD_API_AUTH_OPTIONS = toOptions(BDAPIAuthType);
export const BD_API_LOCATION_OPTIONS = toOptions(BDAPIParamLocation);
export const BD_API_RETURN_KIND_OPTIONS = toOptions(BDAPIReturnKind);
export const BD_API_VERSION_STRATEGY_OPTIONS = toOptions(BDAPIVersionStrategy);

/** Shape shown by the Return toggle: a plain object, an array, or any. */
export type BDApiReturnShape = "object" | "array" | "any";
/** Shape of an array return's item. */
export type BDApiItemShape = "object" | "scalar" | "any";

export const BD_API_RETURN_SHAPE_OPTIONS: {
  label: string;
  value: BDApiReturnShape;
}[] = [
  { label: "Object", value: "object" },
  { label: "Array", value: "array" },
  { label: "Any", value: "any" },
];

export const BD_API_ITEM_SHAPE_OPTIONS: {
  label: string;
  value: BDApiItemShape;
}[] = [
  { label: "Object", value: "object" },
  { label: "Scalar", value: "scalar" },
  { label: "Any", value: "any" },
];

/**
 * Map a stored return kind to the toggle shape. Structural kinds collapse to
 * `object`; legacy scalar/enum/union/... are bucketed there too and normalize
 * to a concrete kind on first edit.
 */
export function returnShapeOf(returns: BDAPIReturn): BDApiReturnShape {
  if (returns.kind === BDAPIReturnKind.array) return "array";
  if (returns.kind === BDAPIReturnKind.any) return "any";
  return "object";
}

export function itemShapeOf(item?: BDAPIReturn): BDApiItemShape {
  if (item?.kind === BDAPIReturnKind.any) return "any";
  if (item?.kind === BDAPIReturnKind.object) return "object";
  return "scalar";
}

export function createProperty(): BDAPIProperty {
  return {
    name: "param",
    type: "string",
    location: BDAPIParamLocation.query,
    required: false,
  };
}

/** A return field row — `location` is unused for returns but kept for shape. */
export function createReturnProperty(): BDAPIProperty {
  return {
    name: "field",
    type: "string",
    location: BDAPIParamLocation.body,
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
  };
}

export function createApi(
  projectId: string,
  form: BDApiForm,
  groupId?: string,
): Omit<BDAPI, "id"> {
  return {
    projectId,
    groupId,
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
  if (t.includes("any")) return null;
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

/** Build a mock value for one return definition (recursive over arrays). */
export function buildReturnSample(ret: BDAPIReturn | undefined): unknown {
  if (!ret) return null;
  if (ret.example !== undefined && ret.example !== null) {
    const ex = ret.example;
    const isEmptyObject =
      typeof ex === "object" &&
      !Array.isArray(ex) &&
      Object.keys(ex as Record<string, unknown>).length === 0;
    if (!isEmptyObject) return ex;
  }
  const { kind } = ret;
  if (kind === BDAPIReturnKind.any || kind === BDAPIReturnKind.void) return null;
  if (
    kind === BDAPIReturnKind.scalar ||
    kind === BDAPIReturnKind.enum ||
    kind === BDAPIReturnKind.union ||
    kind === BDAPIReturnKind.stream ||
    kind === BDAPIReturnKind.file
  ) {
    return sampleForType(ret.type);
  }
  if (kind === BDAPIReturnKind.array) {
    return [buildReturnSample(ret.item)];
  }
  // object / reference → build from the declared fields.
  const out: Record<string, unknown> = {};
  for (const property of ret.properties ?? []) {
    out[property.name] = property.example ?? sampleForType(property.type);
  }
  return out;
}

/** Build a mock JSON response from the API's return definition. */
export function buildMockResponse(api: BDAPI): unknown {
  return buildReturnSample(api.returns);
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

export interface BDApiReturnItemDraft {
  kind?: string;
  type?: string;
  properties?: BDApiPropertyDraft[];
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
  returnProperties?: BDApiPropertyDraft[];
  returnItem?: BDApiReturnItemDraft;
  auth?: string;
  errors?: BDApiErrorDraft[];
}

export interface BDApiArtifact {
  apis: BDApiDraft[];
}
