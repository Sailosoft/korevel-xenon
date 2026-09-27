// BDSchemaBuilder.Types.ts — schema builder form shapes + defaults.

import type {
  BDSchemaGroup,
  BDSchemaIndex,
  BDSchemaModel,
  BDSchemaProperty,
  BDSchemaRelation,
} from "./BDSchema.Domain";
import { BDSchemaIndexType, BDSchemaType } from "./BDSchema.Domain";

export interface BDSchemaGroupForm {
  name: string;
  description: string;
}

export interface BDSchemaModelForm {
  name: string;
  table: string;
  description: string;
  timestamps: boolean;
  softDeletes: boolean;
}

export const BD_SCHEMA_GROUP_EMPTY: BDSchemaGroupForm = {
  name: "",
  description: "",
};

export const BD_SCHEMA_MODEL_EMPTY: BDSchemaModelForm = {
  name: "",
  table: "",
  description: "",
  timestamps: true,
  softDeletes: false,
};

/** All selectable schema column types. */
export const BD_SCHEMA_TYPE_OPTIONS = Object.keys(BDSchemaType).map((key) => ({
  label: key,
  value: key,
}));

/** All selectable index types. */
export const BD_SCHEMA_INDEX_TYPE_OPTIONS = Object.keys(BDSchemaIndexType).map(
  (key) => ({ label: key, value: key }),
);

export function createDefaultProperty(name = "column"): BDSchemaProperty {
  return {
    name,
    type: BDSchemaType.string,
    nullable: false,
    fillable: true,
  };
}

export function createDefaultRelation(): BDSchemaRelation {
  return {
    name: "relation",
    type: "belongsTo",
    targetModelId: "",
    nullable: true,
  };
}

export function createDefaultIndex(): BDSchemaIndex {
  return { columns: [], type: BDSchemaIndexType.index };
}

export function slugifyTable(name: string): string {
  const base = name
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .toLowerCase()
    .replace(/^_+|_+$/g, "");
  return base ? `${base}s`.replace(/ss$/, "s") : "table";
}

export function toGroupForm(group: BDSchemaGroup): BDSchemaGroupForm {
  return { name: group.name, description: group.description ?? "" };
}

export function toModelForm(model: BDSchemaModel): BDSchemaModelForm {
  return {
    name: model.name,
    table: model.table,
    description: model.description ?? "",
    timestamps: model.timestamps,
    softDeletes: model.softDeletes,
  };
}

// ── AI generation draft shapes (relations reference target models by name) ──

export interface BDSchemaPropertyDraft {
  name: string;
  type: string;
  nullable?: boolean;
  primary?: boolean;
  unique?: boolean;
  default?: unknown;
  values?: string[];
}

export interface BDSchemaRelationDraft {
  name: string;
  type: string;
  target: string;
  foreignKey?: string;
  nullable?: boolean;
}

export interface BDSchemaIndexDraft {
  columns: string[];
  type: string;
}

export interface BDSchemaModelDraft {
  name: string;
  table?: string;
  description?: string;
  properties: BDSchemaPropertyDraft[];
  relations?: BDSchemaRelationDraft[];
  indexes?: BDSchemaIndexDraft[];
  timestamps?: boolean;
  softDeletes?: boolean;
}

export interface BDSchemaGroupDraft {
  name: string;
  description?: string;
  models: BDSchemaModelDraft[];
}

export interface BDSchemaArtifact {
  groups: BDSchemaGroupDraft[];
}
