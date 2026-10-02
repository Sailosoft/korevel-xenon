// BunnyDev

enum BDSchemaType {
  string = "string",
  text = "text",
  integer = "integer",
  bigint = "bigint",
  float = "float",
  double = "double",
  decimal = "decimal",
  boolean = "boolean",
  date = "date",
  time = "time",
  datetime = "datetime",
  timestamp = "timestamp",
  uuid = "uuid",
  json = "json",
  jsonb = "jsonb",
  binary = "binary",
  enum = "enum",
  array = "array",
}

enum BDSchemaRelationType {
  belongsTo = "belongsTo",
  hasOne = "hasOne",
  hasMany = "hasMany",
  belongsToMany = "belongsToMany",
  hasManyThrough = "hasManyThrough",
  morphOne = "morphOne",
  morphMany = "morphMany",
  morphTo = "morphTo",
}

enum BDSchemaReferenceAction {
  cascade = "cascade",
  restrict = "restrict",
  setNull = "setNull",
  noAction = "noAction",
}

enum BDSchemaIndexType {
  index = "index",
  unique = "unique",
  primary = "primary",
  fulltext = "fulltext",
  spatial = "spatial",
}

enum BDTaskStatusType {
  start = "start",
  onGoing = "onGoing",
  finished = "finished",
}

enum BDCustomFieldType {
  text = "text",
  textarea = "textarea",
  number = "number",
  date = "date",
}

enum BDProjectRole {
  admin = "admin",
  member = "member",
  viewer = "viewer",
  guest = "guest",
  agent = "agent",
}

enum BDIssueType {
  epic = "epic",
  story = "story",
  task = "task",
  bug = "bug",
  subtask = "subtask",
  spike = "spike",
}

enum BDPriority {
  lowest = "lowest",
  low = "low",
  medium = "medium",
  high = "high",
  highest = "highest",
  blocker = "blocker",
}

enum BDResolution {
  unresolved = "unresolved",
  fixed = "fixed",
  done = "done",
  duplicate = "duplicate",
  wontDo = "wontDo",
  cannotReproduce = "cannotReproduce",
}

enum BDLinkType {
  blocks = "blocks",
  blockedBy = "blockedBy",
  relatesTo = "relatesTo",
  duplicates = "duplicates",
  duplicatedBy = "duplicatedBy",
  clones = "clones",
  clonedBy = "clonedBy",
  causes = "causes",
  causedBy = "causedBy",
}

enum BDSprintState {
  future = "future",
  active = "active",
  closed = "closed",
}

enum BDBoardTaskStatusCategory {
  todo = "todo",
  inProgress = "inProgress",
  done = "done",
}

interface BDProjectMember {
  project: BDProject;
  name: string;
  email: string;
  role: BDProjectRole;
  avatar?: string;
  active: boolean;
}

interface BDProject {
  key: string;
  name: string;
  description: string;
  lead?: BDProjectMember;
  members: BDProjectMember[];
  issueTypes: BDIssueType[];
  workflows: BDWorkflow[];
  sprints: BDSprint[];
  components: BDComponent[];
  versions: BDVersion[];
  labels: BDLabel[];
  agentSettings: BDAgentSettings[];
  architectures: BDArchitecture[];
  createdAt?: string;
}

interface BDSprint {
  project: BDProject;
  name: string;
  goal?: string;
  state: BDSprintState;
  startDate?: string;
  endDate?: string;
  capacity?: number;
  completedPoints?: number;
  velocity?: number;
}

interface BDComponent {
  project: BDProject;
  name: string;
  description?: string;
  lead?: BDProjectMember;
}

interface BDVersion {
  project: BDProject;
  name: string;
  description?: string;
  released: boolean;
  releaseDate?: string;
}

interface BDLabel {
  project: BDProject;
  name: string;
  color?: string;
}

interface BDWorkflowStatus {
  workflow: BDWorkflow;
  name: string;
  category: BDBoardTaskStatusCategory;
  position: number;
}

interface BDWorkflowTransition {
  workflow: BDWorkflow;
  name: string;
  from: BDWorkflowStatus[];
  to: BDWorkflowStatus;
  conditions?: string[];
  validators?: string[];
  postFunctions?: string[];
}

interface BDWorkflow {
  project: BDProject;
  name: string;
  statuses: BDWorkflowStatus[];
  transitions: BDWorkflowTransition[];
}


interface BDSchemaGroup {
  project: BDProject;
  name: string;
  description?: string;
  position: number;
  models: BDSchemaModel[];
}

interface BDSchemaModel {
  group: BDSchemaGroup;
  name: string;
  table: string;
  description?: string;
  properties: BDSchemaProperty[];
  relations: BDSchemaRelation[];
  indexes: BDSchemaIndex[];
  primaryKey: string[];
  timestamps: boolean;
  softDeletes: boolean;
}

interface BDSchemaProperty {
  model: BDSchemaModel;
  name: string;
  type: BDSchemaType;
  nullable: boolean;
  primary?: boolean;
  unique?: boolean;
  autoIncrement?: boolean;
  unsigned?: boolean;
  default?: unknown;
  length?: number;
  precision?: number;
  scale?: number;
  values?: string[];
  cast?: string;
  comment?: string;
  hidden?: boolean;
  fillable?: boolean;
}

interface BDSchemaRelation {
  model: BDSchemaModel;
  name: string;
  type: BDSchemaRelationType;
  target: BDSchemaModel;
  foreignKey?: string;
  ownerKey?: string;
  pivotTable?: string;
  through?: BDSchemaModel;
  onDelete?: BDSchemaReferenceAction;
  onUpdate?: BDSchemaReferenceAction;
  nullable?: boolean;
}

interface BDSchemaIndex {
  model: BDSchemaModel;
  name?: string;
  columns: string[];
  type: BDSchemaIndexType;
}

enum BDBoardType {
  scrum = "scrum",
  kanban = "kanban",
}

interface BDBoard {
  project: BDProject;
  name: string;
  type: BDBoardType;
  sprint?: BDSprint;
  columns: BDBoardColumn[];
  swimlanes?: BDSwimlane[];
  tasks: BDBoardTask[];
  customFields?: BDBoardCustomField[];
  quickFilters?: BDBoardQuickFilter[];
}

