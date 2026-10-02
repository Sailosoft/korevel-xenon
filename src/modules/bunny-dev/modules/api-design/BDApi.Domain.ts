// BDApi.Domain.ts — API Design domain model (documented + mockable API
// operations, properties, returns, headers, errors, examples).

import type { BDEntity } from "../core/BDShared.Types";

export const BDAPIProtocol = {
  rest: "rest",
  graphql: "graphql",
  grpc: "grpc",
  websocket: "websocket",
  rpc: "rpc",
  soap: "soap",
  webhook: "webhook",
} as const;
export type BDAPIProtocol = (typeof BDAPIProtocol)[keyof typeof BDAPIProtocol];

export const BDAPIMethod = {
  get: "get",
  post: "post",
  put: "put",
  patch: "patch",
  delete: "delete",
  head: "head",
  options: "options",
  query: "query",
  mutation: "mutation",
  subscription: "subscription",
  event: "event",
} as const;
export type BDAPIMethod = (typeof BDAPIMethod)[keyof typeof BDAPIMethod];

export const BDAPIParamLocation = {
  path: "path",
  query: "query",
  header: "header",
  cookie: "cookie",
  body: "body",
  formData: "formData",
  field: "field",
} as const;
export type BDAPIParamLocation = (typeof BDAPIParamLocation)[keyof typeof BDAPIParamLocation];

export const BDAPIAuthType = {
  none: "none",
  apiKey: "apiKey",
  bearer: "bearer",
  basic: "basic",
  oauth2: "oauth2",
  session: "session",
} as const;
export type BDAPIAuthType = (typeof BDAPIAuthType)[keyof typeof BDAPIAuthType];

export const BDAPIReturnKind = {
  object: "object",
  array: "array",
  any: "any",
  scalar: "scalar",
  enum: "enum",
  union: "union",
  void: "void",
  stream: "stream",
  file: "file",
  reference: "reference",
} as const;
export type BDAPIReturnKind = (typeof BDAPIReturnKind)[keyof typeof BDAPIReturnKind];

export const BDAPIVersionStrategy = {
  uri: "uri",
  query: "query",
  header: "header",
  mediaType: "mediaType",
} as const;
export type BDAPIVersionStrategy = (typeof BDAPIVersionStrategy)[keyof typeof BDAPIVersionStrategy];

export interface BDAPIProperty {
  name: string;
  type: string;
  location: BDAPIParamLocation;
  required?: boolean;
  nullable?: boolean;
  description?: string;
  default?: unknown;
  example?: unknown;
  /** Selected faker generator for mock values (see BD_API_FAKE_TYPES). */
  fakeType?: string;
  enum?: string[];
  modelId?: string;
  properties?: BDAPIProperty[];
  item?: BDAPIProperty;
}

export interface BDAPIHeader {
  name: string;
  type: string;
  required?: boolean;
  description?: string;
  example?: unknown;
}

export interface BDAPIReturn {
  kind: BDAPIReturnKind;
  type: string;
  nullable?: boolean;
  description?: string;
  status?: number;
  modelId?: string;
  /** Selected faker generator for scalar returns (see BD_API_FAKE_TYPES). */
  fakeType?: string;
  properties?: BDAPIProperty[];
  item?: BDAPIReturn;
  headers?: BDAPIHeader[];
  example?: unknown;
}

export interface BDAPIError {
  status: number;
  code?: string;
  message: string;
  description?: string;
  type?: string;
}

export interface BDAPIExample {
  name?: string;
  request?: string;
  response?: string;
  language?: string;
}

/** A group of API operations — enables holding variants of an API design. */
export interface BDApiGroup extends BDEntity {
  projectId: string;
  name: string;
  description?: string;
  position: number;
}

/** Aggregate root: a documented + mockable API operation. */
export interface BDAPI extends BDEntity {
  projectId: string;
  groupId?: string;
  name: string;
  operationId?: string;
  group?: string;
  protocol: BDAPIProtocol;
  method: BDAPIMethod;
  path: string;
  url?: string;
  summary?: string;
  description: string;
  properties: BDAPIProperty[];
  returns: BDAPIReturn;
  headers?: BDAPIHeader[];
  errors?: BDAPIError[];
  auth?: BDAPIAuthType;
  version?: string;
  versionStrategy?: BDAPIVersionStrategy;
  modelId?: string;
  examples?: BDAPIExample[];
  tagIds?: string[];
  deprecated?: boolean;
  hidden?: boolean;
}
