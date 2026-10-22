"use server";

// BDDiagramBuilder.Server — one-shot AI diagram generation via Helix.
//
// Produces complete diagram drafts (nodes + edges + optional raw Mermaid) that
// the client stores as a pending proposal and applies all-or-nothing.

import type { BDGenerationMode } from "../../BDDomain.Types";
import type { BDDiagramType } from "./BDDiagram.Domain";
import type { HelixAISchemaOptions } from "@/src/modules/helix/src/HelixAISchemaTypes";
import {
  bdGenerateStructured,
  type BDAIConfigOverride,
} from "../agent-manager/BDGeneration.Server";
import { bdBuildModeUser } from "../agent-manager/BDGeneration.Mode";
import {
  BD_DIAGRAM_TYPES,
  BD_MAX_DIAGRAMS,
  type BDDiagramArtifact,
  type BDDiagramBatchMode,
  type BDDiagramCreation,
  type BDDiagramDraft,
  type BDDiagramEdgeDraft,
  type BDDiagramNodeDraft,
} from "./BDDiagram.Types";

export interface BDDiagramGenerateParams {
  instruction: string;
  mode: BDGenerationMode;
  targetContext?: string;
  /** Single diagram vs a batch of diagrams. */
  creation: BDDiagramCreation;
  /** Single creation: the type of the one diagram to generate. */
  diagramType?: BDDiagramType;
  /** Batch creation sub-mode. */
  batchMode?: BDDiagramBatchMode;
  /** Batch "auto": total number of diagrams; the AI picks the types. */
  count?: number;
  /** Batch "types": the allowed diagram types. */
  types?: BDDiagramType[];
  /** Batch "types": desired count per diagram type. */
  counts?: Partial<Record<BDDiagramType, number>>;
  aiConfig?: BDAIConfigOverride;
}

/** Clamp a requested diagram count into a positive whole number. */
function clampCount(value: number | undefined, fallback: number): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(n, BD_MAX_DIAGRAMS);
}

const DIAGRAM_DSL: HelixAISchemaOptions = {
  name: "diagram_artifact",
  description: "One or more diagrams with nodes and edges.",
  properties: {
    diagrams: {
      type: "array",
      description: "Generated diagrams.",
      items: {
        type: "object",
        description: "A diagram.",
        properties: {
          name: { type: "string", description: "Diagram name." },
          type: {
            type: "string",
            description:
              "One of: flowchart, sequence, class, state, er, mindmap, timeline, journey, gantt, pie, gitgraph, c4, block, requirement.",
          },
          direction: {
            type: "string",
            description: "Flow direction: TB, TD, BT, RL or LR.",
          },
          nodes: {
            type: "array",
            description: "Nodes/participants/entities.",
            items: {
              type: "object",
              description:
                "A node. Populate the fields that match the diagram type " +
                "(e.g. flowchart: kind/shape; er: fields; gantt: start/duration).",
              properties: {
                id: { type: "string", description: "Stable id." },
                label: { type: "string", description: "Display label." },
                kind: {
                  type: "string",
                  description:
                    "Type-specific node kind (process, participant, entity, slice, task, commit, system, block, requirement, …).",
                },
                shape: {
                  type: "string",
                  description:
                    "Flowchart/mindmap shape (rectangle, rounded, stadium, rhombus, hexagon, cylinder, …).",
                },
                link: { type: "string", description: "Flowchart click URL." },
                alias: { type: "string", description: "Sequence participant alias." },
                order: { type: "number", description: "Sequence order." },
                value: { type: "number", description: "Pie slice value." },
                start: { type: "string", description: "Gantt start (YYYY-MM-DD)." },
                duration: { type: "string", description: "Gantt duration (e.g. 7d)." },
                end: { type: "string", description: "Gantt end (YYYY-MM-DD)." },
                status: { type: "string", description: "Gantt status (done, active, crit, milestone)." },
                dependsOn: {
                  type: "array",
                  description: "Gantt task ids this task depends on.",
                  items: { type: "string", description: "Task id." },
                },
                section: { type: "string", description: "Gantt/journey section." },
                period: { type: "string", description: "Timeline period." },
                events: {
                  type: "array",
                  description: "Timeline period events.",
                  items: { type: "string", description: "Event." },
                },
                score: { type: "number", description: "Journey score (1-5)." },
                actors: {
                  type: "array",
                  description: "Journey actors.",
                  items: { type: "string", description: "Actor." },
                },
                branch: { type: "string", description: "Git branch." },
                tag: { type: "string", description: "Git tag." },
                commitId: { type: "string", description: "Git commit id." },
                parent: { type: "string", description: "Git parent commit id." },
                technology: { type: "string", description: "C4 technology." },
                description: { type: "string", description: "C4 description." },
                external: { type: "boolean", description: "C4 external system." },
                boundary: { type: "string", description: "C4 boundary." },
                columns: { type: "number", description: "Block columns." },
                width: { type: "number", description: "Block width." },
                requirementId: { type: "string", description: "Requirement id." },
                text: { type: "string", description: "Requirement text." },
                risk: { type: "string", description: "Requirement risk (low, medium, high)." },
                verifyMethod: {
                  type: "string",
                  description: "Requirement verify method (analysis, demonstration, inspection, test).",
                },
                fields: {
                  type: "array",
                  description: "ER entity fields.",
                  items: {
                    type: "object",
                    description: "An ER field.",
                    properties: {
                      name: { type: "string", description: "Field name." },
                      type: { type: "string", description: "Field type." },
                      key: { type: "string", description: "PK, FK or UK." },
                      nullable: { type: "boolean", description: "Nullable." },
                      comment: { type: "string", description: "Comment." },
                    },
                  },
                },
                attributes: {
                  type: "array",
                  description: "Class attributes.",
                  items: {
                    type: "object",
                    description: "A class member.",
                    properties: {
                      name: { type: "string", description: "Member name." },
                      type: { type: "string", description: "Member type." },
                      visibility: { type: "string", description: "+, -, # or ~." },
                    },
                  },
                },
                methods: {
                  type: "array",
                  description: "Class methods.",
                  items: {
                    type: "object",
                    description: "A class member.",
                    properties: {
                      name: { type: "string", description: "Member name." },
                      type: { type: "string", description: "Return type." },
                      visibility: { type: "string", description: "+, -, # or ~." },
                    },
                  },
                },
              },
            },
          },
          edges: {
            type: "array",
            description: "Edges between node ids.",
            items: {
              type: "object",
              description: "An edge.",
              properties: {
                source: { type: "string", description: "Source node id." },
                target: { type: "string", description: "Target node id." },
                label: { type: "string", description: "Edge label." },
              },
            },
          },
          mermaid: {
            type: "string",
            description: "Optional raw Mermaid source that overrides nodes/edges.",
          },
        },
      },
    },
  },
};