interface BDBoardColumn {
  board: BDBoard;
  name: string;
  status: BDBoardTaskStatusType;
  position: number;
  wipLimit?: number;
  mappedStatuses?: BDBoardTaskStatusType[];
}

interface BDSwimlane {
  board: BDBoard;
  name: string;
  field: string;
  position: number;
  collapsed?: boolean;
}

interface BDBoardFilter {
  field: string;
  operator: "eq" | "neq" | "in" | "contains" | "gt" | "lt";
  value: unknown;
}

interface BDBoardQuickFilter {
  name: string;
  icon?: string;
  filters: BDBoardFilter[];
}

interface BDBoardTask {
  board: BDBoard;
  key: string;
  name: string;
  description: string;
  type: BDIssueType;
  status: BDBoardTaskStatusType;
  priority: BDPriority;
  resolution?: BDResolution;
  storyPoints?: number;
  rank: number;
  epic?: BDBoardTask;
  parent?: BDBoardTask;
  subtasks: BDBoardTask[];
  sprint?: BDSprint;
  component?: BDComponent;
  version?: BDVersion;
  fixVersions?: BDVersion[];
  labels: BDLabel[];
  assignee?: BDProjectMember;
  reporter?: BDProjectMember;
  watchers: BDProjectMember[];
  votes: number;
  dueDate?: string;
  startDate?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  timeTracking: BDTimeTracking;
  customFields?: BDBoardTaskCustomField[];
  comments: BDBoardTaskComment[];
  attachments: BDAttachment[];
  links: BDIssueLink[];
  agentTasks: BDAgentTask[];
}

interface BDTimeTracking {
  originalEstimate?: number;
  remainingEstimate?: number;
  timeSpent?: number;
}

interface BDIssueLink {
  task: BDBoardTask;
  type: BDLinkType;
  target: BDBoardTask;
  createdAt: string;
}

interface BDAttachment {
  task?: BDBoardTask;
  architecture?: BDArchitecture;
  name: string;
  url: string;
  mime?: string;
  size?: number;
  createdAt: string;
}

interface BDBoardTaskStatusType {
  name: string;
  position: number;
  status: BDTaskStatusType;
  category: BDBoardTaskStatusCategory;
  color?: string;
}

interface BDBoardCustomField {
  name: string;
  slug: string;
  position?: number;
  type: BDCustomFieldType;
}

interface BDBoardTaskComment {
  task: BDBoardTask;
  author?: BDProjectMember;
  comment: string;
  replyTo?: BDBoardTaskComment;
  createdAt: string;
  editedAt?: string;
}

interface BDBoardTaskCustomField {
  customField: BDBoardCustomField;
  task: BDBoardTask;
  value: string;
}

enum BDAgentTaskStatus {
  pending = "pending",
  queued = "queued",
  processing = "processing",
  handoff = "handoff",
  blocked = "blocked",
  finished = "finished",
  failed = "failed",
}

enum BDAgentHandoffState {
  requested = "requested",
  accepted = "accepted",
  running = "running",
  waitingInput = "waitingInput",
  returned = "returned",
  rejected = "rejected",
  failed = "failed",
}

enum BDAgentHandoffPolicy {
  manual = "manual",
  assisted = "assisted",
  auto = "auto",
}

interface BDAgentCapability {
  name: string;
  description?: string;
}

interface BDAgent {
  name: string;
  prompt: string;
  description?: string;
  avatar?: string;
  model?: string;
  provider?: string;
  capabilities: BDAgentCapability[];
  enabled: boolean;
}

interface BDAgentHandoff {
  task: BDBoardTask;
  from?: BDProjectMember;
  to: BDAgent;
  state: BDAgentHandoffState;
  instruction: string;
  summary?: string;
  artifacts?: string[];
  tokensUsed?: number;
  cost?: number;
  requestedAt: string;
  startedAt?: string;
  finishedAt?: string;
}

interface BDAgentRun {
  agentTask: BDAgentTask;
  startedAt: string;
  finishedAt?: string;
  iterations: number;
  toolCalls: number;
  logs: string[];
  error?: string;
}

interface BDAgentTask {
  board: BDBoard;
  task: BDBoardTask;
  agent: BDAgent;
  status: BDAgentTaskStatus;
  handoff?: BDAgentHandoff;
  run?: BDAgentRun;
}

interface BDAgentSettings {
  project: BDProject;
  concurrent: number;
  active: boolean;
  autoAssign: boolean;
  allowHandoff: boolean;
  handoffPolicy: BDAgentHandoffPolicy;
  defaultAgent?: BDAgent;
  escalationAgent?: BDAgent;
  maxIterations?: number;
  maxTokens?: number;
}

// ================== App Builder ==================
// App (Filament-style panel builder)
type BDAppBreakpoint = "sm" | "md" | "lg" | "xl" | "2xl";
type BDAppColumnSpan = number | "full";
type BDAppResponsive<T> = T | Partial<Record<BDAppBreakpoint, T>>;
type BDAppColor =
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "gray";
type BDAppVariant =
  | "default"
  | "primary"
  | "secondary"
  | "danger"
  | "soft"
  | "outline"
  | "ghost"
  | "link";
type BDAppSize = "sm" | "md" | "lg" | "xl";
type BDAppAlign = "start" | "center" | "end";
type BDAppVisibility<TRecord = unknown> =
  | boolean
  | ((record: TRecord) => boolean);
type BDAppHref<TRecord = unknown> = string | ((record: TRecord) => string);

type BDAppFieldType =
  | "text"
  | "textarea"
  | "richEditor"
  | "markdown"
  | "code"
  | "slug"
  | "hidden"
  | "select"
  | "multiSelect"
  | "radio"
  | "checkbox"
  | "checkboxList"
  | "toggle"
  | "toggleButtons"
  | "date"
  | "time"
  | "dateTime"
  | "color"
  | "tags"
  | "keyValue"
  | "fileUpload"
  | "image"
  | "repeater"
  | "builder"
  | "relationSelect";

type BDAppLayoutType =
  | "section"
  | "grid"
  | "tabs"
  | "wizard"
  | "fieldset"
  | "split"
  | "group"
  | "card"
  | "callout"
  | "placeholder";

type BDAppEntryType =
  | "text"
  | "badge"
  | "icon"
  | "image"
  | "color"
  | "boolean"
  | "date"
  | "keyValue"
  | "repeatable";

