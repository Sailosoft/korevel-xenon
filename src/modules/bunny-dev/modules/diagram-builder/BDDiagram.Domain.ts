// BDDiagram.Domain.ts — Diagram Builder domain model (Mermaid-backed diagrams:
// nodes, edges, per-type node shapes, renderer map).

import type { BDAppColor, BDEntity } from "../core/BDShared.Types";

/** A group of diagrams — enables organising diagrams into sets. */
export interface BDDiagramGroup extends BDEntity {
  projectId: string;
  name: string;
  description?: string;
  position: number;
}

export type BDDiagramType =
  | "flowchart"
  | "sequence"
  | "class"
  | "state"
  | "er"
  | "gantt"
  | "pie"
  | "mindmap"
  | "timeline"
  | "journey"
  | "gitgraph"
  | "c4"
  | "block"
  | "requirement";

export type BDDiagramDirection = "TB" | "TD" | "BT" | "RL" | "LR";

export type BDDiagramRenderer =
  | "mermaid"
  | "reactflow"
  | "excalidraw"
  | "canvas"
  | "svg";

export interface BDDiagramRenderMap {
  flowchart: "mermaid" | "reactflow" | "excalidraw" | "svg";
  sequence: "mermaid" | "svg";
  class: "mermaid" | "svg";
  state: "mermaid" | "reactflow";
  er: "mermaid" | "svg";
  gantt: "mermaid";
  pie: "mermaid" | "canvas";
  mindmap: "mermaid" | "reactflow";
  timeline: "mermaid";
  journey: "mermaid";
  gitgraph: "mermaid";
  c4: "mermaid";
  block: "mermaid" | "reactflow";
  requirement: "mermaid" | "reactflow";
}

export type BDDiagramNodeShape =
  | "rectangle"
  | "rounded"
  | "stadium"
  | "subroutine"
  | "cylinder"
  | "circle"
  | "doubleCircle"
  | "rhombus"
  | "hexagon"
  | "parallelogram"
  | "trapezoid"
  | "document"
  | "custom";

export interface BDDiagramNodeBase {
  id: string;
  label: string;
  icon?: string;
  color?: BDAppColor;
  position?: { x: number; y: number };
  parentId?: string;
  data?: Record<string, unknown>;
}

export interface BDFlowchartNode extends BDDiagramNodeBase {
  diagram: "flowchart";
  kind:
    | "process"
    | "decision"
    | "terminator"
    | "input"
    | "output"
    | "database"
    | "document"
    | "subroutine"
    | "manual"
    | "preparation"
    | "connector";
  shape?: BDDiagramNodeShape;
  link?: string;
}

export interface BDSequenceNode extends BDDiagramNodeBase {
  diagram: "sequence";
  kind:
    | "participant"
    | "actor"
    | "boundary"
    | "control"
    | "entity"
    | "database"
    | "collections"
    | "queue";
  alias?: string;
  order?: number;
}

export interface BDClassMember {
  name: string;
  type?: string;
  visibility?: "+" | "-" | "#" | "~";
  static?: boolean;
  abstract?: boolean;
}

export interface BDClassNode extends BDDiagramNodeBase {
  diagram: "class";
  kind: "class" | "interface" | "enum" | "abstract";
  attributes?: BDClassMember[];
  methods?: BDClassMember[];
  generic?: string;
}

export interface BDStateNode extends BDDiagramNodeBase {
  diagram: "state";
  kind:
    | "state"
    | "start"
    | "end"
    | "choice"
    | "fork"
    | "join"
    | "history"
    | "composite";
  states?: BDStateNode[];
}

export interface BDERField {
  name: string;
  type: string;
  key?: "PK" | "FK" | "UK";
  nullable?: boolean;
  comment?: string;
}

export interface BDERNode extends BDDiagramNodeBase {
  diagram: "er";
  kind: "entity";
  fields: BDERField[];
}

export interface BDGanttNode extends BDDiagramNodeBase {
  diagram: "gantt";
  kind: "section" | "task" | "milestone";
  start?: string;
  duration?: string;
  end?: string;
  status?: "done" | "active" | "crit" | "milestone";
  dependsOn?: string[];
  section?: string;
}

export interface BDPieNode extends BDDiagramNodeBase {
  diagram: "pie";
  kind: "slice";
  value: number;
}

export interface BDMindmapNode extends BDDiagramNodeBase {
  diagram: "mindmap";
  kind: "root" | "branch" | "leaf";
  shape?: BDDiagramNodeShape;
}

export interface BDTimelineNode extends BDDiagramNodeBase {
  diagram: "timeline";
  kind: "period" | "event";
  period?: string;
  events?: string[];
}

export interface BDJourneyNode extends BDDiagramNodeBase {
  diagram: "journey";
  kind: "section" | "task";
  score?: number;
  actors?: string[];
  section?: string;
}

export interface BDGitNode extends BDDiagramNodeBase {
  diagram: "gitgraph";
  kind: "commit" | "branch" | "merge" | "cherryPick";
  branch?: string;
  tag?: string;
  commitId?: string;
  parent?: string;
}

