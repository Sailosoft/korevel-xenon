// BDTask.Domain.ts — Board / Project Management domain model (boards, columns,
// tasks, comments, issue links, attachments) plus the enums they own.

import type { BDEntity } from "../core/BDShared.Types";
import type {
  BDBoardTaskStatusCategory,
  BDIssueType,
} from "../core/BDProject.Domain";

export const BDTaskStatusType = {
  start: "start",
  onGoing: "onGoing",
  finished: "finished",
} as const;
export type BDTaskStatusType = (typeof BDTaskStatusType)[keyof typeof BDTaskStatusType];

export const BDCustomFieldType = {
  text: "text",
  textarea: "textarea",
  number: "number",
  date: "date",
} as const;
export type BDCustomFieldType = (typeof BDCustomFieldType)[keyof typeof BDCustomFieldType];

export const BDPriority = {
  lowest: "lowest",
  low: "low",
  medium: "medium",
  high: "high",
  highest: "highest",
  blocker: "blocker",
} as const;
export type BDPriority = (typeof BDPriority)[keyof typeof BDPriority];

export const BDResolution = {
  unresolved: "unresolved",
  fixed: "fixed",
  done: "done",
  duplicate: "duplicate",
  wontDo: "wontDo",
  cannotReproduce: "cannotReproduce",
} as const;
export type BDResolution = (typeof BDResolution)[keyof typeof BDResolution];

export const BDLinkType = {
  blocks: "blocks",
  blockedBy: "blockedBy",
  relatesTo: "relatesTo",
  duplicates: "duplicates",
  duplicatedBy: "duplicatedBy",
  clones: "clones",
  clonedBy: "clonedBy",
  causes: "causes",
  causedBy: "causedBy",
} as const;
export type BDLinkType = (typeof BDLinkType)[keyof typeof BDLinkType];

export const BDBoardType = {
  scrum: "scrum",
  kanban: "kanban",
} as const;
export type BDBoardType = (typeof BDBoardType)[keyof typeof BDBoardType];

export interface BDBoardTaskStatusType {
  name: string;
  position: number;
  status: BDTaskStatusType;
  category: BDBoardTaskStatusCategory;
  color?: string;
}

export interface BDBoardFilter {
  field: string;
  operator: "eq" | "neq" | "in" | "contains" | "gt" | "lt";
  value: unknown;
}

export interface BDBoardQuickFilter {
  name: string;
  icon?: string;
  filters: BDBoardFilter[];
}

export interface BDSwimlane {
  id: string;
  name: string;
  field: string;
  position: number;
  collapsed?: boolean;
}

export interface BDBoardCustomField {
  id: string;
  name: string;
  slug: string;
  position?: number;
  type: BDCustomFieldType;
}

export interface BDBoard extends BDEntity {
  projectId: string;
  name: string;
  type: BDBoardType;
  sprintId?: string;
  swimlanes?: BDSwimlane[];
  customFields?: BDBoardCustomField[];
  quickFilters?: BDBoardQuickFilter[];
}

export interface BDBoardColumn extends BDEntity {
  boardId: string;
  name: string;
  status: BDBoardTaskStatusType;
  position: number;
  wipLimit?: number;
  mappedStatuses?: BDBoardTaskStatusType[];
}

export interface BDTimeTracking {
  originalEstimate?: number;
  remainingEstimate?: number;
  timeSpent?: number;
}

export interface BDBoardTask extends BDEntity {
  projectId: string;
  boardId: string;
  columnId?: string;
  key: string;
  name: string;
  description: string;
  type: BDIssueType;
  /** Status name — resolves against the owning board's column statuses. */
  status: string;
  priority: BDPriority;
  resolution?: BDResolution;
  storyPoints?: number;
  rank: number;
  epicId?: string;
  parentId?: string;
  subtaskIds: string[];
  sprintId?: string;
  componentId?: string;
  versionId?: string;
  fixVersionIds: string[];
  labelIds: string[];
  assigneeId?: string;
  reporterId?: string;
  watcherIds: string[];
  votes: number;
  dueDate?: string;
  startDate?: string;
  resolvedAt?: string;
  timeTracking: BDTimeTracking;
}

export interface BDTaskComment extends BDEntity {
  taskId: string;
  authorId?: string;
  comment: string;
  replyToId?: string;
  editedAt?: string;
}

export interface BDIssueLink extends BDEntity {
  taskId: string;
  type: BDLinkType;
  targetId: string;
}

export interface BDAttachment extends BDEntity {
  projectId: string;
  taskId?: string;
  architectureId?: string;
  outlineId?: string;
  name: string;
  url: string;
  mime?: string;
  size?: number;
  /** Optional inline payload for uploaded files (data URL or text). */
  data?: string;
}