type BDAppColumnType =
  | "text"
  | "badge"
  | "icon"
  | "image"
  | "color"
  | "boolean"
  | "date"
  | "dateTime"
  | "since"
  | "money"
  | "numeric"
  | "tags"
  | "select"
  | "toggle"
  | "progress"
  | "action";

type BDAppFilterType =
  | "select"
  | "multiSelect"
  | "ternary"
  | "queryBuilder"
  | "date"
  | "trashed"
  | "custom";

type BDAppWidgetType = "stats" | "chart" | "table" | "account";

type BDAppChartType =
  | "line"
  | "bar"
  | "pie"
  | "doughnut"
  | "radar"
  | "polarArea";

type BDAppActionType =
  | "button"
  | "link"
  | "iconButton"
  | "bulk"
  | "header"
  | "toolbar"
  | "row"
  | "modal"
  | "confirm"
  | "form"
  | "create"
  | "edit"
  | "view"
  | "delete"
  | "replicate"
  | "restore"
  | "forceDelete";

type BDAppPageType =
  | "dashboard"
  | "list"
  | "create"
  | "edit"
  | "view"
  | "settings"
  | "custom";

type BDAppComponent = BDAppLayout | BDAppField | BDAppEntry;

interface BDAppReactive {
  dependsOn: string[];
  update: (
    value: unknown,
    get: (name: string) => unknown,
    set: (name: string, value: unknown) => void,
  ) => void;
}

interface BDAppRelation {
  name: string;
  titleAttribute: string;
  multiple?: boolean;
  searchable?: boolean;
  preload?: boolean;
  createOption?: boolean;
  model?: BDSchemaModel;
}

interface BDAppFieldBlock {
  name: string;
  label: string;
  icon?: string;
  maxItems?: number;
  fields: BDAppField[];
}

interface BDAppField {
  kind: "field";
  type: BDAppFieldType;
  name: string;
  label?: string;
  helperText?: string;
  placeholder?: string;
  default?: unknown;
  required?: boolean;
  disabled?: boolean;
  hidden?: boolean;
  live?: boolean;
  columnSpan?: BDAppColumnSpan;
  rules?: string[];
  options?: Record<string, string> | (() => Record<string, string>);
  accept?: string;
  maxItems?: number;
  minItems?: number;
  relation?: BDAppRelation;
  fields?: BDAppField[];
  blocks?: BDAppFieldBlock[];
  reactive?: BDAppReactive;
}

interface BDAppLayout {
  kind: "layout";
  type: BDAppLayoutType;
  heading?: string;
  description?: string;
  icon?: string;
  columnSpan?: BDAppColumnSpan;
  columns?: BDAppResponsive<number>;
  collapsible?: boolean;
  collapsed?: boolean;
  compact?: boolean;
  tabs?: BDAppTab[];
  steps?: BDAppStep[];
  components?: BDAppComponent[];
}

interface BDAppTab {
  label: string;
  icon?: string;
  badge?: string | number;
  components: BDAppComponent[];
}

interface BDAppStep {
  label: string;
  description?: string;
  icon?: string;
  components: BDAppComponent[];
}

interface BDAppEntry {
  kind: "entry";
  type: BDAppEntryType;
  name: string;
  label?: string;
  icon?: string;
  color?: BDAppColor;
  columnSpan?: BDAppColumnSpan;
  format?: (value: unknown, record: unknown) => string;
}

interface BDAppSchema {
  components: BDAppComponent[];
  columns?: BDAppResponsive<number>;
}

interface BDAppColumnMapping {
  model: BDSchemaModel;
  key?: string;
  label?: string;
  fallback?: string;
}

interface BDAppColumn<TRow = unknown> {
  type: BDAppColumnType;
  name: string;
  label?: string;
  sortable?: boolean;
  searchable?: boolean;
  toggleable?: boolean;
  align?: BDAppAlign;
  width?: number | string;
  color?: BDAppColor | Record<string, BDAppColor>;
  icon?: string | Record<string, string>;
  format?: (value: unknown, record: TRow) => string;
  mapping?: BDAppColumnMapping;
}

interface BDAppFilter {
  type: BDAppFilterType;
  name: string;
  label?: string;
  multiple?: boolean;
  default?: unknown;
  options?: Record<string, string>;
  query?: (query: unknown, value: unknown) => unknown;
}

interface BDAppPagination {
  mode?: "default" | "simple" | "cursor";
  pageOptions?: number[];
  defaultPerPage?: number;
}

interface BDAppEmptyState {
  heading?: string;
  description?: string;
  icon?: string;
  actions?: BDAppAction[];
}

interface BDAppTable<TRow = unknown> {
  columns: BDAppColumn<TRow>[];
  filters?: BDAppFilter[];
  headerActions?: BDAppAction<TRow>[];
  toolbarActions?: BDAppAction<TRow>[];
  rowActions?: BDAppAction<TRow>[];
  bulkActions?: BDAppAction<TRow>[];
  defaultSort?: { column: string; direction: "asc" | "desc" };
  pagination?: BDAppPagination;
  groups?: string[];
  reorderable?: boolean;
  striped?: boolean;
  stickyHeader?: boolean;
  deferLoading?: boolean;
  pollInterval?: string;
  recordUrl?: BDAppHref<TRow>;
  recordAction?: BDAppAction<TRow>;
  emptyState?: BDAppEmptyState;
}

interface BDAppConfirmation {
  heading?: string;
  description?: string;
  submitLabel?: string;
  cancelLabel?: string;
  variant?: BDAppVariant;
  requiresPassword?: boolean;
}

interface BDAppNotification {
  title?: string;
  body?: string;
  status?: BDAppColor;
  icon?: string;
  duration?: number;
}

interface BDAppAction<TRow = unknown> {
  name: string;
  type: BDAppActionType;
  label?: string;
  icon?: string;
  color?: BDAppColor;
  variant?: BDAppVariant;
  size?: BDAppSize;
  url?: BDAppHref<TRow>;
  action?: (
    record: TRow | undefined,
    data: Record<string, unknown>,
  ) => void | Promise<void>;
  form?: BDAppSchema;
  confirmation?: BDAppConfirmation;
  notification?: BDAppNotification;
  visible?: BDAppVisibility<TRow>;
  disabled?: BDAppVisibility<TRow>;
  bulk?: boolean;
  shortcut?: string;
}

