// BDSchema.Domain.ts — Schema Builder domain model (schema groups, models,
// properties, relations, indexes).

import type { BDEntity } from "../core/BDShared.Types";

export const BDSchemaType = {
  string: "string",
  text: "text",
  integer: "integer",
  bigint: "bigint",
  float: "float",
  double: "double",
  decimal: "decimal",
  boolean: "boolean",
  date: "date",
  time: "time",
  datetime: "datetime",
  timestamp: "timestamp",
  uuid: "uuid",
  json: "json",
  jsonb: "jsonb",
  binary: "binary",
  enum: "enum",
  array: "array",
} as const;
export type BDSchemaType = (typeof BDSchemaType)[keyof typeof BDSchemaType];

export const BDSchemaRelationType = {
  belongsTo: "belongsTo",
  hasOne: "hasOne",
  hasMany: "hasMany",
  belongsToMany: "belongsToMany",
  hasManyThrough: "hasManyThrough",
  morphOne: "morphOne",
  morphMany: "morphMany",
  morphTo: "morphTo",
} as const;
export type BDSchemaRelationType = (typeof BDSchemaRelationType)[keyof typeof BDSchemaRelationType];

export const BDSchemaReferenceAction = {
  cascade: "cascade",
  restrict: "restrict",
  setNull: "setNull",
  noAction: "noAction",
} as const;
export type BDSchemaReferenceAction = (typeof BDSchemaReferenceAction)[keyof typeof BDSchemaReferenceAction];

export const BDSchemaIndexType = {
  index: "index",
  unique: "unique",
  primary: "primary",
  fulltext: "fulltext",
  spatial: "spatial",
} as const;
export type BDSchemaIndexType = (typeof BDSchemaIndexType)[keyof typeof BDSchemaIndexType];

/** A group of schema models — enables building versions/variants of a schema. */
export interface BDSchemaGroup extends BDEntity {
  projectId: string;
  name: string;
  description?: string;
  position: number;
}

/** A single table/model inside a schema group. Owns its columns/relations. */
export interface BDSchemaModel extends BDEntity {
  projectId: string;
  groupId: string;
  name: string;
  table: string;
  description?: string;
  properties: BDSchemaProperty[];
  relations: BDSchemaRelation[];
  indexes: BDSchemaIndex[];
  primaryKey: string[];
  timestamps: boolean;
  softDeletes: boolean;
}

export interface BDSchemaProperty {
  name: string;
  type: BDSchemaType;
  nullable: boolean;
  primary?: boolean;
  unique?: boolean;
  autoIncrement?: boolean;
  unsigned?: boolean;
  default?: unknown;
  length?: number;
  precision?: number;
  scale?: number;
  values?: string[];
  cast?: string;
  comment?: string;
  hidden?: boolean;
  fillable?: boolean;
}

export interface BDSchemaRelation {
  name: string;
  type: BDSchemaRelationType;
  targetModelId: string;
  foreignKey?: string;
  ownerKey?: string;
  pivotTable?: string;
  throughModelId?: string;
  onDelete?: BDSchemaReferenceAction;
  onUpdate?: BDSchemaReferenceAction;
  nullable?: boolean;
}

export interface BDSchemaIndex {
  name?: string;
  columns: string[];
  type: BDSchemaIndexType;
}