/**
 * Clone the base DSL, stating the exact number of diagrams the `diagrams`
 * array must contain. `doChatStructuredFallback` embeds this schema in the
 * prompt, so the count becomes an explicit schema-level constraint the model
 * sees alongside the instruction.
 */
function buildDiagramDsl(expectedCount: number): HelixAISchemaOptions {
  const diagrams = DIAGRAM_DSL.properties.diagrams;
  return {
    ...DIAGRAM_DSL,
    properties: {
      ...DIAGRAM_DSL.properties,
      diagrams: {
        ...diagrams,
        description:
          `Generated diagrams. The array MUST contain exactly ${expectedCount} ` +
          `diagram object${expectedCount === 1 ? "" : "s"} — no more, no fewer.`,
      },
    },
  };
}

/** Instruction fragment that hard-requires an exact array length. */
function batchCountRule(total: number): string {
  return (
    `CRITICAL: the "diagrams" array MUST contain exactly ${total} ` +
    `object${total === 1 ? "" : "s"} — not fewer, not more. Number them ` +
    `1..${total} and verify the array length is ${total} before returning. ` +
    `If the topic seems better served by fewer diagrams, still split it into ` +
    `${total} distinct diagrams.`
  );
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizeNode(raw: unknown, index: number): BDDiagramNodeDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const n = raw as Record<string, unknown>;
  const label = asString(n.label) || asString(n.id) || `node${index + 1}`;
  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(n)) {
    if (key === "id" || key === "label") continue;
    if (value === undefined || value === "") continue;
    data[key] = value;
  }
  return {
    id: asString(n.id) || `n${index + 1}`,
    label,
    data: Object.keys(data).length > 0 ? data : undefined,
  };
}

function normalizeEdge(raw: unknown): BDDiagramEdgeDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as Record<string, unknown>;
  const source = asString(e.source);
  const target = asString(e.target);
  if (!source || !target) return null;
  return { source, target, label: asString(e.label) || undefined };
}