interface BDAppDataset {
  label: string;
  data: number[];
  color?: BDAppColor;
}

interface BDAppChart {
  type: BDAppChartType;
  labels: string[];
  datasets: BDAppDataset[];
  height?: number;
}

interface BDAppStat {
  label: string;
  value: string | number;
  description?: string;
  icon?: string;
  color?: BDAppColor;
  chart?: number[];
  trend?: "up" | "down" | "flat";
  url?: string;
}

interface BDAppWidget {
  name: string;
  type: BDAppWidgetType;
  sort?: number;
  columnSpan?: BDAppResponsive<number>;
  page?: string;
  stats?: BDAppStat[];
  chart?: BDAppChart;
  table?: BDAppTable;
  account?: boolean;
  visible?: BDAppVisibility;
}

interface BDAppNavigationItem {
  label: string;
  slug?: string;
  url?: string;
  icon?: string;
  activeIcon?: string;
  badge?: string | number;
  badgeColor?: BDAppColor;
  sort?: number;
  group?: string;
  target?: "_self" | "_blank";
  visible?: BDAppVisibility;
}

interface BDAppNavigationGroup {
  label: string;
  icon?: string;
  collapsible?: boolean;
  collapsed?: boolean;
  sort?: number;
}

interface BDAppNavigation {
  items?: BDAppNavigationItem[];
  groups?: BDAppNavigationGroup[];
  collapsible?: boolean;
  width?: string;
  topNavigation?: boolean;
}

interface BDAppGlobalSearch {
  enabled?: boolean;
  attributes: string[];
  titleAttribute?: string;
  resultLimit?: number;
}

interface BDAppAuthorization {
  policy?: string;
  canViewAny?: boolean | string;
  canView?: boolean | string;
  canCreate?: boolean | string;
  canEdit?: boolean | string;
  canDelete?: boolean | string;
  canDeleteAny?: boolean | string;
}

interface BDAppRelationManager {
  relationship: string;
  title?: string;
  icon?: string;
  form?: BDAppSchema;
  table?: BDAppTable;
  readOnly?: boolean;
  pages?: string[];
}

interface BDAppPage {
  type: BDAppPageType;
  name: string;
  slug: string;
  path?: string;
  title?: string;
  icon?: string;
  schema?: BDAppSchema;
  table?: BDAppTable;
  headerActions?: BDAppAction[];
  headerWidgets?: BDAppWidget[];
  footerWidgets?: BDAppWidget[];
  navigation?: BDAppNavigationItem;
  authorization?: BDAppAuthorization;
}

interface BDAppResourcePages {
  index?: BDAppPage;
  create?: BDAppPage;
  edit?: BDAppPage;
  view?: BDAppPage;
  custom?: BDAppPage[];
}

interface BDAppResource {
  name: string;
  slug: string;
  label?: string;
  pluralLabel?: string;
  model?: BDSchemaModel;
  icon?: string;
  color?: BDAppColor;
  navigation?: BDAppNavigationItem;
  form?: BDAppSchema;
  infolist?: BDAppSchema;
  table?: BDAppTable;
  pages?: BDAppResourcePages;
  relations?: BDAppRelationManager[];
  actions?: BDAppAction[];
  globalSearch?: BDAppGlobalSearch;
  authorization?: BDAppAuthorization;
  widgets?: BDAppWidget[];
  recordTitleAttribute?: string;
  cluster?: string;
  tenantScoped?: boolean;
  timestamps?: boolean;
  softDeletes?: boolean;
}

interface BDAppCluster {
  name: string;
  slug: string;
  icon?: string;
  navigation?: BDAppNavigationItem;
  resources?: BDAppResource[];
  pages?: BDAppPage[];
}

interface BDAppTheme {
  mode?: "light" | "dark" | "system";
  primary?: BDAppColor | string;
  colors?: Partial<Record<BDAppColor, string>>;
  font?: string;
  radius?: BDAppSize | string;
  darkMode?: boolean;
}

interface BDAppBrand {
  name: string;
  logo?: string;
  logoHeight?: number;
  favicon?: string;
  colors?: Partial<Record<BDAppColor, string>>;
}

interface BDAppAuth {
  guard?: string;
  provider?: string;
  login?: boolean;
  registration?: boolean;
  passwordReset?: boolean;
  emailVerification?: boolean;
  profile?: boolean;
  redirectTo?: string;
}

interface BDAppTenancy {
  model: string;
  slugAttribute: string;
  ownershipRelationship: string;
  tenantMenu?: boolean;
  billing?: boolean;
}

interface BDAppNotificationSettings {
  enabled?: boolean;
  position?:
    | "top-start"
    | "top-center"
    | "top-end"
    | "bottom-start"
    | "bottom-center"
    | "bottom-end";
  duration?: number;
  width?: string;
}

interface BDAppPlugin {
  name: string;
  version?: string;
  resources?: BDAppResource[];
  widgets?: BDAppWidget[];
  pages?: BDAppPage[];
  assets?: string[];
}

interface BDApp {
  project: BDProject;
  name: string;
  slug: string;
  path: string;
  domain?: string;
  theme?: BDAppTheme;
  brand?: BDAppBrand;
  colors?: Partial<Record<BDAppColor, string>>;
  navigation?: BDAppNavigation;
  clusters?: BDAppCluster[];
  resources: BDAppResource[];
  pages?: BDAppPage[];
  widgets?: BDAppWidget[];
  globalSearch?: BDAppGlobalSearch;
  tenancy?: BDAppTenancy;
  auth?: BDAppAuth;
  notifications?: BDAppNotificationSettings;
  plugins?: BDAppPlugin[];
  middleware?: string[];
  default?: BDAppPage;
}

// ================== Diagram ==================
// Add New Feature For Diagram
type BDDiagramType =
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

type BDDiagramDirection = "TB" | "TD" | "BT" | "RL" | "LR";

type BDDiagramRenderer =
  | "mermaid"
  | "reactflow"
  | "excalidraw"
  | "canvas"
  | "svg";

