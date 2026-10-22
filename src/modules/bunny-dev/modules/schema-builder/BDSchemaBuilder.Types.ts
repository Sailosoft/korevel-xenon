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

/** Inverse relation the target model should receive once the edited model is saved. */
export interface BDSchemaInverseRelationRequest {
  targetModelId: string;
  foreignKey: string;
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

export function createDefaultProperty(name = ""): BDSchemaProperty {
  return {
    name,
    type: BDSchemaType.string,
    nullable: false,
    fillable: true,
  };
}

export function createDefaultRelation(): BDSchemaRelation {
  return {
    name: "",
    type: "belongsTo",
    targetModelId: "",
    nullable: true,
  };
}

export function createDefaultIndex(): BDSchemaIndex {
  return { columns: [], type: BDSchemaIndexType.index };
}

/** snake_case a model name (no pluralization). `OrderItem` → `order_item`. */
export function snakeCase(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .toLowerCase()
    .replace(/^_+|_+$/g, "");
}

/** camelCase a model name. `OrderItem` → `orderItem`. */
export function camelCase(name: string): string {
  const base = snakeCase(name);
  return base.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

/** English plural for a snake/camel base: `category` → `categories`, `day` → `days`. */
export function pluralizeWord(base: string): string {
  if (!base) return "";
  if (/[^aeiou]y$/i.test(base)) return `${base.slice(0, -1)}ies`;
  if (/(s|x|z|ch|sh)$/i.test(base)) {
    // Names already ending in a plural-looking "s" stay as-is.
    if (/s$/i.test(base) && !/(ss|us|is)$/i.test(base)) return base;
    return `${base}es`;
  }
  return `${base}s`;
}

/** Singular relation name for the "one" side; plural for the "many" side. */
export function suggestRelationName(
  type: BDSchemaRelation["type"],
  targetName: string,
): string {
  const base = camelCase(targetName);
  if (!base) return "";
  switch (type) {
    case "hasMany":
    case "belongsToMany":
    case "hasManyThrough":
    case "morphMany":
      return pluralizeWord(base);
    default:
      return base;
  }
}

/** Default foreign key column for a target model: `OrderItem` → `order_item_id`. */
export function suggestForeignKey(targetName: string): string {
  const base = snakeCase(targetName);
  return base ? `${base}_id` : "";
}

/** A new, unsaved model draft — persisted only when the user saves it. */
export function createEmptyModel(
  projectId: string,
  groupId: string,
): BDSchemaModel {
  return {
    id: "",
    projectId,
    groupId,
    name: "",
    table: "",
    description: "",
    properties: [
      {
        name: "id",
        type: BDSchemaType.uuid,
        nullable: false,
        primary: true,
        unique: true,
      },
    ],
    relations: [],
    indexes: [],
    primaryKey: ["id"],
    timestamps: true,
    softDeletes: false,
  };
}

export function slugifyTable(name: string): string {
  const base = name
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .toLowerCase()
    .replace(/^_+|_+$/g, "");
  return base ? pluralizeWord(base) : "table";
}

/** A unique foreign-key column name inside the current model. */
export function uniqueForeignKey(base: string, existing: string[]): string {
  const taken = new Set(existing);
  if (!taken.has(base)) return base;
  let suffix = 2;
  while (taken.has(`${base}_${suffix}`)) suffix += 1;
  return `${base}_${suffix}`;
}

export interface BDSchemaRelationColumnDraft {
  property: BDSchemaProperty;
  relation: BDSchemaRelation;
}

/**
 * Column + belongsTo relation for a relation-column shortcut. The FK column
 * mirrors the target primary key's type. Returns `null` when the target has no
 * columns to reference.
 */
export function buildRelationColumn(
  draft: BDSchemaModel,
  target: BDSchemaModel,
): BDSchemaRelationColumnDraft | null {
  const key =
    target.properties.find((p) => p.name === target.primaryKey?.[0]) ??
    target.properties.find((p) => p.primary) ??
    target.properties[0];
  if (!key) return null;

  const base = suggestForeignKey(target.name) || "model_id";
  const foreignKey = uniqueForeignKey(
    base,
    draft.properties.map((p) => p.name),
  );

  return {
    property: {
      name: foreignKey,
      type: key.type,
      nullable: true,
      fillable: true,
    },
    relation: {
      name: suggestRelationName("belongsTo", target.name) || "target",
      type: "belongsTo",
      targetModelId: target.id,
      foreignKey,
      ownerKey: key.name,
      nullable: true,
    },
  };
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
