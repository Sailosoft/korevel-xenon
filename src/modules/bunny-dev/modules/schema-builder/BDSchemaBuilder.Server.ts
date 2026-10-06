"use server";

// BDSchemaBuilder.Server — one-shot AI schema generation via Helix.
//
// Returns a full serializable artifact set (groups → models → properties,
// relations, indexes). Relations reference target models by NAME at generation
// time; the client resolves names to ids when applying.

import type { BDGenerationMode } from "../../BDDomain.Types";
import type { HelixAISchemaOptions } from "@/src/modules/helix/src/HelixAISchemaTypes";
import {
  bdGenerateStructured,
  type BDAIConfigOverride,
} from "../agent-manager/BDGeneration.Server";
import { bdBuildModeUser } from "../agent-manager/BDGeneration.Mode";
import type {
  BDSchemaArtifact,
  BDSchemaGroupDraft,
  BDSchemaIndexDraft,
  BDSchemaModelDraft,
  BDSchemaPropertyDraft,
  BDSchemaRelationDraft,
} from "./BDSchemaBuilder.Types";

export interface BDSchemaGenerateParams {
  instruction: string;
  mode: BDGenerationMode;
  /** Short context of models already in the project. */
  existingModels?: string[];
  targetContext?: string;
  aiConfig?: BDAIConfigOverride;
}

