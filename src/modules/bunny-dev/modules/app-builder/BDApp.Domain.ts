// BDApp.Domain.ts — App Builder domain model (Filament-inspired panel config:
// resources, pages, tables, columns, fields, layouts, widgets, actions).
// Serializable only: function-typed blueprint fields are declarative
// descriptors (see the module plan's "Hybrid" persistence decision).

import type { BDAppColor, BDEntity } from "../core/BDShared.Types";

export type BDAppBreakpoint = "sm" | "md" | "lg" | "xl" | "2xl";
export type BDAppColumnSpan = number | "full";
export type BDAppResponsive<T> = T | Partial<Record<BDAppBreakpoint, T>>;
export type BDAppVariant =
  | "default"
  | "primary"
  | "secondary"
  | "danger"
  | "soft"
  | "outline"
  | "ghost"
  | "link";
export type BDAppSize = "sm" | "md" | "lg" | "xl";
export type BDAppAlign = "start" | "center" | "end";

/** Declarative visibility — a boolean or a rule string resolved at runtime. */
export type BDAppVisibility = boolean | string;
/** Declarative href — resolved at runtime (may contain {id} placeholders). */
export type BDAppHref = string;

export type BDAppFieldType =
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

export type BDAppLayoutType =
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

export type BDAppEntryType =
  | "text"
  | "badge"
  | "icon"
  | "image"
  | "color"
  | "boolean"
  | "date"
  | "keyValue"
  | "repeatable";

export type BDAppColumnType =
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

export type BDAppFilterType =
  | "select"
  | "multiSelect"
  | "ternary"
  | "queryBuilder"
  | "date"
  | "trashed"
  | "custom";

export type BDAppWidgetType = "stats" | "chart" | "table" | "account";

export type BDAppChartType =
  | "line"
  | "bar"
  | "pie"
  | "doughnut"
  | "radar"
  | "polarArea";

export type BDAppActionType =
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

export type BDAppPageType =
  | "dashboard"
  | "list"
  | "create"
  | "edit"
  | "view"
  | "settings"
  | "custom";

/** Serializable column formatter descriptor (replaces the former function). */
export interface BDAppColumnFormat {
  kind: "text" | "currency" | "date" | "since" | "number";
  currency?: string;
  decimals?: number;
  pattern?: string;
}

/** Serializable entry formatter descriptor (replaces the former function). */
export interface BDAppEntryFormat {
  kind: "text" | "currency" | "date" | "since" | "number";
  currency?: string;
  decimals?: number;
  pattern?: string;
}

/** Declarative reactive rule (replaces the former `update` function). */
export interface BDAppReactiveRule {
  dependsOn: string[];
  /** Named effect id resolved by the App Rendering runtime registry. */
  effect: string;
}

export interface BDAppRelation {
  name: string;
  titleAttribute: string;
  multiple?: boolean;
  searchable?: boolean;
  preload?: boolean;
  createOption?: boolean;
  modelId?: string;
  /** Target resource slug within the same app (preferred over `modelId`). */
  targetSlug?: string;
}

/**
 * Cardinality of a resource-to-resource connection (Filament-style).
 *
 *   - `oneToOne`   — the owning record stores one target id (a single select).
 *   - `oneToMany`  — each child record stores the owning (parent) id.
 *   - `manyToMany` — the owning record stores a `string[]` of target ids.
 */
export type BDAppConnectionType = "oneToOne" | "oneToMany" | "manyToMany";

/**
 * A first-class connection between two resources in the same app. Configured
 * on the owning resource and keyed by the target resource slug. Links are
 * stored in `BDAppRecord.data` (no pivot table) and resolved at render time.
 */