export interface BDC4Node extends BDDiagramNodeBase {
  diagram: "c4";
  kind:
    | "person"
    | "system"
    | "systemExt"
    | "container"
    | "containerDb"
    | "component"
    | "boundary";
  technology?: string;
  description?: string;
  external?: boolean;
  boundary?: string;
}

export interface BDBlockNode extends BDDiagramNodeBase {
  diagram: "block";
  kind: "block" | "space" | "composite";
  columns?: number;
  width?: number;
}

export interface BDRequirementNode extends BDDiagramNodeBase {
  diagram: "requirement";
  kind:
    | "requirement"
    | "element"
    | "functional"
    | "performance"
    | "interface"
    | "physical"
    | "design";
  requirementId?: string;
  text?: string;
  risk?: "low" | "medium" | "high";
  verifyMethod?: "analysis" | "demonstration" | "inspection" | "test";
}

export interface BDDiagramNodeMap {
  flowchart: BDFlowchartNode;
  sequence: BDSequenceNode;
  class: BDClassNode;
  state: BDStateNode;
  er: BDERNode;
  gantt: BDGanttNode;
  pie: BDPieNode;
  mindmap: BDMindmapNode;
  timeline: BDTimelineNode;
  journey: BDJourneyNode;
  gitgraph: BDGitNode;
  c4: BDC4Node;
  block: BDBlockNode;
  requirement: BDRequirementNode;
}

export type BDDiagramNodeFor<T extends BDDiagramType> = BDDiagramNodeMap[T];
export type BDDiagramRenderFor<T extends BDDiagramType> = BDDiagramRenderMap[T];

export type BDDiagramNode =
  | BDFlowchartNode
  | BDSequenceNode
  | BDClassNode
  | BDStateNode
  | BDERNode
  | BDGanttNode
  | BDPieNode
  | BDMindmapNode
  | BDTimelineNode
  | BDJourneyNode
  | BDGitNode
  | BDC4Node
  | BDBlockNode
  | BDRequirementNode;

export type BDDiagramEdgeType =
  | "solid"
  | "dotted"
  | "thick"
  | "invisible"
  | "arrow"
  | "open"
  | "circle"
  | "cross"
  | "inheritance"
  | "composition"
  | "aggregation"
  | "association"
  | "dependency"
  | "realization"
  | "message"
  | "return"
  | "transition"
  | "relation"
  | "depends";

export interface BDDiagramEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  edgeType?: BDDiagramEdgeType;
  sourceHandle?: string;
  targetHandle?: string;
  order?: number;
  animated?: boolean;
  data?: Record<string, unknown>;
}

export interface BDDiagramBase<T extends BDDiagramType> extends BDEntity {
  projectId: string;
  name: string;
  title?: string;
  type: T;
  render: BDDiagramRenderFor<T>;
  direction?: BDDiagramDirection;
  nodes: BDDiagramNodeFor<T>[];
  edges: BDDiagramEdge[];
  parentId?: string;
  meta?: Record<string, unknown>;
}

export type BDDiagramFlowchart = BDDiagramBase<"flowchart">;
export type BDDiagramSequence = BDDiagramBase<"sequence">;
export type BDDiagramClass = BDDiagramBase<"class">;
export type BDDiagramState = BDDiagramBase<"state">;
export type BDDiagramER = BDDiagramBase<"er">;
export type BDDiagramGantt = BDDiagramBase<"gantt">;
export type BDDiagramPie = BDDiagramBase<"pie">;
export type BDDiagramMindmap = BDDiagramBase<"mindmap">;
export type BDDiagramTimeline = BDDiagramBase<"timeline">;
export type BDDiagramJourney = BDDiagramBase<"journey">;
export type BDDiagramGitgraph = BDDiagramBase<"gitgraph">;
export type BDDiagramC4 = BDDiagramBase<"c4">;
export type BDDiagramBlock = BDDiagramBase<"block">;
export type BDDiagramRequirement = BDDiagramBase<"requirement">;

export type BDDiagram =
  | BDDiagramFlowchart
  | BDDiagramSequence
  | BDDiagramClass
  | BDDiagramState
  | BDDiagramER
  | BDDiagramGantt
  | BDDiagramPie
  | BDDiagramMindmap
  | BDDiagramTimeline
  | BDDiagramJourney
  | BDDiagramGitgraph
  | BDDiagramC4
  | BDDiagramBlock
  | BDDiagramRequirement;

/**
 * Storage shape for the single `diagrams` table.
 *
 * The `BDDiagram` union keeps per-type node safety in components; this flat
 * record stores any diagram type in one Dexie table (and lets `create` accept
 * object literals without union friction).
 */
export interface BDDiagramRecord extends BDEntity {
  projectId: string;
  groupId?: string;
  name: string;
  title?: string;
  type: BDDiagramType;
  render: BDDiagramRenderer;
  direction?: BDDiagramDirection;
  nodes: BDDiagramNode[];
  edges: BDDiagramEdge[];
  parentId?: string;
  meta?: Record<string, unknown>;
}
