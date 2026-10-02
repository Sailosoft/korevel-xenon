// BDErdExport.ts — turn schema models into a Mermaid `erDiagram` source and a
// persisted Diagram Builder record for the ERD viewer.
//
// Pure functions (no Dexie / browser access) so they can run on either side.

import type {
  BDSchemaGroup,
  BDSchemaModel,
  BDSchemaProperty,
  BDSchemaRelation,
  BDDiagramRecord,
  BDERField,
  BDERNode,
  BDDiagramEdge,
} from "../../BDDomain.Types";
import type { BDCreateInput } from "../../BDRepository";
import { BDSchemaRelationType } from "../../BDDomain.Types";
import { safeMermaidId } from "../diagram-builder/BDDiagram.Types";

/** Display name for an entity — falls back so an unnamed draft still exports. */
function entityName(model: BDSchemaModel): string {
  return model.name.trim() || model.table.trim() || "Model";
}

/** Mermaid ER relationship labels must be `[a-z0-9_]`. */
function relationLabel(name: string): string {
  const clean = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return clean || "relates";
}

/** Mermaid ER cardinality operators, keyed by schema relation type. */
const CARDINALITY: Record<
  BDSchemaRelationType,
  { left: string; right: string }
> = {
  [BDSchemaRelationType.belongsTo]: { left: "}o", right: "||" },
  [BDSchemaRelationType.morphTo]: { left: "}o", right: "||" },
  [BDSchemaRelationType.hasOne]: { left: "||", right: "o|" },
  [BDSchemaRelationType.morphOne]: { left: "||", right: "o|" },
  [BDSchemaRelationType.hasMany]: { left: "||", right: "o{" },
  [BDSchemaRelationType.morphMany]: { left: "||", right: "o{" },
  [BDSchemaRelationType.hasManyThrough]: { left: "||", right: "o{" },
  [BDSchemaRelationType.belongsToMany]: { left: "}o", right: "o{" },
};

/** Unique Mermaid entity ids per model — collisions get `_2`, `_3`, … suffixes. */
function entityIds(models: BDSchemaModel[]): Map<string, string> {
  const used = new Set<string>();
  const ids = new Map<string, string>();
  for (const model of models) {
    const fromTable = safeMermaidId(model.table.trim());
    const fromName = safeMermaidId(model.name.trim());
    const base =
      fromTable !== "node"
        ? fromTable
        : fromName !== "node"
          ? fromName
          : "model";
    let id = base;
    let suffix = 2;
    while (used.has(id)) {
      id = `${base}_${suffix}`;
      suffix += 1;
    }
    used.add(id);
    ids.set(model.id, id);
  }
  return ids;
}

/** `PK` / `FK` / `UK` key marker for one column (Mermaid allows a single key). */
function attributeKey(
  model: BDSchemaModel,
  property: BDSchemaProperty,
  foreignKeys: Set<string>,
): "PK" | "FK" | "UK" | null {
  if (property.primary || model.primaryKey.includes(property.name)) return "PK";
  if (foreignKeys.has(property.name)) return "FK";
  if (property.unique) return "UK";
  return null;
}

/** Foreign key column names declared by a model's relations. */
function foreignKeyNames(model: BDSchemaModel): Set<string> {
  const keys = new Set<string>();
  for (const relation of model.relations) {
    const key = relation.foreignKey?.trim();
    if (key) keys.add(key);
  }
  return keys;
}

/** Optional quoted comment for one column (Mermaid attribute comment slot). */
function attributeComment(property: BDSchemaProperty): string | null {
  const comment = property.comment?.trim();
  if (comment) return `"${comment.replace(/"/g, "'")}"`;
  if (property.nullable && !property.primary) return '"nullable"';
  return null;
}

