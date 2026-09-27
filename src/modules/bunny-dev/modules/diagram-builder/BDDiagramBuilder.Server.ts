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
              description: "A node.",
              properties: {
                id: { type: "string", description: "Stable id." },
                label: { type: "string", description: "Display label." },
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
  return { id: asString(n.id) || `n${index + 1}`, label };
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