export interface BDAppConnection {
  /** Relation name; also the default data key. Unique within a resource. */
  name: string;
  type: BDAppConnectionType;
  /** Target resource slug within the same app. */
  targetSlug: string;
  /**
   * Data key holding the link. Defaults to `name` for oneToOne/manyToMany and
   * to `<ownerSlug>Id` for oneToMany (stored on the child record).
   */
  foreignKey?: string;
  /** Attribute on the target record used as its label. Default "name". */
  titleAttribute?: string;
  /** Display label for the field/section. */
  label?: string;
  /** oneToMany only: optional column override for the child table. */
  table?: BDAppTable;
  readOnly?: boolean;
  /** Name of the target's connection back to the owner (inverse sections). */
  inverseName?: string;
  /** manyToMany only: attribute names carried on the (virtual) pivot. */
  pivotAttributes?: string[];
  /** Filament-style relation-manager options (view modal sections). */
  relationManager?: {
    searchable?: boolean;
    perPage?: number;
  };
}

export interface BDAppFieldBlock {
  name: string;
  label: string;
  icon?: string;
  maxItems?: number;
  fields: BDAppField[];
}

export interface BDAppField {
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
  options?: Record<string, string>;
  accept?: string;
  maxItems?: number;
  minItems?: number;
  relation?: BDAppRelation;
  fields?: BDAppField[];
  blocks?: BDAppFieldBlock[];
  reactive?: BDAppReactiveRule;
}

