// BDDiagram.Types.ts — diagram form shapes, node/edge factories, and the
// Mermaid serializer that turns stored nodes/edges into Mermaid source.

import type {
  BDDiagramDirection,
  BDDiagramEdge,
  BDDiagramNode,
  BDDiagramRecord,
  BDDiagramType,
} from "./BDDiagram.Domain";

export interface BDDiagramForm {
  name: string;
  type: BDDiagramType;
  direction: BDDiagramDirection;
}

/** The full set of diagram types supported by the builder. */
export const BD_DIAGRAM_TYPES: BDDiagramType[] = [
  "flowchart",
  "sequence",
  "class",
  "state",
  "er",
  "gantt",
  "pie",
  "mindmap",
  "timeline",
  "journey",
  "gitgraph",
  "c4",
  "block",
  "requirement",
];

export const BD_DIAGRAM_TYPE_OPTIONS = BD_DIAGRAM_TYPES.map((t) => ({
  label: t,
  value: t,
}));

export const BD_DIAGRAM_DIRECTION_OPTIONS: {
  label: string;
  value: BDDiagramDirection;
}[] = [
  { label: "Top → Bottom", value: "TB" },
  { label: "Top down (TD)", value: "TD" },
  { label: "Bottom → Top", value: "BT" },
  { label: "Right → Left", value: "RL" },
  { label: "Left → Right", value: "LR" },
];

const DEFAULT_KIND: Record<BDDiagramType, string> = {
  flowchart: "process",
  sequence: "participant",
  class: "class",
  state: "state",
  er: "entity",
  gantt: "task",
  pie: "slice",
  mindmap: "leaf",
  timeline: "event",
  journey: "task",
  gitgraph: "commit",
  c4: "system",
  block: "block",
  requirement: "requirement",
};

export function safeMermaidId(id: string): string {
  const clean = id.replace(/[^A-Za-z0-9_]/g, "_");
  return /^[0-9]/.test(clean) ? `n_${clean}` : clean || "node";
}

export function createDiagramNode(
  id: string,
  label: string,
  type: BDDiagramType,
): BDDiagramNode {
  return {
    id,
    label,
    diagram: type,
    kind: DEFAULT_KIND[type],
  } as unknown as BDDiagramNode;
}

export function createDiagramEdge(
  source: string,
  target: string,
  label = "",
): BDDiagramEdge {
  return { id: `${source}-${target}`, source, target, label: label || undefined };
}

export function toDiagramForm(diagram: BDDiagramRecord): BDDiagramForm {
  return {
    name: diagram.name,
    type: diagram.type,
    direction: diagram.direction ?? "TB",
  };
}