const SCHEMA_DSL: HelixAISchemaOptions = {
  name: "schema_builder_artifact",
  description: "A set of database schema groups, each with models and columns.",
  properties: {
    groups: {
      type: "array",
      description: "One or more schema groups (schema versions/variants).",
      items: {
        type: "object",
        description: "A schema group.",
        properties: {
          name: { type: "string", description: "Group name." },
          description: { type: "string", description: "What this group is." },
          models: {
            type: "array",
            description: "Models (tables) in the group.",
            items: {
              type: "object",
              description: "A model (table).",
              properties: {
                name: {
                  type: "string",
                  description: "PascalCase model name.",
                },
                table: {
                  type: "string",
                  description: "snake_case table name.",
                },
                description: {
                  type: "string",
                  description: "What the model represents.",
                },
                timestamps: {
                  type: "boolean",
                  description: "Whether created/updated timestamps exist.",
                },
                softDeletes: {
                  type: "boolean",
                  description: "Whether the model uses soft deletes.",
                },
                properties: {
                  type: "array",
                  description: "Columns of the model.",
                  items: {
                    type: "object",
                    description: "A single column.",
                    properties: {
                      name: { type: "string", description: "Column name." },
                      type: {
                        type: "string",
                        description:
                          "One of: string, text, integer, bigint, float, double, decimal, boolean, date, time, datetime, timestamp, uuid, json, jsonb, binary, enum, array.",
                      },
                      nullable: {
                        type: "boolean",
                        description: "Whether the column is nullable.",
                      },
                      primary: {
                        type: "boolean",
                        description: "Whether the column is the primary key.",
                      },
                      unique: {
                        type: "boolean",
                        description: "Whether the column is unique.",
                      },
                      default: {
                        type: "string",
                        description: "Default value as a string.",
                      },
                      values: {
                        type: "array",
                        description: "Allowed values when type is enum.",
                        items: {
                          type: "string",
                          description: "An allowed enum value.",
                        },
                      },
                    },
                  },
                },
                relations: {
                  type: "array",
                  description: "Relations from this model.",
                  items: {
                    type: "object",
                    description: "A relation.",
                    properties: {
                      name: { type: "string", description: "Relation name." },
                      type: {
                        type: "string",
                        description:
                          "One of: belongsTo, hasOne, hasMany, belongsToMany, hasManyThrough, morphOne, morphMany, morphTo.",
                      },
                      target: {
                        type: "string",
                        description: "Target model name.",
                      },
                      foreignKey: {
                        type: "string",
                        description: "Foreign key column name.",
                      },
                      nullable: {
                        type: "boolean",
                        description: "Whether the relation is nullable.",
                      },
                    },
                  },
                },
                indexes: {
                  type: "array",
                  description: "Indexes on this model.",
                  items: {
                    type: "object",
                    description: "An index.",
                    properties: {
                      columns: {
                        type: "array",
                        description: "Indexed columns.",
                        items: {
                          type: "string",
                          description: "A column name.",
                        },
                      },
                      type: {
                        type: "string",
                        description:
                          "One of: index, unique, primary, fulltext, spatial.",
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

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

function normalizeProperty(raw: unknown): BDSchemaPropertyDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  if (typeof p.name !== "string") return null;
  return {
    name: p.name,
    type: typeof p.type === "string" ? p.type : "string",
    nullable: p.nullable === true,
    primary: p.primary === true,
    unique: p.unique === true,
    default: p.default,
    values: asStringList(p.values),
  };
}

function normalizeRelation(raw: unknown): BDSchemaRelationDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.name !== "string" || typeof r.target !== "string") return null;
  return {
    name: r.name,
    type: typeof r.type === "string" ? r.type : "belongsTo",
    target: r.target,
    foreignKey: typeof r.foreignKey === "string" ? r.foreignKey : undefined,
    nullable: r.nullable !== false,
  };
}

function normalizeIndex(raw: unknown): BDSchemaIndexDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const i = raw as Record<string, unknown>;
  const columns = asStringList(i.columns);
  if (columns.length === 0) return null;
  return { columns, type: typeof i.type === "string" ? i.type : "index" };
}

function normalizeModel(raw: unknown): BDSchemaModelDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Record<string, unknown>;
  if (typeof m.name !== "string") return null;
  const properties = Array.isArray(m.properties)
    ? m.properties
        .map(normalizeProperty)
        .filter((p): p is BDSchemaPropertyDraft => p !== null)
    : [];
  const relations = Array.isArray(m.relations)
    ? m.relations
        .map(normalizeRelation)
        .filter((r): r is BDSchemaRelationDraft => r !== null)
    : [];
  const indexes = Array.isArray(m.indexes)
    ? m.indexes
        .map(normalizeIndex)
        .filter((i): i is BDSchemaIndexDraft => i !== null)
    : [];
  return {
    name: m.name,
    table: typeof m.table === "string" ? m.table : undefined,
    description: typeof m.description === "string" ? m.description : undefined,
    properties,
    relations,
    indexes,
    timestamps: m.timestamps !== false,
    softDeletes: m.softDeletes === true,
  };
}

function normalizeGroup(raw: unknown): BDSchemaGroupDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const g = raw as Record<string, unknown>;
  if (typeof g.name !== "string") return null;
  const models = Array.isArray(g.models)
    ? g.models
        .map(normalizeModel)
        .filter((m): m is BDSchemaModelDraft => m !== null)
    : [];
  return {
    name: g.name,
    description: typeof g.description === "string" ? g.description : undefined,
    models,
  };
}

export async function bdGenerateSchema(
  params: BDSchemaGenerateParams,
): Promise<BDSchemaArtifact> {
  const system =
    "You are a senior database architect. Design normalized relational schemas. " +
    "Always include a primary key on every model and describe relations clearly. " +
    "Return only the structured JSON requested.";

  const context =
    params.existingModels && params.existingModels.length > 0
      ? `Existing models (do not duplicate unless asked): ${params.existingModels.join(
          ", ",
        )}.`
      : "";

  const user = bdBuildModeUser({
    mode: params.mode,
    instruction: params.instruction,
    targetContext: params.targetContext,
    context,
  });

  const raw = await bdGenerateStructured({
    system,
    user,
    schema: SCHEMA_DSL,
    aiConfig: params.aiConfig,
    temperature: 0.3,
  });

  const groupsRaw = Array.isArray(raw.groups) ? raw.groups : [];
  const groups = groupsRaw
    .map(normalizeGroup)
    .filter((g): g is BDSchemaGroupDraft => g !== null);

  return { groups };
}