export interface BDAppLayout {
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

export interface BDAppTab {
  label: string;
  icon?: string;
  badge?: string | number;
  components: BDAppComponent[];
}

export interface BDAppStep {
  label: string;
  description?: string;
  icon?: string;
  components: BDAppComponent[];
}

export interface BDAppEntry {
  kind: "entry";
  type: BDAppEntryType;
  name: string;
  label?: string;
  icon?: string;
  color?: BDAppColor;
  columnSpan?: BDAppColumnSpan;
  format?: BDAppEntryFormat;
}

export type BDAppComponent = BDAppLayout | BDAppField | BDAppEntry;

export interface BDAppSchema {
  components: BDAppComponent[];
  columns?: BDAppResponsive<number>;
}

export interface BDAppColumnMapping {
  modelId?: string;
  key?: string;
  label?: string;
  fallback?: string;
}

export interface BDAppColumn {
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
  format?: BDAppColumnFormat;
  mapping?: BDAppColumnMapping;
}

export interface BDAppFilter {
  type: BDAppFilterType;
  name: string;
  label?: string;
  multiple?: boolean;
  default?: unknown;
  options?: Record<string, string>;
  /** Named query id resolved by the App Rendering runtime registry. */
  query?: string;
}

export interface BDAppPagination {
  mode?: "default" | "simple" | "cursor";
  pageOptions?: number[];
  defaultPerPage?: number;
}

export interface BDAppEmptyState {
  heading?: string;
  description?: string;
  icon?: string;
  actions?: BDAppAction[];
}

export interface BDAppTable {
  columns: BDAppColumn[];
  filters?: BDAppFilter[];
  headerActions?: BDAppAction[];
  toolbarActions?: BDAppAction[];
  rowActions?: BDAppAction[];
  bulkActions?: BDAppAction[];
  defaultSort?: { column: string; direction: "asc" | "desc" };
  pagination?: BDAppPagination;
  groups?: string[];
  reorderable?: boolean;
  striped?: boolean;
  stickyHeader?: boolean;
  deferLoading?: boolean;
  pollInterval?: string;
  recordUrl?: BDAppHref;
  recordAction?: BDAppAction;
  emptyState?: BDAppEmptyState;
}

export interface BDAppConfirmation {
  heading?: string;
  description?: string;
  submitLabel?: string;
  cancelLabel?: string;
  variant?: BDAppVariant;
  requiresPassword?: boolean;
}

export interface BDAppNotification {
  title?: string;
  body?: string;
  status?: BDAppColor;
  icon?: string;
  duration?: number;
}

export interface BDAppAction {
  name: string;
  type: BDAppActionType;
  label?: string;
  icon?: string;
  color?: BDAppColor;
  variant?: BDAppVariant;
  size?: BDAppSize;
  url?: BDAppHref;
  /** Named handler id resolved by the App Rendering runtime registry. */
  handler?: string;
  form?: BDAppSchema;
  confirmation?: BDAppConfirmation;
  notification?: BDAppNotification;
  visible?: BDAppVisibility;
  disabled?: BDAppVisibility;
  bulk?: boolean;
  shortcut?: string;
}

export interface BDAppDataset {
  label: string;
  data: number[];
  color?: BDAppColor;
}

export interface BDAppChart {
  type: BDAppChartType;
  labels: string[];
  datasets: BDAppDataset[];
  height?: number;
}

export interface BDAppStat {
  label: string;
  value: string | number;
  description?: string;
  icon?: string;
  color?: BDAppColor;
  chart?: number[];
  trend?: "up" | "down" | "flat";
  url?: string;
}

export interface BDAppWidget {
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

export interface BDAppNavigationItem {
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

export interface BDAppNavigationGroup {
  label: string;
  icon?: string;
  collapsible?: boolean;
  collapsed?: boolean;
  sort?: number;
}

export interface BDAppNavigation {
  items?: BDAppNavigationItem[];
  groups?: BDAppNavigationGroup[];
  collapsible?: boolean;
  width?: string;
  topNavigation?: boolean;
}

export interface BDAppGlobalSearch {
  enabled?: boolean;
  attributes: string[];
  titleAttribute?: string;
  resultLimit?: number;
}

export interface BDAppAuthorization {
  policy?: string;
  canViewAny?: boolean | string;
  canView?: boolean | string;
  canCreate?: boolean | string;
  canEdit?: boolean | string;
  canDelete?: boolean | string;
  canDeleteAny?: boolean | string;
}

export interface BDAppPage {
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

export interface BDAppResourcePages {
  index?: BDAppPage;
  create?: BDAppPage;
  edit?: BDAppPage;
  view?: BDAppPage;
  custom?: BDAppPage[];
}

export interface BDAppResource {
  name: string;
  slug: string;
  label?: string;
  pluralLabel?: string;
  modelId?: string;
  icon?: string;
  color?: BDAppColor;
  navigation?: BDAppNavigationItem;
  form?: BDAppSchema;
  infolist?: BDAppSchema;
  table?: BDAppTable;
  pages?: BDAppResourcePages;
  /** First-class resource-to-resource connections (Filament-style relations). */
  connections?: BDAppConnection[];
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

export interface BDAppCluster {
  name: string;
  slug: string;
  icon?: string;
  navigation?: BDAppNavigationItem;
  resourceSlugs?: string[];
  pages?: BDAppPage[];
}

export interface BDAppTheme {
  mode?: "light" | "dark" | "system";
  primary?: BDAppColor | string;
  colors?: Partial<Record<BDAppColor, string>>;
  font?: string;
  radius?: BDAppSize | string;
  darkMode?: boolean;
}

export interface BDAppBrand {
  name: string;
  logo?: string;
  logoHeight?: number;
  favicon?: string;
  colors?: Partial<Record<BDAppColor, string>>;
}

export interface BDAppAuth {
  guard?: string;
  provider?: string;
  login?: boolean;
  registration?: boolean;
  passwordReset?: boolean;
  emailVerification?: boolean;
  profile?: boolean;
  redirectTo?: string;
}

export interface BDAppTenancy {
  model: string;
  slugAttribute: string;
  ownershipRelationship: string;
  tenantMenu?: boolean;
  billing?: boolean;
}

export interface BDAppNotificationSettings {
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

export interface BDAppPlugin {
  name: string;
  version?: string;
  resourceSlugs?: string[];
  widgets?: BDAppWidget[];
  pages?: BDAppPage[];
  assets?: string[];
}

/** Aggregate root: an entire Filament-style panel config tree. */
export interface BDApp extends BDEntity {
  projectId: string;
  name: string;
  slug: string;
  path: string;
  description?: string;
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

/**
 * A rendered row produced by the App Rendering engine.
 *
 * Generated app rows live in the dedicated `BunnyDevAppDB` database, namespaced
 * by `appId` + `resourceSlug`; each row keeps its field values in `data`.
 */
export interface BDAppRecord extends BDEntity {
  projectId: string;
  appId: string;
  resourceSlug: string;
  data: Record<string, unknown>;
}