function escapeLabel(label: string): string {
  return label.replace(/"/g, "'");
}

/**
 * Serialize a diagram's nodes/edges into Mermaid source.
 *
 * A raw override in `diagram.meta.mermaid` (edited directly or produced by AI)
 * always wins, so users can hand-tune Mermaid the UI cannot express.
 */
export function toMermaid(diagram: BDDiagramRecord): string {
  const override = diagram.meta?.mermaid;
  if (typeof override === "string" && override.trim()) return override;

  const nodes = diagram.nodes ?? [];
  const edges = diagram.edges ?? [];
  const labelOf = (id: string) =>
    nodes.find((n) => n.id === id)?.label ?? id;

  switch (diagram.type) {
    case "sequence": {
      const lines = ["sequenceDiagram"];
      for (const node of nodes) {
        lines.push(`  participant ${safeMermaidId(node.id)} as ${node.label}`);
      }
      for (const edge of edges) {
        lines.push(
          `  ${safeMermaidId(edge.source)}->>${safeMermaidId(edge.target)}: ${
            edge.label ?? ""
          }`.trimEnd(),
        );
      }
      return lines.join("\n");
    }

    case "class": {
      const lines = ["classDiagram"];
      for (const node of nodes) {
        lines.push(`  class ${safeMermaidId(node.id)} {`);
        lines.push(`    ${node.label}`);
        lines.push("  }");
      }
      for (const edge of edges) {
        lines.push(
          `  ${safeMermaidId(edge.source)} --> ${safeMermaidId(edge.target)}${
            edge.label ? ` : ${edge.label}` : ""
          }`,
        );
      }
      return lines.join("\n");
    }

    case "state": {
      const lines = ["stateDiagram-v2"];
      for (const edge of edges) {
        lines.push(
          `  ${safeMermaidId(edge.source)} --> ${safeMermaidId(edge.target)}${
            edge.label ? ` : ${edge.label}` : ""
          }`,
        );
      }
      for (const node of nodes) {
        if (!edges.some((e) => e.source === node.id || e.target === node.id)) {
          lines.push(`  ${safeMermaidId(node.id)} : ${node.label}`);
        }
      }
      return lines.join("\n");
    }

    case "er": {
      const lines = ["erDiagram"];
      for (const node of nodes) {
        lines.push(`  ${safeMermaidId(node.id)} {`);
        lines.push("    string id");
        lines.push(`    string ${safeMermaidId(node.label || "name")}`);
        lines.push("  }");
      }
      for (const edge of edges) {
        lines.push(
          `  ${safeMermaidId(edge.source)} ||--o{ ${safeMermaidId(edge.target)} : ${
            edge.label ?? "relates"
          }`,
        );
      }
      return lines.join("\n");
    }

    case "mindmap": {
      const lines = ["mindmap"];
      const incoming = new Set(edges.map((e) => e.target));
      const roots = nodes.filter((n) => !incoming.has(n.id));
      const childrenOf = (id: string) =>
        edges.filter((e) => e.source === id).map((e) => e.target);
      const walk = (id: string, depth: number) => {
        lines.push(`${"  ".repeat(depth + 1)}${escapeLabel(labelOf(id))}`);
        for (const child of childrenOf(id)) walk(child, depth + 1);
      };
      for (const root of roots.length > 0 ? roots : nodes) {
        walk(root.id, 0);
      }
      return lines.join("\n");
    }

    case "pie": {
      const lines = ["pie", `  title ${diagram.name}`];
      for (const node of nodes) {
        const value = (node as { value?: number }).value ?? 10;
        lines.push(`  "${escapeLabel(node.label)}" : ${value}`);
      }
      return lines.join("\n");
    }

    case "journey": {
      const lines = ["journey", `  title ${diagram.name}`];
      for (const node of nodes) {
        lines.push(`  section ${escapeLabel(node.label)}`);
        lines.push(`    Task: 5: Actor`);
      }
      return lines.join("\n");
    }

    case "timeline": {
      const lines = ["timeline", `  title ${diagram.name}`];
      for (const node of nodes) {
        lines.push(`  ${escapeLabel(node.label)} : event`);
      }
      return lines.join("\n");
    }

    case "gantt": {
      const lines = ["gantt", `  title ${diagram.name}`, "  dateFormat YYYY-MM-DD"];
      for (const node of nodes) {
        lines.push(`  ${escapeLabel(node.label)} :t1, 2024-01-01, 7d`);
      }
      return lines.join("\n");
    }

    case "gitgraph": {
      const lines = ["gitGraph"];
      for (const node of nodes) {
        lines.push(`  commit id: "${safeMermaidId(node.id)}"`);
      }
      return lines.join("\n");
    }

    case "c4": {
      const lines = ["C4Context", `  title ${diagram.name}`];
      for (const node of nodes) {
        lines.push(`  System(${safeMermaidId(node.id)}, "${escapeLabel(node.label)}")`);
      }
      return lines.join("\n");
    }

    case "block": {
      const lines = ["block-beta", `  columns 3`];
      for (const node of nodes) {
        lines.push(`  ${safeMermaidId(node.id)}["${escapeLabel(node.label)}"]`);
      }
      return lines.join("\n");
    }

    case "requirement": {
      const lines = ["requirementDiagram"];
      for (const node of nodes) {
        lines.push(`  requirement ${safeMermaidId(node.id)} {`);
        lines.push(`    id: 1`);
        lines.push(`    text: ${escapeLabel(node.label)}`);
        lines.push("    risk: low");
        lines.push("    verifymethod: test");
        lines.push("  }");
      }
      return lines.join("\n");
    }

    case "flowchart":
    default: {
      const direction = diagram.direction ?? "TB";
      const lines = [`flowchart ${direction}`];
      for (const node of nodes) {
        lines.push(`  ${safeMermaidId(node.id)}["${escapeLabel(node.label)}"]`);
      }
      for (const edge of edges) {
        lines.push(
          `  ${safeMermaidId(edge.source)}${
            edge.label ? ` -->|${escapeLabel(edge.label)}| ` : " --> "
          }${safeMermaidId(edge.target)}`,
        );
      }
      return lines.join("\n");
    }
  }
}

// ── AI artifact drafts ─────────────────────────────────────────────────────

export interface BDDiagramNodeDraft {
  id?: string;
  label: string;
}

export interface BDDiagramEdgeDraft {
  source: string;
  target: string;
  label?: string;
}

export interface BDDiagramDraft {
  name: string;
  type: BDDiagramType;
  direction?: BDDiagramDirection;
  nodes: BDDiagramNodeDraft[];
  edges?: BDDiagramEdgeDraft[];
  mermaid?: string;
}

export interface BDDiagramArtifact {
  diagrams: BDDiagramDraft[];
}