function normalizeDiagram(
  raw: unknown,
  fallbackType: BDDiagramType,
  allowedTypes: readonly BDDiagramType[],
): BDDiagramDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  const name = asString(d.name) || "Diagram";
  const nodes = Array.isArray(d.nodes)
    ? d.nodes
        .map((n, i) => normalizeNode(n, i))
        .filter((n): n is BDDiagramNodeDraft => n !== null)
    : [];
  const edges = Array.isArray(d.edges)
    ? d.edges
        .map(normalizeEdge)
        .filter((e): e is BDDiagramEdgeDraft => e !== null)
    : [];
  const requested = asString(d.type) as BDDiagramType;
  const type = allowedTypes.includes(requested) ? requested : fallbackType;
  return {
    name,
    type,
    direction: (asString(d.direction) || "TB") as BDDiagramDraft["direction"],
    nodes,
    edges,
    mermaid: asString(d.mermaid) || undefined,
  };
}

/** System prompt shared by every diagram generation pass. */
const DIAGRAM_SYSTEM =
  "You are a senior software architect who communicates with clear Mermaid " +
  "diagrams. Prefer concise node ids and readable labels. Return only the " +
  "structured JSON requested.";

/**
 * How many AI passes a batch may take to reach its requested diagram count.
 * LLMs under-fill arrays unpredictably, so we re-ask for what is still missing.
 */
const MAX_BATCH_ATTEMPTS = 3;

/** The per-type / total budget a batch request must satisfy. */
interface BDDiagramBatchTarget {
  /** True when the user gave only a total and the AI picks the types. */
  auto: boolean;
  total: number;
  perType: Partial<Record<BDDiagramType, number>>;
  allowedTypes: BDDiagramType[];
  fallbackType: BDDiagramType;
}

/** Compute the per-type / total budget for a batch request. */
function buildBatchTarget(
  params: BDDiagramGenerateParams,
): BDDiagramBatchTarget {
  if (params.batchMode === "types") {
    const requested = (params.types ?? []).filter((t) =>
      BD_DIAGRAM_TYPES.includes(t),
    );
    const selected = requested.length > 0 ? requested : BD_DIAGRAM_TYPES;
    const counts = params.counts ?? {};
    const perType: Partial<Record<BDDiagramType, number>> = {};
    let remaining = BD_MAX_DIAGRAMS;
    for (const type of selected) {
      const wanted = Math.min(clampCount(counts[type], 1), remaining);
      if (wanted <= 0) break;
      perType[type] = wanted;
      remaining -= wanted;
    }
    const total = (Object.values(perType) as number[]).reduce(
      (sum, n) => sum + n,
      0,
    );
    return {
      auto: false,
      total,
      perType,
      allowedTypes: selected,
      fallbackType: selected[0],
    };
  }

  return {
    auto: true,
    total: clampCount(params.count, 3),
    perType: {},
    allowedTypes: [...BD_DIAGRAM_TYPES],
    fallbackType: "flowchart",
  };
}

function countByType(
  diagrams: BDDiagramDraft[],
): Partial<Record<BDDiagramType, number>> {
  const counts: Partial<Record<BDDiagramType, number>> = {};
  for (const diagram of diagrams) {
    counts[diagram.type] = (counts[diagram.type] ?? 0) + 1;
  }
  return counts;
}

/** How many diagrams (overall and per type) are still missing. */
function missingFor(
  collected: BDDiagramDraft[],
  target: BDDiagramBatchTarget,
): { total: number; perType: Partial<Record<BDDiagramType, number>> } {
  if (target.auto) {
    return {
      total: Math.max(0, target.total - collected.length),
      perType: {},
    };
  }
  const counts = countByType(collected);
  const perType: Partial<Record<BDDiagramType, number>> = {};
  let total = 0;
  for (const [type, wanted] of Object.entries(target.perType) as [
    BDDiagramType,
    number,
  ][]) {
    const missing = Math.max(0, wanted - (counts[type] ?? 0));
    if (missing > 0) {
      perType[type] = missing;
      total += missing;
    }
  }
  return { total, perType };
}

/** Keep only up to the target count, trimming per type for "types" mode. */
function trimToTarget(
  collected: BDDiagramDraft[],
  target: BDDiagramBatchTarget,
): BDDiagramDraft[] {
  if (target.auto) return collected.slice(0, target.total);
  const counts: Partial<Record<BDDiagramType, number>> = {};
  const out: BDDiagramDraft[] = [];
  for (const diagram of collected) {
    const wanted = target.perType[diagram.type] ?? 0;
    const have = counts[diagram.type] ?? 0;
    if (have < wanted) {
      out.push(diagram);
      counts[diagram.type] = have + 1;
    }
  }
  return out;
}

