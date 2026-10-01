"use server";

// BDDiagramBuilder.Server — one-shot AI diagram generation via Helix.
//
// Produces complete diagram drafts (nodes + edges + optional raw Mermaid) that
// the client stores as a pending proposal and applies all-or-nothing.

import type { BDGenerationMode } from "../../BDDomain.Types";
import type { HelixAISchemaOptions } from "@/src/modules/helix/src/HelixAISchemaTypes";
import {
  bdGenerateStructured,
  type BDAIConfigOverride,
} from "../agent-manager/BDGeneration.Server";
import type {
  BDDiagramArtifact,
  BDDiagramDraft,
  BDDiagramEdgeDraft,
  BDDiagramNodeDraft,
} from "./BDDiagram.Types";

export interface BDDiagramGenerateParams {
  instruction: string;
  mode: BDGenerationMode;
  aiConfig?: BDAIConfigOverride;
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

function normalizeDiagram(raw: unknown): BDDiagramDraft | null {
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
  return {
    name,
    type: (asString(d.type) || "flowchart") as BDDiagramDraft["type"],
    direction: (asString(d.direction) || "TB") as BDDiagramDraft["direction"],
    nodes,
    edges,
    mermaid: asString(d.mermaid) || undefined,
  };
}

export async function bdGenerateDiagram(
  params: BDDiagramGenerateParams,
): Promise<BDDiagramArtifact> {
  const system =
    "You are a senior software architect who communicates with clear Mermaid " +
    "diagrams. Prefer concise node ids and readable labels. Return only the " +
    "structured JSON requested.";

  const user = `Mode: ${params.mode}.\n\nInstruction: ${params.instruction}`;

  const raw = await bdGenerateStructured({
    system,
    user,
    schema: DIAGRAM_DSL,
    aiConfig: params.aiConfig,
    temperature: 0.3,
  });

  const diagramsRaw = Array.isArray(raw.diagrams) ? raw.diagrams : [];
  const diagrams = diagramsRaw
    .map(normalizeDiagram)
    .filter((d): d is BDDiagramDraft => d !== null);

  return { diagrams };
}