/** Attribute lines for one model, or `null` when the entity has no columns. */
function entityAttributes(
  model: BDSchemaModel,
  foreignKeys: Set<string>,
): string[] | null {
  const attrs: string[] = [];
  for (const property of model.properties) {
    if (!property.name.trim()) continue;
    const key = attributeKey(model, property, foreignKeys);
    const comment = attributeComment(property);
    const column = property.name.trim().replace(/[^A-Za-z0-9_]/g, "_");
    attrs.push(
      `    ${property.type} ${column}${key ? ` ${key}` : ""}${
        comment ? ` ${comment}` : ""
      }`,
    );
  }
  return attrs.length > 0 ? attrs : null;
}

interface ErdEdge {
  source: string;
  target: string;
  label: string;
  type: BDSchemaRelationType;
}

/**
 * Relationship edges among the given models. Relations pointing outside the
 * group (or with no target) are skipped; duplicates collapse by key.
 */
function collectEdges(
  models: BDSchemaModel[],
  ids: Map<string, string>,
): ErdEdge[] {
  const byId = new Map(models.map((model) => [model.id, model]));
  const seen = new Set<string>();
  const edges: ErdEdge[] = [];

  const push = (model: BDSchemaModel, relation: BDSchemaRelation) => {
    const target = byId.get(relation.targetModelId);
    if (!target) return;
    const sourceId = ids.get(model.id);
    const targetId = ids.get(target.id);
    if (!sourceId || !targetId || sourceId === targetId) return;
    const label = relationLabel(relation.name);
    const key = `${sourceId}|${targetId}|${label}`;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push({ source: sourceId, target: targetId, label, type: relation.type });
  };

  for (const model of models) {
    for (const relation of model.relations) push(model, relation);
  }
  return edges;
}

/** Mermaid `erDiagram` source for a group's models. Empty string when blank. */
export function toErdMermaid(models: BDSchemaModel[]): string {
  if (models.length === 0) return "";

  const ids = entityIds(models);
  const lines = ["erDiagram"];

  for (const model of models) {
    const id = ids.get(model.id);
    if (!id) continue;
    const attrs = entityAttributes(model, foreignKeyNames(model));
    if (!attrs) {
      lines.push(`  ${id}`);
      continue;
    }
    lines.push(`  ${id} {`);
    lines.push(...attrs);
    lines.push("  }");
  }

  for (const edge of collectEdges(models, ids)) {
    const { left, right } = CARDINALITY[edge.type];
    lines.push(
      `  ${edge.source} ${left}--${right} ${edge.target} : ${edge.label}`,
    );
  }

  return lines.join("\n");
}

/** Persisted Diagram Builder payload for a group's ERD. */
export function buildErdDiagramRecord(
  group: BDSchemaGroup,
  models: BDSchemaModel[],
): BDCreateInput<BDDiagramRecord> {
  const ids = entityIds(models);

  const nodes: BDERNode[] = models.map((model) => {
    const foreignKeys = foreignKeyNames(model);
    const fields: BDERField[] = model.properties
      .filter((property) => property.name.trim())
      .map((property) => ({
        name: property.name.trim(),
        type: property.type,
        key: attributeKey(model, property, foreignKeys) ?? undefined,
        nullable: property.nullable,
        comment: property.comment,
      }));
    return {
      id: ids.get(model.id) ?? safeMermaidId(model.name),
      label: entityName(model),
      diagram: "er",
      kind: "entity",
      fields,
    };
  });

  const edges: BDDiagramEdge[] = collectEdges(models, ids).map((edge) => ({
    id: `${edge.source}-${edge.target}-${edge.label}`,
    source: edge.source,
    target: edge.target,
    label: edge.label,
  }));

  const mermaid = toErdMermaid(models);

  return {
    projectId: group.projectId,
    name: `${group.name.trim() || "Schema"} ERD`,
    type: "er",
    render: "mermaid",
    direction: "TB",
    nodes,
    edges,
    meta: mermaid ? { mermaid } : undefined,
  };
}