/** Run one structured generation pass and normalize its diagrams. */
async function runDiagramPass(args: {
  params: BDDiagramGenerateParams;
  context: string;
  expected: number;
  fallbackType: BDDiagramType;
  allowedTypes: readonly BDDiagramType[];
}): Promise<BDDiagramDraft[]> {
  const { params, context, expected, fallbackType, allowedTypes } = args;
  const user = bdBuildModeUser({
    mode: params.mode,
    instruction: params.instruction,
    targetContext: params.targetContext,
    context,
  });
  const raw = await bdGenerateStructured({
    system: DIAGRAM_SYSTEM,
    user,
    schema: buildDiagramDsl(expected),
    aiConfig: params.aiConfig,
    temperature: 0.2,
  });
  const entries = Array.isArray(raw.diagrams) ? raw.diagrams : [];
  return entries
    .map((entry) => normalizeDiagram(entry, fallbackType, allowedTypes))
    .filter((diagram): diagram is BDDiagramDraft => diagram !== null);
}

/** Prompt context for the first batch pass. */
function batchContext(target: BDDiagramBatchTarget): string {
  if (target.auto) {
    return (
      `Generate exactly ${target.total} diagrams. Choose the most appropriate ` +
      `types from: ${BD_DIAGRAM_TYPES.join(", ")}. ${batchCountRule(
        target.total,
      )} Populate each node's fields to match its diagram type.`
    );
  }
  const lines = (Object.entries(target.perType) as [BDDiagramType, number][])
    .map(([type, count]) => `  - ${type}: ${count}`)
    .join("\n");
  return (
    `Generate exactly ${target.total} diagrams with these per-type counts:\n` +
    `${lines}\nUse ONLY these types: ${target.allowedTypes.join(", ")}. ` +
    `${batchCountRule(target.total)} Populate each node's fields to match its ` +
    `diagram type.`
  );
}

/** Prompt context for a top-up pass that fills the remaining diagrams. */
function topUpContext(
  target: BDDiagramBatchTarget,
  collected: BDDiagramDraft[],
  missing: { total: number; perType: Partial<Record<BDDiagramType, number>> },
): string {
  const produced = collected.length
    ? collected.map((d, i) => `  ${i + 1}. ${d.name} (${d.type})`).join("\n")
    : "  (none)";
  const request = target.auto
    ? `Produce exactly ${missing.total} MORE diagrams, choosing types from: ` +
      `${BD_DIAGRAM_TYPES.join(", ")}.`
    : `Produce these still-missing diagrams:\n${(
        Object.entries(missing.perType) as [BDDiagramType, number][]
      )
        .map(([type, count]) => `  - ${type}: ${count}`)
        .join("\n")}\nUse ONLY these types: ${target.allowedTypes.join(", ")}.`;
  return (
    `Diagrams already produced:\n${produced}\n\n${request}\n` +
    `${batchCountRule(missing.total)} Return ONLY the new diagrams in ` +
    `"diagrams" — do NOT repeat any diagram listed above; each new diagram ` +
    `must be distinct from those.`
  );
}

export async function bdGenerateDiagram(
  params: BDDiagramGenerateParams,
): Promise<BDDiagramArtifact> {
  const creation: BDDiagramCreation = params.creation ?? "single";

  if (creation === "single") {
    const type = params.diagramType ?? "flowchart";
    const context =
      `Generate exactly ONE diagram. Produce it as a ${type} diagram and set ` +
      `the diagram's "type" field to "${type}". Populate each node's fields to ` +
      `match that type (e.g. flowchart: kind/shape; er: fields; gantt: ` +
      `start/duration; pie: value).`;
    const pass = await runDiagramPass({
      params,
      context,
      expected: 1,
      fallbackType: type,
      allowedTypes: [type],
    });
    return { diagrams: pass.slice(0, 1) };
  }

  const target = buildBatchTarget(params);
  const collected: BDDiagramDraft[] = [];

  for (let attempt = 0; attempt < MAX_BATCH_ATTEMPTS; attempt++) {
    const missing = missingFor(collected, target);
    if (missing.total <= 0) break;
    let pass: BDDiagramDraft[];
    try {
      pass = await runDiagramPass({
        params,
        context:
          attempt === 0
            ? batchContext(target)
            : topUpContext(target, collected, missing),
        expected: missing.total,
        fallbackType: target.fallbackType,
        allowedTypes: target.allowedTypes,
      });
    } catch (error) {
      // The first pass surfaces its error; a failed top-up keeps what we have.
      if (attempt === 0) throw error;
      break;
    }
    collected.push(...pass);
  }

  const diagrams = trimToTarget(collected, target);
  if (diagrams.length === 0) {
    throw new Error(
      "The AI did not return any usable diagrams. Please adjust the " +
        "instruction and try again.",
    );
  }
  return { diagrams };
}
