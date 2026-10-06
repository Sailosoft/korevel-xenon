// BDDiagram.Types.ts — diagram form shapes, node/edge factories, and the
// Mermaid serializer that turns stored nodes/edges into Mermaid source.

import type { BDFormField } from "../../components/BDForm";
import type {
  BDC4Node,
  BDClassNode,
  BDDiagramDirection,
  BDDiagramEdge,
  BDDiagramGroup,
  BDDiagramNode,
  BDDiagramRecord,
  BDDiagramType,
  BDGanttNode,
  BDGitNode,
  BDJourneyNode,
  BDMindmapNode,
  BDPieNode,
  BDRequirementNode,
  BDSequenceNode,
  BDStateNode,
  BDTimelineNode,
  BDFlowchartNode,
  BDBlockNode,
  BDERNode,
} from "./BDDiagram.Domain";

export interface BDDiagramForm {
  name: string;
  type: BDDiagramType;
  direction: BDDiagramDirection;
}

export interface BDDiagramGroupForm {
  name: string;
  description: string;
}

export const BD_DIAGRAM_GROUP_EMPTY: BDDiagramGroupForm = {
  name: "",
  description: "",
};

export function toDiagramGroupForm(group: BDDiagramGroup): BDDiagramGroupForm {
  return { name: group.name, description: group.description ?? "" };
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

/**
 * Diagram types whose Mermaid syntax honors a `direction` setting. The
 * Direction control is only meaningful for these; the rest ignore it.
 */
export const BD_DIAGRAM_DIRECTION_TYPES: BDDiagramType[] = [
  "flowchart",
  "state",
  "class",
  "block",
];

export function supportsDirection(type: BDDiagramType): boolean {
  return BD_DIAGRAM_DIRECTION_TYPES.includes(type);
}

/** One node field descriptor; repeaters may describe their item fields. */
export interface BDDiagramNodeField extends BDFormField {
  itemFields?: BDDiagramNodeField[];
}

const selectOptions = (values: readonly string[]) =>
  values.map((value) => ({ label: value, value }));

const flowchartKinds = [
  "process",
  "decision",
  "terminator",
  "input",
  "output",
  "database",
  "document",
  "subroutine",
  "manual",
  "preparation",
  "connector",
] as const;

const sequenceKinds = [
  "participant",
  "actor",
  "boundary",
  "control",
  "entity",
  "database",
  "collections",
  "queue",
] as const;

const stateKinds = [
  "state",
  "start",
  "end",
  "choice",
  "fork",
  "join",
  "history",
  "composite",
] as const;

const mindmapKinds = ["root", "branch", "leaf"] as const;

const shapeOptions = selectOptions([
  "rectangle",
  "rounded",
  "stadium",
  "subroutine",
  "cylinder",
  "circle",
  "doubleCircle",
  "rhombus",
  "hexagon",
  "parallelogram",
  "trapezoid",
  "document",
  "custom",
]);

const visibilityOptions = selectOptions(["+", "-", "#", "~"]);

/**
 * Declarative, per-type node editor fields (base `id`/`label` are always
 * rendered by the builder). Tolerates legacy/partial node data: missing keys
 * simply render as blank controls.
 */
export const BD_DIAGRAM_NODE_FIELDS: Record<
  BDDiagramType,
  BDDiagramNodeField[]
> = {
  flowchart: [
    { name: "kind", label: "Kind", type: "select", options: selectOptions(flowchartKinds) },
    { name: "shape", label: "Shape", type: "select", options: shapeOptions },
    { name: "link", label: "Link", type: "text", placeholder: "https://…" },
  ],
  sequence: [
    { name: "kind", label: "Kind", type: "select", options: selectOptions(sequenceKinds) },
    { name: "alias", label: "Alias", type: "text" },
    { name: "order", label: "Order", type: "number" },
  ],
  class: [
    { name: "kind", label: "Kind", type: "select", options: selectOptions(["class", "interface", "enum", "abstract"]) },
    { name: "generic", label: "Generic", type: "text", placeholder: "e.g. T" },
    {
      name: "attributes",
      label: "Attributes",
      type: "repeater",
      itemFields: [
        { name: "name", label: "Name", type: "text" },
        { name: "type", label: "Type", type: "text" },
        { name: "visibility", label: "Vis", type: "select", options: visibilityOptions },
      ],
    },
    {
      name: "methods",
      label: "Methods",
      type: "repeater",
      itemFields: [
        { name: "name", label: "Name", type: "text" },
        { name: "type", label: "Type", type: "text" },
        { name: "visibility", label: "Vis", type: "select", options: visibilityOptions },
      ],
    },
  ],
  state: [
    { name: "kind", label: "Kind", type: "select", options: selectOptions(stateKinds) },
    {
      name: "states",
      label: "Nested states",
      type: "repeater",
      itemFields: [
        { name: "id", label: "Id", type: "text" },
        { name: "label", label: "Label", type: "text" },
        { name: "kind", label: "Kind", type: "select", options: selectOptions(stateKinds) },
      ],
    },
  ],
  er: [
    {
      name: "fields",
      label: "Fields",
      type: "repeater",
      itemFields: [
        { name: "name", label: "Name", type: "text" },
        { name: "type", label: "Type", type: "text" },
        { name: "key", label: "Key", type: "select", options: selectOptions(["PK", "FK", "UK"]) },
        { name: "nullable", label: "Null", type: "toggle" },
        { name: "comment", label: "Comment", type: "text" },
      ],
    },
  ],
  gantt: [
    { name: "start", label: "Start", type: "text", placeholder: "YYYY-MM-DD" },
    { name: "duration", label: "Duration", type: "text", placeholder: "e.g. 7d" },
    { name: "end", label: "End", type: "text", placeholder: "YYYY-MM-DD" },
    { name: "status", label: "Status", type: "select", options: selectOptions(["done", "active", "crit", "milestone"]) },
    { name: "dependsOn", label: "Depends on", type: "tags" },
    { name: "section", label: "Section", type: "text" },
  ],
  pie: [{ name: "value", label: "Value", type: "number" }],
  mindmap: [
    { name: "kind", label: "Kind", type: "select", options: selectOptions(mindmapKinds) },
    { name: "shape", label: "Shape", type: "select", options: shapeOptions },
  ],
  timeline: [
    { name: "period", label: "Period", type: "text" },
    { name: "events", label: "Events", type: "tags" },
  ],
  journey: [
    { name: "score", label: "Score", type: "number" },
    { name: "actors", label: "Actors", type: "tags" },
    { name: "section", label: "Section", type: "text" },
  ],
  gitgraph: [
    { name: "branch", label: "Branch", type: "text" },
    { name: "tag", label: "Tag", type: "text" },
    { name: "commitId", label: "Commit id", type: "text" },
    { name: "parent", label: "Parent", type: "text" },
  ],
  c4: [
    { name: "technology", label: "Technology", type: "text" },
    { name: "description", label: "Description", type: "text" },
    { name: "external", label: "External", type: "toggle" },
    { name: "boundary", label: "Boundary", type: "text" },
  ],
  block: [
    { name: "columns", label: "Columns", type: "number" },
    { name: "width", label: "Width", type: "number" },
  ],
  requirement: [
    { name: "requirementId", label: "Requirement id", type: "text" },
    { name: "text", label: "Text", type: "text" },
    { name: "risk", label: "Risk", type: "select", options: selectOptions(["low", "medium", "high"]) },
    {
      name: "verifyMethod",
      label: "Verify method",
      type: "select",
      options: selectOptions(["analysis", "demonstration", "inspection", "test"]),
    },
  ],
};

export function safeMermaidId(id: string): string {
  const clean = id.replace(/[^A-Za-z0-9_]/g, "_");
  return /^[0-9]/.test(clean) ? `n_${clean}` : clean || "node";
}

/**
 * Build a node of `type`, seeding its default `kind` plus the fields the
 * serializer reads so a freshly created diagram previews immediately.
 */
export function createDiagramNode(
  id: string,
  label: string,
  type: BDDiagramType,
): BDDiagramNode {
  const base = { id, label, diagram: type, kind: DEFAULT_KIND[type] };
  switch (type) {
    case "er":
      return {
        ...base,
        kind: "entity",
        fields: [{ name: "id", type: "string", key: "PK" }],
      } as unknown as BDDiagramNode;
    case "pie":
      return { ...base, kind: "slice", value: 10 } as unknown as BDDiagramNode;
    case "class":
      return {
        ...base,
        kind: "class",
        attributes: [],
        methods: [],
      } as unknown as BDDiagramNode;
    case "state":
      return {
        ...base,
        kind: "state",
        states: [],
      } as unknown as BDDiagramNode;
    case "gantt":
      return {
        ...base,
        kind: "task",
        start: new Date().toISOString().slice(0, 10),
        duration: "3d",
      } as unknown as BDDiagramNode;
    case "journey":
      return {
        ...base,
        kind: "task",
        score: 5,
        actors: [],
      } as unknown as BDDiagramNode;
    case "sequence":
      return {
        ...base,
        kind: "participant",
        alias: label,
        order: 0,
      } as unknown as BDDiagramNode;
    case "mindmap":
      return {
        ...base,
        kind: "root",
        shape: "rounded",
      } as unknown as BDDiagramNode;
    case "timeline":
      return {
        ...base,
        kind: "event",
        period: "Period 1",
        events: [],
      } as unknown as BDDiagramNode;
    case "gitgraph":
      return {
        ...base,
        kind: "commit",
        branch: "main",
      } as unknown as BDDiagramNode;
    case "block":
      return {
        ...base,
        kind: "block",
        columns: 1,
      } as unknown as BDDiagramNode;
    case "c4":
      return {
        ...base,
        kind: "system",
        external: false,
      } as unknown as BDDiagramNode;
    case "requirement":
      return {
        ...base,
        kind: "requirement",
        requirementId: id,
        text: label,
        risk: "low",
        verifyMethod: "test",
      } as unknown as BDDiagramNode;
    default:
      return base as unknown as BDDiagramNode;
  }
}

/** Default node used when a diagram is first created for a given type. */
export function createDefaultDiagramNode(
  type: BDDiagramType,
  options?: { id?: string; label?: string },
): BDDiagramNode {
  const id = options?.id ?? "n1";
  const label =
    options?.label ??
    (type === "pie" ? "Slice 1" : type === "er" ? "Entity" : "Start");
  return createDiagramNode(id, label, type);
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

/** Flowchart node shape renderers, keyed by `BDDiagramNodeShape`. */
const FLOWCHART_SHAPE: Record<string, (id: string, label: string) => string> = {
  rectangle: (id, label) => `${id}["${label}"]`,
  rounded: (id, label) => `${id}("${label}")`,
  stadium: (id, label) => `${id}(["${label}"])`,
  subroutine: (id, label) => `${id}[["${label}"]]`,
  cylinder: (id, label) => `${id}[("${label}")]`,
  circle: (id, label) => `${id}(("${label}"))`,
  doubleCircle: (id, label) => `${id}(((("${label}"))))`,
  rhombus: (id, label) => `${id}{"${label}"}`,
  hexagon: (id, label) => `${id}{{"${label}"}}`,
  parallelogram: (id, label) => `${id}[/"${label}"/]`,
  trapezoid: (id, label) => `${id}[\\"${label}"\\]`,
  document: (id, label) => `${id}["${label}"]`,
  custom: (id, label) => `${id}["${label}"]`,
};

const FLOWCHART_KIND_SHAPE: Record<string, string> = {
  process: "rounded",
  decision: "rhombus",
  terminator: "stadium",
  input: "parallelogram",
  output: "parallelogram",
  database: "cylinder",
  document: "document",
  subroutine: "subroutine",
  manual: "rectangle",
  preparation: "hexagon",
  connector: "circle",
};

const FLOW_EDGE: Record<
  string,
  { full: string; open: string; close: string }
> = {
  solid: { full: "-->", open: "--", close: "-->" },
  arrow: { full: "-->", open: "--", close: "-->" },
  open: { full: "---", open: "--", close: "---" },
  dotted: { full: "-.->", open: "-.", close: ".->" },
  thick: { full: "==>", open: "==", close: "==>" },
  invisible: { full: "~~~", open: "~~~", close: "~~~" },
  circle: { full: "--o", open: "--", close: "--o" },
  cross: { full: "--x", open: "--", close: "--x" },
};

const CLASS_EDGE: Record<string, string> = {
  inheritance: "<|--",
  realization: "..|>",
  composition: "*--",
  aggregation: "o--",
  dependency: "..>",
  association: "-->",
  solid: "--",
  arrow: "-->",
  dotted: "..",
  link: "--",
};

function sequenceKeyword(kind: string | undefined): "actor" | "participant" {
  return kind === "actor" ? "actor" : "participant";
}

function classStereotype(kind: string | undefined): string | null {
  switch (kind) {
    case "interface":
      return "  <<interface>>";
    case "enum":
      return "  <<enumeration>>";
    case "abstract":
      return "  <<abstract>>";
    default:
      return null;
  }
}

function classMemberLine(member: {
  name?: string;
  type?: string;
  visibility?: string;
}): string {
  const visibility = member.visibility ?? "+";
  return `    ${visibility}${member.name ?? ""}${member.type ? ` : ${member.type}` : ""}`;
}

/**
 * Serialize a diagram's nodes/edges into Mermaid source using each node's
 * typed fields.
 *
 * A raw override in `diagram.meta.mermaid` (edited directly or produced by AI)
 * always wins, so users can hand-tune Mermaid the UI cannot express.
 */
export function toMermaid(diagram: BDDiagramRecord): string {
  const override = diagram.meta?.mermaid;
  if (typeof override === "string" && override.trim()) return override;

  const nodes = diagram.nodes ?? [];
  const edges = diagram.edges ?? [];
  const labelOf = (id: string) => nodes.find((n) => n.id === id)?.label ?? id;
  const direction = diagram.direction ?? "TB";

  switch (diagram.type) {
    case "sequence": {
      const typed = nodes as unknown as BDSequenceNode[];
      const ordered = [...typed].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0),
      );
      const lines = ["sequenceDiagram"];
      for (const node of ordered) {
        const alias = node.alias?.trim();
        lines.push(
          `  ${sequenceKeyword(node.kind)} ${safeMermaidId(node.id)}${
            alias ? ` as ${escapeLabel(alias)}` : ""
          }`,
        );
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
      const typed = nodes as unknown as BDClassNode[];
      const lines = ["classDiagram"];
      if (supportsDirection(diagram.type)) lines.push(`  direction ${direction}`);
      for (const node of typed) {
        const stereo = classStereotype(node.kind);
        lines.push(`  class ${safeMermaidId(node.id)}${node.generic ? `~${node.generic}~` : ""} {`);
        if (stereo) lines.push(stereo);
        for (const attribute of node.attributes ?? []) {
          if (attribute.name?.trim() || attribute.type?.trim()) {
            lines.push(classMemberLine(attribute));
          }
        }
        for (const method of node.methods ?? []) {
          if (method.name?.trim() || method.type?.trim()) {
            lines.push(classMemberLine(method));
          }
        }
        lines.push("  }");
      }
      for (const edge of edges) {
        const token = CLASS_EDGE[edge.edgeType ?? "association"] ?? "-->";
        lines.push(
          `  ${safeMermaidId(edge.source)} ${token} ${safeMermaidId(edge.target)}${
            edge.label ? ` : ${escapeLabel(edge.label)}` : ""
          }`,
        );
      }
      return lines.join("\n");
    }

    case "state": {
      const typed = nodes as unknown as BDStateNode[];
      const kindOf = (id: string) => typed.find((n) => n.id === id)?.kind;
      const stateId = (id: string) =>
        kindOf(id) === "start" || kindOf(id) === "end"
          ? "[*]"
          : safeMermaidId(id);
      const lines = ["stateDiagram-v2"];
      if (supportsDirection(diagram.type)) lines.push(`  direction ${direction}`);
      for (const node of typed) {
        if (node.kind === "start" || node.kind === "end") continue;
        if (node.kind === "choice") lines.push(`  state ${safeMermaidId(node.id)} <<choice>>`);
        else if (node.kind === "fork") lines.push(`  state ${safeMermaidId(node.id)} <<fork>>`);
        else if (node.kind === "join") lines.push(`  state ${safeMermaidId(node.id)} <<join>>`);
        else if (node.kind === "history") lines.push(`  state ${safeMermaidId(node.id)} <<history>>`);
        else lines.push(`  state "${escapeLabel(node.label)}" as ${safeMermaidId(node.id)}`);
      }
      for (const edge of edges) {
        lines.push(
          `  ${stateId(edge.source)} --> ${stateId(edge.target)}${
            edge.label ? ` : ${escapeLabel(edge.label)}` : ""
          }`,
        );
      }
      return lines.join("\n");
    }

    case "er": {
      const typed = nodes as unknown as BDERNode[];
      const lines = ["erDiagram"];
      for (const node of typed) {
        const entity = safeMermaidId(node.id);
        const fields = node.fields ?? [];
        if (fields.length === 0) {
          lines.push(`  ${entity}`);
          continue;
        }
        lines.push(`  ${entity} {`);
        for (const field of fields) {
          if (!field.name?.trim()) continue;
          const name = field.name.replace(/[^A-Za-z0-9_]/g, "_");
          const comment = field.comment
            ? ` "${field.comment.replace(/"/g, "'")}"`
            : field.nullable
              ? ' "nullable"'
              : "";
          lines.push(
            `    ${field.type || "string"} ${name}${
              field.key ? ` ${field.key}` : ""
            }${comment}`,
          );
        }
        lines.push("  }");
      }
      for (const edge of edges) {
        lines.push(
          `  ${safeMermaidId(edge.source)} ||--o{ ${safeMermaidId(edge.target)} : ${
            escapeLabel(edge.label ?? "relates")
          }`,
        );
      }
      return lines.join("\n");
    }

    case "mindmap": {
      const typed = nodes as unknown as BDMindmapNode[];
      const lines = ["mindmap"];
      const incoming = new Set(edges.map((e) => e.target));
      const roots = typed.filter((n) => !incoming.has(n.id));
      const childrenOf = (id: string) =>
        edges.filter((e) => e.source === id).map((e) => e.target);
      const wrap = (label: string, kind: string | undefined) => {
        const text = escapeLabel(label);
        if (kind === "root") return `((${text}))`;
        if (kind === "branch") return `[${text}]`;
        return `(${text})`;
      };
      const walk = (id: string, depth: number) => {
        const node = typed.find((n) => n.id === id);
        lines.push(
          `${"  ".repeat(depth + 1)}${wrap(
            node?.label ?? labelOf(id),
            node?.kind,
          )}`,
        );
        for (const child of childrenOf(id)) walk(child, depth + 1);
      };
      for (const root of roots.length > 0 ? roots : typed) {
        walk(root.id, 0);
      }
      return lines.join("\n");
    }

    case "pie": {
      const typed = nodes as unknown as BDPieNode[];
      const lines = ["pie", `  title ${diagram.name}`];
      for (const node of typed) {
        lines.push(
          `  "${escapeLabel(node.label)}" : ${node.value ?? 10}`,
        );
      }
      return lines.join("\n");
    }

    case "journey": {
      const typed = nodes as unknown as BDJourneyNode[];
      const lines = ["journey", `  title ${diagram.name}`];
      const opened = new Set<string>();
      for (const node of typed) {
        if (node.kind === "section") {
          lines.push(`  section ${escapeLabel(node.label)}`);
          opened.add(node.label);
          continue;
        }
        if (node.section && !opened.has(node.section)) {
          lines.push(`  section ${escapeLabel(node.section)}`);
          opened.add(node.section);
        }
        const actors = (node.actors ?? []).join(", ") || "Actor";
        lines.push(
          `    ${escapeLabel(node.label)}: ${node.score ?? 5}: ${escapeLabel(actors)}`,
        );
      }
      return lines.join("\n");
    }

    case "timeline": {
      const typed = nodes as unknown as BDTimelineNode[];
      const lines = ["timeline", `  title ${diagram.name}`];
      let current = -1;
      for (const node of typed) {
        const events = (node.events ?? []).map(escapeLabel);
        if (node.kind === "period" || events.length > 0) {
          lines.push(
            `  ${escapeLabel(node.period || node.label)}${
              events.length > 0 ? ` : ${events.join(" : ")}` : ""
            }`,
          );
          current = lines.length - 1;
        } else {
          if (current === -1) {
            lines.push(`  ${escapeLabel(node.label)}`);
            current = lines.length - 1;
          } else {
            lines[current] += ` : ${escapeLabel(node.label)}`;
          }
        }
      }
      return lines.join("\n");
    }

    case "gantt": {
      const typed = nodes as unknown as BDGanttNode[];
      const lines = [
        "gantt",
        `  title ${diagram.name}`,
        "  dateFormat YYYY-MM-DD",
      ];
      const opened = new Set<string>();
      for (const node of typed) {
        if (node.kind === "section") {
          lines.push(`  section ${escapeLabel(node.label)}`);
          opened.add(node.label);
          continue;
        }
        if (node.section && !opened.has(node.section)) {
          lines.push(`  section ${escapeLabel(node.section)}`);
          opened.add(node.section);
        }
        const parts: string[] = [];
        if (node.status) parts.push(node.status);
        parts.push(safeMermaidId(node.id));
        if (node.start) parts.push(node.start);
        if (node.duration) parts.push(node.duration);
        else if (node.end) parts.push(node.end);
        if (node.dependsOn?.length) {
          parts.push(`after ${node.dependsOn.map(safeMermaidId).join(" ")}`);
        }
        lines.push(`  ${escapeLabel(node.label)} : ${parts.join(", ")}`);
      }
      return lines.join("\n");
    }

    case "gitgraph": {
      const typed = nodes as unknown as BDGitNode[];
      const lines = ["gitGraph"];
      for (const node of typed) {
        if (node.kind === "branch") {
          lines.push(`  branch ${safeMermaidId(node.branch || node.label)}`);
        } else if (node.kind === "merge") {
          lines.push(`  merge ${safeMermaidId(node.branch || node.label)}`);
        } else if (node.kind === "cherryPick") {
          lines.push(`  cherry-pick id: "${node.commitId ?? safeMermaidId(node.id)}"`);
        } else {
          lines.push(
            `  commit id: "${node.commitId ?? safeMermaidId(node.id)}"${
              node.tag ? ` tag: "${escapeLabel(node.tag)}"` : ""
            }`,
          );
        }
      }
      return lines.join("\n");
    }

    case "c4": {
      const typed = nodes as unknown as BDC4Node[];
      const lines = ["C4Context", `  title ${diagram.name}`];
      const typeOf = (node: BDC4Node) => {
        switch (node.kind) {
          case "person":
            return "Person";
          case "container":
            return "Container";
          case "containerDb":
            return "ContainerDb";
          case "component":
            return "Component";
          case "boundary":
            return "Boundary";
          case "systemExt":
            return "System_Ext";
          default:
            return node.external ? "System_Ext" : "System";
        }
      };
      for (const node of typed) {
        const args = [`${safeMermaidId(node.id)}`, `"${escapeLabel(node.label)}"`];
        if (node.technology) args.push(`"${escapeLabel(node.technology)}"`);
        if (node.description) args.push(`"${escapeLabel(node.description)}"`);
        lines.push(`  ${typeOf(node)}(${args.join(", ")})`);
      }
      for (const edge of edges) {
        lines.push(
          `  Rel(${safeMermaidId(edge.source)}, ${safeMermaidId(edge.target)}, "${
            edge.label ?? ""
          }")`,
        );
      }
      return lines.join("\n");
    }

    case "block": {
      const typed = nodes as unknown as BDBlockNode[];
      const explicit = typed.find((n) => typeof n.columns === "number")?.columns;
      const columns =
        explicit ??
        (direction === "LR" || direction === "RL"
          ? Math.max(nodes.length, 1)
          : 1);
      const lines = ["block-beta", `  columns ${columns}`];
      for (const node of typed) {
        lines.push(
          `  ${safeMermaidId(node.id)}["${escapeLabel(node.label)}"]`,
        );
      }
      for (const edge of edges) {
        lines.push(
          `  ${safeMermaidId(edge.source)} --> ${safeMermaidId(edge.target)}`,
        );
      }
      return lines.join("\n");
    }

    case "requirement": {
      const typed = nodes as unknown as BDRequirementNode[];
      const lines = ["requirementDiagram"];
      for (const node of typed) {
        if (node.kind === "element") {
          lines.push(`  element ${safeMermaidId(node.id)} {`);
          lines.push(`    type: "${escapeLabel(node.text || node.label)}"`);
          lines.push("  }");
          continue;
        }
        lines.push(`  requirement ${safeMermaidId(node.id)} {`);
        lines.push(`    id: ${node.requirementId ?? safeMermaidId(node.id)}`);
        lines.push(`    text: ${escapeLabel(node.text || node.label)}`);
        lines.push(`    risk: ${node.risk ?? "low"}`);
        lines.push(`    verifymethod: ${node.verifyMethod ?? "test"}`);
        lines.push("  }");
      }
      return lines.join("\n");
    }

    case "flowchart":
    default: {
      const typed = nodes as unknown as BDFlowchartNode[];
      const lines = [`flowchart ${direction}`];
      for (const node of typed) {
        const shape = node.shape ?? FLOWCHART_KIND_SHAPE[node.kind] ?? "rectangle";
        const render = FLOWCHART_SHAPE[shape] ?? FLOWCHART_SHAPE.rectangle;
        lines.push(`  ${render(safeMermaidId(node.id), escapeLabel(node.label))}`);
        if (node.link) lines.push(`  click ${safeMermaidId(node.id)} "${node.link}"`);
      }
      for (const edge of edges) {
        const style = FLOW_EDGE[edge.edgeType ?? "solid"] ?? FLOW_EDGE.solid;
        const link = edge.label
          ? `${style.open} ${escapeLabel(edge.label)} ${style.close}`
          : style.full;
        lines.push(
          `  ${safeMermaidId(edge.source)} ${link} ${safeMermaidId(edge.target)}`,
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
  /** Optional type-specific node fields (kind, fields, start, …). */
  data?: Record<string, unknown>;
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
