// BDPrismaExport.ts — turn schema models into a Prisma schema and a plain
// TypeScript "model builder" interface file.
//
// Pure functions (no Dexie / browser access) so they can run on either side.

import type {
  BDSchemaModel,
  BDSchemaProperty,
  BDSchemaRelation,
} from "../../BDDomain.Types";
import { BDSchemaIndexType, BDSchemaRelationType, BDSchemaType } from "../../BDDomain.Types";
import { slugifyTable } from "./BDSchemaBuilder.Types";

/** Export name for a model — falls back so an unnamed draft still exports. */
function modelName(model: BDSchemaModel): string {
  return model.name.trim() || "Model";
}

const PRISMA_SCALAR: Record<string, string> = {
  [BDSchemaType.string]: "String",
  [BDSchemaType.text]: "String",
  [BDSchemaType.integer]: "Int",
  [BDSchemaType.bigint]: "BigInt",
  [BDSchemaType.float]: "Float",
  [BDSchemaType.double]: "Float",
  [BDSchemaType.decimal]: "Decimal",
  [BDSchemaType.boolean]: "Boolean",
  [BDSchemaType.date]: "DateTime",
  [BDSchemaType.time]: "DateTime",
  [BDSchemaType.datetime]: "DateTime",
  [BDSchemaType.timestamp]: "DateTime",
  [BDSchemaType.uuid]: "String",
  [BDSchemaType.json]: "Json",
  [BDSchemaType.jsonb]: "Json",
  [BDSchemaType.binary]: "Bytes",
  [BDSchemaType.enum]: "String",
  [BDSchemaType.array]: "Json",
};

const TS_SCALAR: Record<string, string> = {
  [BDSchemaType.string]: "string",
  [BDSchemaType.text]: "string",
  [BDSchemaType.integer]: "number",
  [BDSchemaType.bigint]: "bigint",
  [BDSchemaType.float]: "number",
  [BDSchemaType.double]: "number",
  [BDSchemaType.decimal]: "number",
  [BDSchemaType.boolean]: "boolean",
  [BDSchemaType.date]: "string",
  [BDSchemaType.time]: "string",
  [BDSchemaType.datetime]: "string",
  [BDSchemaType.timestamp]: "string",
  [BDSchemaType.uuid]: "string",
  [BDSchemaType.json]: "unknown",
  [BDSchemaType.jsonb]: "unknown",
  [BDSchemaType.binary]: "Uint8Array",
  [BDSchemaType.enum]: "string",
  [BDSchemaType.array]: "unknown[]",
};

function defaultLiteral(value: unknown, type: BDSchemaType): string | null {
  if (value === undefined || value === null) {
    if (type === BDSchemaType.uuid) return "uuid()";
    if (type === BDSchemaType.boolean) return null;
    return null;
  }
  if (type === BDSchemaType.uuid && value === "uuid") return "uuid()";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  return null;
}

function prismaProperty(property: BDSchemaProperty): string {
  const parts: string[] = [property.name];

  let type = PRISMA_SCALAR[property.type] ?? "String";
  if (property.type === BDSchemaType.array) type = "Json";

  const optional = property.nullable && !property.primary;
  parts.push(optional ? `${type}?` : type);

  const attrs: string[] = [];
  if (property.primary) attrs.push("@id");
  if (property.unique && !property.primary) attrs.push("@unique");
  if (property.type === BDSchemaType.uuid && property.primary) {
    attrs.push("@default(uuid())");
  } else {
    const literal = defaultLiteral(property.default, property.type);
    if (literal) attrs.push(`@default(${literal})`);
  }
  if (property.length) attrs.push(`@db.VarChar(${property.length})`);

  return `  ${parts.join(" ")}${attrs.length ? " " + attrs.join(" ") : ""}`;
}