interface BDDiagramRenderMap {
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

type BDDiagramNodeShape =
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

interface BDDiagramNodeBase {
  parentDiagram?: BDDiagram;
  id: string;
  label: string;
  icon?: string;
  color?: BDAppColor;
  position?: { x: number; y: number };
  parentId?: string;
  data?: Record<string, unknown>;
}

interface BDFlowchartNode extends BDDiagramNodeBase {
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

interface BDSequenceNode extends BDDiagramNodeBase {
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

interface BDClassMember {
  name: string;
  type?: string;
  visibility?: "+" | "-" | "#" | "~";
  static?: boolean;
  abstract?: boolean;
}

interface BDClassNode extends BDDiagramNodeBase {
  diagram: "class";
  kind: "class" | "interface" | "enum" | "abstract";
  attributes?: BDClassMember[];
  methods?: BDClassMember[];
  generic?: string;
}

interface BDStateNode extends BDDiagramNodeBase {
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

interface BDERField {
  name: string;
  type: string;
  key?: "PK" | "FK" | "UK";
  nullable?: boolean;
  comment?: string;
}

interface BDERNode extends BDDiagramNodeBase {
  diagram: "er";
  kind: "entity";
  fields: BDERField[];
}

interface BDGanttNode extends BDDiagramNodeBase {
  diagram: "gantt";
  kind: "section" | "task" | "milestone";
  start?: string;
  duration?: string;
  end?: string;
  status?: "done" | "active" | "crit" | "milestone";
  dependsOn?: string[];
  section?: string;
}

interface BDPieNode extends BDDiagramNodeBase {
  diagram: "pie";
  kind: "slice";
  value: number;
}

interface BDMindmapNode extends BDDiagramNodeBase {
  diagram: "mindmap";
  kind: "root" | "branch" | "leaf";
  shape?: BDDiagramNodeShape;
}

interface BDTimelineNode extends BDDiagramNodeBase {
  diagram: "timeline";
  kind: "period" | "event";
  period?: string;
  events?: string[];
}

interface BDJourneyNode extends BDDiagramNodeBase {
  diagram: "journey";
  kind: "section" | "task";
  score?: number;
  actors?: string[];
  section?: string;
}

interface BDGitNode extends BDDiagramNodeBase {
  diagram: "gitgraph";
  kind: "commit" | "branch" | "merge" | "cherryPick";
  branch?: string;
  tag?: string;
  commitId?: string;
  parent?: string;
}

interface BDC4Node extends BDDiagramNodeBase {
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

interface BDBlockNode extends BDDiagramNodeBase {
  diagram: "block";
  kind: "block" | "space" | "composite";
  columns?: number;
  width?: number;
}

interface BDRequirementNode extends BDDiagramNodeBase {
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

interface BDDiagramNodeMap {
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

type BDDiagramNodeFor<T extends BDDiagramType> = BDDiagramNodeMap[T];

type BDDiagramRenderFor<T extends BDDiagramType> = BDDiagramRenderMap[T];

type BDDiagramNode =
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

type BDDiagramEdgeType =
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

interface BDDiagramEdge {
  parentDiagram?: BDDiagram;
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

interface BDDiagramBase<T extends BDDiagramType> {
  project: BDProject;
  id: string;
  name: string;
  title?: string;
  type: T;
  render: BDDiagramRenderFor<T>;
  direction?: BDDiagramDirection;
  nodes: BDDiagramNodeFor<T>[];
  edges: BDDiagramEdge[];
  parent?: BDDiagram;
  meta?: Record<string, unknown>;
}

type BDDiagramFlowchart = BDDiagramBase<"flowchart">;
type BDDiagramSequence = BDDiagramBase<"sequence">;
type BDDiagramClass = BDDiagramBase<"class">;
type BDDiagramState = BDDiagramBase<"state">;
type BDDiagramER = BDDiagramBase<"er">;
type BDDiagramGantt = BDDiagramBase<"gantt">;
type BDDiagramPie = BDDiagramBase<"pie">;
type BDDiagramMindmap = BDDiagramBase<"mindmap">;
type BDDiagramTimeline = BDDiagramBase<"timeline">;
type BDDiagramJourney = BDDiagramBase<"journey">;
type BDDiagramGitgraph = BDDiagramBase<"gitgraph">;
type BDDiagramC4 = BDDiagramBase<"c4">;
type BDDiagramBlock = BDDiagramBase<"block">;
type BDDiagramRequirement = BDDiagramBase<"requirement">;

type BDDiagram =
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


// ================== Architecture ==================
type BDArchitectureType =
  | "architecture"
  | "plan"
  | "adr"
  | "rfc"
  | "design"
  | "spec"
  | "roadmap"
  | "runbook"
  | "postmortem"
  | "readme"
  | "changelog"
  | "guide"
  | "proposal";

type BDArchitectureStatus =
  | "draft"
  | "review"
  | "proposed"
  | "accepted"
  | "rejected"
  | "superseded"
  | "deprecated"
  | "inProgress"
  | "completed"
  | "archived";

type BDArchitectureFormat = "markdown" | "mdx" | "asciidoc";

type BDArchitectureLinkType =
  | "supersedes"
  | "supersededBy"
  | "dependsOn"
  | "relatedTo"
  | "implements"
  | "references"
  | "blocks"
  | "blockedBy";

interface BDArchitectureReference {
  architecture: BDArchitecture;
  title: string;
  url?: string;
  path?: string;
}

interface BDArchitectureLink {
  architecture: BDArchitecture;
  type: BDArchitectureLinkType;
  target: BDArchitecture;
}

interface BDArchitectureReview {
  architecture: BDArchitecture;
  reviewer: BDProjectMember;
  status: "pending" | "approved" | "changesRequested";
  comment?: string;
  createdAt: string;
}

interface BDArchitectureSection {
  architecture: BDArchitecture;
  title: string;
  level: 1 | 2 | 3 | 4 | 5 | 6;
  anchor: string;
  content: string;
  position: number;
  children?: BDArchitectureSection[];
  diagrams?: BDDiagram[];
  models?: BDSchemaModel[];
}

interface BDArchitectureStep {
  architecture: BDArchitecture;
  position: number;
  title: string;
  command?: string;
  expected?: string;
}

interface BDPlanMilestone {
  architecture: BDArchitecture;
  name: string;
  description?: string;
  dueDate?: string;
  status: BDArchitectureStatus;
  position: number;
}

interface BDRisk {
  architecture: BDArchitecture;
  description: string;
  impact: "low" | "medium" | "high";
  likelihood: "low" | "medium" | "high";
  mitigation?: string;
}

interface BDChangelogChange {
  kind: "added" | "changed" | "fixed" | "removed" | "deprecated" | "security";
  description: string;
}

interface BDChangelogEntry {
  architecture: BDArchitecture;
  version: string;
  date: string;
  changes: BDChangelogChange[];
}

interface BDArchitectureBase<T extends BDArchitectureType> {
  project: BDProject;
  id: string;
  name: string;
  slug: string;
  type: T;
  status: BDArchitectureStatus;
  format: BDArchitectureFormat;
  summary?: string;
  content?: string;
  sections: BDArchitectureSection[];
  diagrams?: BDDiagram[];
  models?: BDSchemaModel[];
  tags?: BDLabel[];
  authors?: BDProjectMember[];
  reviewers?: BDArchitectureReview[];
  references?: BDArchitectureReference[];
  links?: BDArchitectureLink[];
  attachments?: BDAttachment[];
  version?: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
}

interface BDArchitectureAdr extends BDArchitectureBase<"adr"> {
  number: number;
  context: string;
  decision: string;
  consequences: string;
  alternatives?: string;
  deciders?: BDProjectMember[];
  decisionDate?: string;
}

interface BDArchitectureRfc extends BDArchitectureBase<"rfc"> {
  number: number;
  motivation: string;
  proposal: string;
  drawbacks?: string;
  alternatives?: string;
  unresolvedQuestions?: string[];
}

interface BDArchitecturePlan extends BDArchitectureBase<"plan"> {
  goal?: string;
  milestones: BDPlanMilestone[];
  sprintRefs?: BDSprint[];
  taskRefs?: BDBoardTask[];
}

interface BDArchitectureDesign extends BDArchitectureBase<"design"> {
  goals: string[];
  nonGoals?: string[];
  constraints?: string[];
  risks?: BDRisk[];
  openQuestions?: string[];
}

interface BDArchitectureSpec extends BDArchitectureBase<"spec"> {
  requirements: string[];
  acceptanceCriteria?: string[];
  apiRefs?: string[];
}

interface BDArchitectureRoadmap extends BDArchitectureBase<"roadmap"> {
  horizon?: string;
  phases: BDPlanMilestone[];
}

interface BDArchitectureRunbook extends BDArchitectureBase<"runbook"> {
  trigger?: string;
  steps: BDArchitectureStep[];
  rollback?: BDArchitectureStep[];
  escalation?: string;
}

interface BDArchitecturePostmortem extends BDArchitectureBase<"postmortem"> {
  incidentDate: string;
  severity: "sev1" | "sev2" | "sev3" | "sev4";
  impact?: string;
  rootCause?: string;
  timeline?: BDArchitectureStep[];
  actionItems?: string[];
}

interface BDArchitectureChangelog extends BDArchitectureBase<"changelog"> {
  entries: BDChangelogEntry[];
}

type BDArchitecture =
  | BDArchitectureBase<"architecture">
  | BDArchitectureBase<"readme">
  | BDArchitectureBase<"guide">
  | BDArchitectureBase<"proposal">
  | BDArchitectureAdr
  | BDArchitectureRfc
  | BDArchitecturePlan
  | BDArchitectureDesign
  | BDArchitectureSpec
  | BDArchitectureRoadmap
  | BDArchitectureRunbook
  | BDArchitecturePostmortem
  | BDArchitectureChangelog;

// ================= Project Folder and File ==================
enum BDProjectFileKind {
  file = "file",
  image = "image",
  video = "video",
  audio = "audio",
  archive = "archive",
  document = "document",
  spreadsheet = "spreadsheet",
  presentation = "presentation",
  code = "code",
  markdown = "markdown",
  json = "json",
  binary = "binary",
  symlink = "symlink",
  other = "other",
}

enum BDProjectFileEncoding {
  utf8 = "utf8",
  base64 = "base64",
  hex = "hex",
  binary = "binary",
}

enum BDProjectFileStatus {
  draft = "draft",
  saved = "saved",
  modified = "modified",
  deleted = "deleted",
  archived = "archived",
}

interface BDProjectFolder {
  project: BDProject;
  parent?: BDProjectFolder;
  name: string;
  path: string;
  description?: string;
  icon?: string;
  color?: BDAppColor;
  position: number;
  hidden?: boolean;
  locked?: boolean;
  virtual?: boolean;
  collapsed?: boolean;
  files: BDProjectFile[];
  folders: BDProjectFolder[];
  createdAt?: string;
  updatedAt?: string;
}

interface BDProjectFileContent {
  file: BDProjectFile;
  encoding: BDProjectFileEncoding;
  data: string;
  language?: string;
  lines?: number;
  checksum?: string;
  updatedAt: string;
}

interface BDProjectFileVersion {
  file: BDProjectFile;
  revision: number;
  message?: string;
  content: BDProjectFileContent;
  author?: BDProjectMember;
  createdAt: string;
}

interface BDProjectFile {
  project: BDProject;
  folder?: BDProjectFolder;
  name: string;
  path: string;
  extension?: string;
  kind: BDProjectFileKind;
  status: BDProjectFileStatus;
  description?: string;
  mime?: string;
  size: number;
  content?: BDProjectFileContent;
  versions?: BDProjectFileVersion[];
  revision: number;
  binary?: boolean;
  readonly?: boolean;
  hidden?: boolean;
  locked?: boolean;
  virtual?: boolean;
  author?: BDProjectMember;
  updatedBy?: BDProjectMember;
  createdAt: string;
  updatedAt: string;
  accessedAt?: string;
  archivedAt?: string;
}

// ================== Outline ==================
// BDOutline contains topic, guides, and other content types that are necessarily tied to a specific project.
//  It can be used for knowledge bases, documentation, tutorials, and other informational resources.
enum BDOutlineType {
  knowledgeBase = "knowledgeBase",
  documentation = "documentation",
  guide = "guide",
  tutorial = "tutorial",
  book = "book",
  manual = "manual",
  reference = "reference",
  wiki = "wiki",
  faq = "faq",
  glossary = "glossary",
  notes = "notes",
}

enum BDOutlineStatus {
  draft = "draft",
  review = "review",
  published = "published",
  outdated = "outdated",
  archived = "archived",
}

enum BDOutlineTopicType {
  part = "part",
  chapter = "chapter",
  section = "section",
  topic = "topic",
  subtopic = "subtopic",
  guide = "guide",
  article = "article",
  lesson = "lesson",
  step = "step",
  exercise = "exercise",
  example = "example",
  reference = "reference",
  appendix = "appendix",
}

enum BDOutlineContentType {
  heading = "heading",
  paragraph = "paragraph",
  list = "list",
  checklist = "checklist",
  table = "table",
  code = "code",
  diagram = "diagram",
  model = "model",
  image = "image",
  video = "video",
  audio = "audio",
  quote = "quote",
  callout = "callout",
  tabs = "tabs",
  steps = "steps",
  accordion = "accordion",
  formula = "formula",
  embed = "embed",
  attachment = "attachment",
  quiz = "quiz",
}

enum BDOutlineDifficulty {
  beginner = "beginner",
  easy = "easy",
  intermediate = "intermediate",
  advanced = "advanced",
  expert = "expert",
}

enum BDOutlineAudience {
  general = "general",
  endUser = "endUser",
  developer = "developer",
  admin = "admin",
  operator = "operator",
  executive = "executive",
}

enum BDOutlineVisibility {
  private = "private",
  project = "project",
  public = "public",
}

enum BDOutlineLinkType {
  relatesTo = "relatesTo",
  prerequisite = "prerequisite",
  seeAlso = "seeAlso",
  references = "references",
  summarizes = "summarizes",
  expands = "expands",
  replaces = "replaces",
  translatedFrom = "translatedFrom",
}

enum BDOutlineGenerationMode {
  outline = "outline",
  expand = "expand",
  continue = "continue",
  rewrite = "rewrite",
  summarize = "summarize",
  translate = "translate",
  restructure = "restructure",
  review = "review",
}

enum BDOutlineGenerationStatus {
  pending = "pending",
  queued = "queued",
  generating = "generating",
  finished = "finished",
  failed = "failed",
  cancelled = "cancelled",
}

enum BDOutlineSourceType {
  text = "text",
  url = "url",
  file = "file",
  markdown = "markdown",
  diagram = "diagram",
  model = "model",
  task = "task",
  architecture = "architecture",
  comment = "comment",
  conversation = "conversation",
}

enum BDOutlineReviewStatus {
  pending = "pending",
  approved = "approved",
  changesRequested = "changesRequested",
  rejected = "rejected",
}

enum BDOutlineExportFormat {
  markdown = "markdown",
  html = "html",
  pdf = "pdf",
  epub = "epub",
  docx = "docx",
  json = "json",
}

interface BDOutline {
  project: BDProject;
  id: string;
  name: string;
  title?: string;
  slug: string;
  description?: string;
  type: BDOutlineType;
  status: BDOutlineStatus;
  format: BDArchitectureFormat;
  cover?: string;
  icon?: string;
  color?: BDAppColor;
  topics: BDOutlineTopic[];
  guides: BDOutlineGuide[];
  settings: BDOutlineSettings;
  template?: BDOutlineTemplate;
  sources?: BDOutlineSource[];
  reviews?: BDOutlineReview[];
  comments?: BDOutlineComment[];
  links?: BDOutlineLink[];
  exports?: BDOutlineExport[];
  attachments?: BDAttachment[];
  tags?: BDLabel[];
  authors?: BDProjectMember[];
  owner?: BDProjectMember;
  stats?: BDOutlineStats;
  visibility?: BDOutlineVisibility;
  version?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
}

interface BDOutlineSettings {
  language?: string;
  tone?: string;
  audience?: BDOutlineAudience;
  difficulty?: BDOutlineDifficulty;
  autoNumbering?: boolean;
  includeTableOfContents?: boolean;
  includeSummaries?: boolean;
  includeDiagrams?: boolean;
  includeExamples?: boolean;
  includeExercises?: boolean;
  citationStyle?: "none" | "inline" | "footnote" | "numbered";
  maxDepth?: number;
  targetWords?: number;
  autoGenerate?: boolean;
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  seo?: BDOutlineSeo;
}

interface BDOutlineSeo {
  title?: string;
  description?: string;
  keywords?: string[];
  canonicalUrl?: string;
  noIndex?: boolean;
}

interface BDOutlineTopic {
  outline: BDOutline;
  parent?: BDOutlineTopic;
  children: BDOutlineTopic[];
  type: BDOutlineTopicType;
  title: string;
  slug: string;
  anchor: string;
  number?: string;
  summary?: string;
  description?: string;
  position: number;
  status: BDOutlineStatus;
  content: BDOutlineContent[];
  sources?: BDOutlineSource[];
  generations?: BDOutlineGeneration[];
  diagrams?: BDDiagram[];
  models?: BDSchemaModel[];
  attachments?: BDAttachment[];
  links?: BDOutlineLink[];
  difficulty?: BDOutlineDifficulty;
  audience?: BDOutlineAudience;
  tags?: BDLabel[];
  visibility?: BDOutlineVisibility;
  estimatedReadingTime?: number;
  wordCount?: number;
  collapsed?: boolean;
  hidden?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface BDOutlineContentItem {
  text: string;
  checked?: boolean;
  children?: BDOutlineContentItem[];
}

interface BDOutlineContent {
  outline: BDOutline;
  topic?: BDOutlineTopic;
  guide?: BDOutlineGuide;
  kind: BDOutlineContentType;
  position: number;
  title?: string;
  text?: string;
  format?: BDArchitectureFormat;
  language?: string;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  items?: BDOutlineContentItem[];
  columns?: string[];
  rows?: string[][];
  diagram?: BDDiagram;
  model?: BDSchemaModel;
  attachment?: BDAttachment;
  url?: string;
  children?: BDOutlineContent[];
  sources?: BDOutlineSource[];
  generated?: boolean;
  generation?: BDOutlineGeneration;
  createdAt?: string;
  updatedAt?: string;
}

interface BDOutlineGuideStep {
  guide: BDOutlineGuide;
  position: number;
  title: string;
  instruction: string;
  command?: string;
  expected?: string;
  tip?: string;
  content?: BDOutlineContent[];
  attachment?: BDAttachment;
}

interface BDOutlineGuide {
  outline: BDOutline;
  topic?: BDOutlineTopic;
  title: string;
  slug: string;
  summary?: string;
  description?: string;
  steps: BDOutlineGuideStep[];
  prerequisites?: string[];
  content?: BDOutlineContent[];
  diagrams?: BDDiagram[];
  attachments?: BDAttachment[];
  difficulty?: BDOutlineDifficulty;
  audience?: BDOutlineAudience;
  estimatedTime?: number;
  status: BDOutlineStatus;
  position: number;
  tags?: BDLabel[];
  createdAt: string;
  updatedAt: string;
}

interface BDOutlineSource {
  outline: BDOutline;
  topic?: BDOutlineTopic;
  guide?: BDOutlineGuide;
  type: BDOutlineSourceType;
  name: string;
  url?: string;
  path?: string;
  content?: string;
  attachment?: BDAttachment;
  diagram?: BDDiagram;
  model?: BDSchemaModel;
  task?: BDBoardTask;
  architecture?: BDArchitecture;
  weight?: number;
  createdAt: string;
}

interface BDOutlineGeneration {
  outline: BDOutline;
  topic?: BDOutlineTopic;
  mode: BDOutlineGenerationMode;
  status: BDOutlineGenerationStatus;
  instruction?: string;
  prompt?: string;
  provider?: string;
  model?: string;
  options?: Record<string, unknown>;
  result?: BDOutlineContent[];
  sources?: BDOutlineSource[];
  tokensUsed?: number;
  cost?: number;
  requestedAt: string;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
}

interface BDOutlineTemplateTopic {
  title: string;
  type: BDOutlineTopicType;
  summary?: string;
  prompts?: string[];
  children?: BDOutlineTemplateTopic[];
}

interface BDOutlineTemplate {
  project: BDProject;
  name: string;
  description?: string;
  type: BDOutlineType;
  icon?: string;
  structure: BDOutlineTemplateTopic[];
  settings?: BDOutlineSettings;
  sources?: BDOutlineSource[];
}

interface BDOutlineReview {
  outline: BDOutline;
  topic?: BDOutlineTopic;
  reviewer: BDProjectMember;
  status: BDOutlineReviewStatus;
  comment?: string;
  createdAt: string;
}

interface BDOutlineComment {
  outline: BDOutline;
  topic?: BDOutlineTopic;
  content?: BDOutlineContent;
  author?: BDProjectMember;
  comment: string;
  resolved?: boolean;
  replyTo?: BDOutlineComment;
  createdAt: string;
  editedAt?: string;
}

interface BDOutlineLink {
  outline: BDOutline;
  topic?: BDOutlineTopic;
  type: BDOutlineLinkType;
  targetTopic?: BDOutlineTopic;
  targetOutline?: BDOutline;
  url?: string;
}

interface BDOutlineStats {
  topics: number;
  completed: number;
  words: number;
  readingTime: number;
  generated: number;
  reviewed: number;
  completion: number;
}

interface BDOutlineExport {
  outline: BDOutline;
  format: BDOutlineExportFormat;
  topics?: BDOutlineTopic[];
  path?: string;
  includeTableOfContents?: boolean;
  includeDiagrams?: boolean;
  includeSources?: boolean;
  createdAt: string;
}

// ================== API ==================
// BDAPI is a single API reference tied to a project. Each entry describes the
// method type, the action it performs, its properties (inputs), and its return type.
enum BDAPIProtocol {
  rest = "rest",
  graphql = "graphql",
  grpc = "grpc",
  websocket = "websocket",
  rpc = "rpc",
  soap = "soap",
  webhook = "webhook",
}

enum BDAPIMethod {
  get = "get",
  post = "post",
  put = "put",
  patch = "patch",
  delete = "delete",
  head = "head",
  options = "options",
  query = "query",
  mutation = "mutation",
  subscription = "subscription",
  event = "event",
}

enum BDAPIParamLocation {
  path = "path",
  query = "query",
  header = "header",
  cookie = "cookie",
  body = "body",
  formData = "formData",
  field = "field",
}

enum BDAPIAuthType {
  none = "none",
  apiKey = "apiKey",
  bearer = "bearer",
  basic = "basic",
  oauth2 = "oauth2",
  session = "session",
}

enum BDAPIReturnKind {
  object = "object",
  array = "array",
  scalar = "scalar",
  enum = "enum",
  union = "union",
  void = "void",
  stream = "stream",
  file = "file",
  reference = "reference",
}

enum BDAPIVersionStrategy {
  uri = "uri",
  query = "query",
  header = "header",
  mediaType = "mediaType",
}

interface BDAPIProperty {
  api: BDAPI;
  name: string;
  type: string;
  location: BDAPIParamLocation;
  required?: boolean;
  nullable?: boolean;
  description?: string;
  default?: unknown;
  example?: unknown;
  enum?: string[];
  schema?: BDSchemaModel;
  properties?: BDAPIProperty[];
  item?: BDAPIProperty;
}

interface BDAPIReturn {
  kind: BDAPIReturnKind;
  type: string;
  nullable?: boolean;
  description?: string;
  status?: number;
  schema?: BDSchemaModel;
  properties?: BDAPIProperty[];
  item?: BDAPIReturn;
  headers?: BDAPIHeader[];
  example?: unknown;
}

interface BDAPIHeader {
  name: string;
  type: string;
  required?: boolean;
  description?: string;
  example?: unknown;
}

interface BDAPIError {
  status: number;
  code?: string;
  message: string;
  description?: string;
  type?: string;
}

interface BDAPIExample {
  name?: string;
  request?: string;
  response?: string;
  language?: string;
}

interface BDAPI {
  project: BDProject;
  id: string;
  name: string;
  operationId?: string;
  group?: string;
  protocol: BDAPIProtocol;
  method: BDAPIMethod;
  path: string;
  url?: string;
  summary?: string;
  description: string;
  properties: BDAPIProperty[];
  returns: BDAPIReturn;
  headers?: BDAPIHeader[];
  errors?: BDAPIError[];
  auth?: BDAPIAuthType;
  version?: string;
  versionStrategy?: BDAPIVersionStrategy;
  model?: BDSchemaModel;
  examples?: BDAPIExample[];
  tags?: BDLabel[];
  deprecated?: boolean;
  hidden?: boolean;
  createdAt: string;
  updatedAt: string;
}

