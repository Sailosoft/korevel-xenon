// BunnyDev.Simple
// MVP subset of BunnyDev: Project + Work + Agents + Schema + Diagrams + Docs + Files.
// Dropped for MVP: App Builder, API reference, Outline, workflows, custom fields,
// plugins, tenancy, time tracking, watchers, votes, attachments.

// ================== Core ==================

type BDId = string;
type BDColor = string;
type BDDiagramDirection = "TB" | "TD" | "BT" | "RL" | "LR";

enum BDProjectRole {
  owner = "owner",
  admin = "admin",
  member = "member",
  viewer = "viewer",
}

enum BDPriority {
  low = "low",
  medium = "medium",
  high = "high",
  urgent = "urgent",
}

enum BDTaskType {
  task = "task",
  bug = "bug",
  story = "story",
  epic = "epic",
}

enum BDTaskStatus {
  todo = "todo",
  inProgress = "inProgress",
  inReview = "inReview",
  done = "done",
  cancelled = "cancelled",
}

enum BDSprintState {
  planned = "planned",
  active = "active",
  completed = "completed",
}

// ================== Project ==================

interface BDProject {
  id: BDId;
  key: string;
  name: string;
  description?: string;
  owner?: BDProjectMember;
  members: BDProjectMember[];
  labels: BDLabel[];
  agents: BDAgent[];
  createdAt?: string;
}

interface BDProjectMember {
  project: BDProject;
  id: BDId;
  name: string;
  email: string;
  role: BDProjectRole;
  avatar?: string;
  active: boolean;
}

interface BDLabel {
  project: BDProject;
  id: BDId;
  name: string;
  color?: BDColor;
}

interface BDSprint {
  project: BDProject;
  id: BDId;
  name: string;
  goal?: string;
  state: BDSprintState;
  startDate?: string;
  endDate?: string;
}

// ================== Work ==================

interface BDTask {
  project: BDProject;
  id: BDId;
  key: string;
  name: string;
  description?: string;
  type: BDTaskType;
  status: BDTaskStatus;
  priority: BDPriority;
  rank: number;
  storyPoints?: number;
  sprint?: BDSprint;
  epic?: BDTask;
  parent?: BDTask;
  subtasks: BDTask[];
  assignee?: BDProjectMember;
  reporter?: BDProjectMember;
  labels: BDLabel[];
  dueDate?: string;
  comments: BDTaskComment[];
  agentTasks: BDAgentTask[];
  createdAt: string;
  updatedAt: string;
}

interface BDTaskComment {
  task: BDTask;
  id: BDId;
  author?: BDProjectMember;
  body: string;
  createdAt: string;
  editedAt?: string;
}

interface BDBoard {
  project: BDProject;
  id: BDId;
  name: string;
  sprint?: BDSprint;
  columns: BDBoardColumn[];
}

interface BDBoardColumn {
  board: BDBoard;
  id: BDId;
  name: string;
  status: BDTaskStatus;
  position: number;
  wipLimit?: number;
}

// ================== Agents ==================

enum BDAgentStatus {
  idle = "idle",
  queued = "queued",
  working = "working",
  blocked = "blocked",
  done = "done",
  failed = "failed",
}

interface BDAgent {
  project: BDProject;
  id: BDId;
  name: string;
  prompt: string;
  description?: string;
  provider?: string;
  model?: string;
  enabled: boolean;
}

interface BDAgentTask {
  task: BDTask;
  id: BDId;
  agent: BDAgent;
  status: BDAgentStatus;
  instruction: string;
  result?: string;
  error?: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
}

// ================== Schema ==================

enum BDSchemaType {
  string = "string",
  text = "text",
  integer = "integer",
  float = "float",
  decimal = "decimal",
  boolean = "boolean",
  date = "date",
  datetime = "datetime",
  uuid = "uuid",
  json = "json",
}

enum BDSchemaRelationType {
  belongsTo = "belongsTo",
  hasOne = "hasOne",
  hasMany = "hasMany",
  belongsToMany = "belongsToMany",
}

interface BDSchemaModel {
  project: BDProject;
  id: BDId;
  name: string;
  table: string;
  description?: string;
  properties: BDSchemaProperty[];
  relations: BDSchemaRelation[];
  timestamps: boolean;
}

interface BDSchemaProperty {
  model: BDSchemaModel;
  name: string;
  type: BDSchemaType;
  primary?: boolean;
  nullable: boolean;
  unique?: boolean;
  default?: unknown;
  values?: string[];
}

interface BDSchemaRelation {
  model: BDSchemaModel;
  name: string;
  type: BDSchemaRelationType;
  target: BDSchemaModel;
  foreignKey?: string;
}

// ================== Diagram ==================

enum BDDiagramType {
  flowchart = "flowchart",
  er = "er",
  mindmap = "mindmap",
}

interface BDDiagram {
  project: BDProject;
  id: BDId;
  name: string;
  type: BDDiagramType;
  direction?: BDDiagramDirection;
  nodes: BDDiagramNode[];
  edges: BDDiagramEdge[];
}

interface BDDiagramNode {
  diagram: BDDiagram;
  id: BDId;
  label: string;
  shape?: string;
  parentId?: BDId;
}

interface BDDiagramEdge {
  diagram: BDDiagram;
  id: BDId;
  source: BDId;
  target: BDId;
  label?: string;
}

// ================== Docs ==================

enum BDDocType {
  note = "note",
  readme = "readme",
  guide = "guide",
  spec = "spec",
  adr = "adr",
  plan = "plan",
}

enum BDDocStatus {
  draft = "draft",
  review = "review",
  published = "published",
  archived = "archived",
}

interface BDDoc {
  project: BDProject;
  id: BDId;
  name: string;
  slug: string;
  type: BDDocType;
  status: BDDocStatus;
  summary?: string;
  content: string;
  sections: BDDocSection[];
  diagrams: BDDiagram[];
  models: BDSchemaModel[];
  authors: BDProjectMember[];
  tags: BDLabel[];
  createdAt: string;
  updatedAt: string;
}

interface BDDocSection {
  doc: BDDoc;
  id: BDId;
  title: string;
  level: 1 | 2 | 3;
  content: string;
  position: number;
}

// ================== Files ==================

enum BDFileKind {
  file = "file",
  image = "image",
  code = "code",
  markdown = "markdown",
  json = "json",
  document = "document",
  other = "other",
}

interface BDProjectFolder {
  project: BDProject;
  id: BDId;
  parent?: BDProjectFolder;
  name: string;
  path: string;
  position: number;
  files: BDProjectFile[];
  folders: BDProjectFolder[];
}

interface BDProjectFile {
  project: BDProject;
  folder?: BDProjectFolder;
  id: BDId;
  name: string;
  path: string;
  kind: BDFileKind;
  mime?: string;
  size: number;
  content?: string;
  readonly?: boolean;
  author?: BDProjectMember;
  createdAt: string;
  updatedAt: string;
}