function prismaRelation(
  relation: BDSchemaRelation,
  models: BDSchemaModel[],
): string | null {
  if (!relation.name.trim()) return null;
  const target = models.find((m) => m.id === relation.targetModelId);
  if (!target) return null;
  const targetName = target.name;

  switch (relation.type) {
    case BDSchemaRelationType.hasMany:
    case BDSchemaRelationType.morphMany:
    case BDSchemaRelationType.hasManyThrough:
      return `  ${relation.name} ${targetName}[]`;
    case BDSchemaRelationType.hasOne:
    case BDSchemaRelationType.morphOne:
      return `  ${relation.name} ${targetName}?`;
    case BDSchemaRelationType.belongsToMany:
      return `  ${relation.name} ${targetName}[]`;
    case BDSchemaRelationType.belongsTo:
    case BDSchemaRelationType.morphTo: {
      const reference = relation.ownerKey ?? "id";
      const fields = relation.foreignKey ?? `${relation.name}Id`;
      const optional = relation.nullable ? "?" : "";
      return `  ${relation.name} ${targetName}${optional} @relation(fields: [${fields}], references: [${reference}])`;
    }
    default:
      return `  ${relation.name} ${targetName}?`;
  }
}

/** Convert one model into a Prisma `model { … }` block. */
export function toPrismaModel(
  model: BDSchemaModel,
  allModels: BDSchemaModel[],
): string {
  const name = modelName(model);
  const lines: string[] = [`model ${name} {`];

  for (const property of model.properties) {
    if (!property.name.trim()) continue;
    lines.push(prismaProperty(property));
  }

  for (const relation of model.relations) {
    const line = prismaRelation(relation, allModels);
    if (line) lines.push(line);
  }

  for (const index of model.indexes) {
    if (index.columns.length === 0) continue;
    const cols = `[${index.columns.join(", ")}]`;
    if (index.type === BDSchemaIndexType.unique) lines.push(`  @@unique(${cols})`);
    else if (index.type === BDSchemaIndexType.primary) lines.push(`  @@id(${cols})`);
    else if (index.type === BDSchemaIndexType.fulltext)
      lines.push(`  // fulltext index on ${cols} (provider-specific)`);
    else if (index.type === BDSchemaIndexType.spatial)
      lines.push(`  // spatial index on ${cols} (provider-specific)`);
    else lines.push(`  @@index(${cols})`);
  }

  if (model.timestamps) {
    lines.push("  createdAt DateTime @default(now())");
    lines.push("  updatedAt DateTime @updatedAt");
  }
  if (model.softDeletes) {
    lines.push("  deletedAt DateTime?");
  }

  lines.push(`  @@map("${model.table.trim() || slugifyTable(name)}")`);
  lines.push("}");
  return lines.join("\n");
}

/** Build a complete Prisma schema document. */
export function toPrismaSchema(
  models: BDSchemaModel[],
  provider = "postgresql",
): string {
  const header = [
    "// Generated by BunnyDev — Prisma schema export.",
    "",
    "generator client {",
    '  provider = "prisma-client-js"',
    "}",
    "",
    "datasource db {",
    `  provider = "${provider}"`,
    '  url      = env("DATABASE_URL")',
    "}",
    "",
  ].join("\n");

  const body = models
    .map((model) => toPrismaModel(model, models))
    .join("\n\n");

  return `${header}${body}\n`;
}

/** Build a plain TypeScript interface file ("model builder") from models. */
export function toModelBuilderFile(models: BDSchemaModel[]): string {
  const blocks = models.map((model) => {
    const lines = [`export interface ${modelName(model)} {`];
    for (const property of model.properties) {
      if (!property.name.trim()) continue;
      const optional = property.nullable ? "?" : "";
      const type = TS_SCALAR[property.type] ?? "unknown";
      lines.push(`  ${property.name}${optional}: ${type};`);
    }
    if (model.timestamps) {
      lines.push("  createdAt: string;");
      lines.push("  updatedAt: string;");
    }
    if (model.softDeletes) lines.push("  deletedAt?: string | null;");
    lines.push("}");
    return lines.join("\n");
  });

  return `// Generated by BunnyDev — model builder export.\n\n${blocks.join(
    "\n\n",
  )}\n`;
}
