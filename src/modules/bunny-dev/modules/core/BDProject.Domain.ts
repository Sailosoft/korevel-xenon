// BDProject.Domain.ts — Project core domain model (project, members, sprints,
// components, versions, labels, workflows) plus the enums they own.

import type { BDEntity } from "./BDShared.Types";
import type { BDAgentSettings } from "../agent-manager/BDAgent.Domain";

export const BDProjectRole = {
  admin: "admin",
  member: "member",
  viewer: "viewer",
  guest: "guest",
  agent: "agent",
} as const;
export type BDProjectRole = (typeof BDProjectRole)[keyof typeof BDProjectRole];

export const BDIssueType = {
  epic: "epic",
  story: "story",
  task: "task",
  bug: "bug",
  subtask: "subtask",
  spike: "spike",
} as const;
export type BDIssueType = (typeof BDIssueType)[keyof typeof BDIssueType];

export const BDBoardTaskStatusCategory = {
  todo: "todo",
  inProgress: "inProgress",
  done: "done",
} as const;
export type BDBoardTaskStatusCategory =
  (typeof BDBoardTaskStatusCategory)[keyof typeof BDBoardTaskStatusCategory];

export const BDSprintState = {
  future: "future",
  active: "active",
  closed: "closed",
} as const;
export type BDSprintState = (typeof BDSprintState)[keyof typeof BDSprintState];

/** Project root — the aggregate every sub-module hangs off of. */
export interface BDProject extends BDEntity {
  key: string;
  name: string;
  description: string;
  leadId?: string;
  issueTypes: BDIssueType[];
  agentSettings?: BDAgentSettings;
}

export interface BDProjectMember extends BDEntity {
  projectId: string;
  name: string;
  email: string;
  role: BDProjectRole;
  avatar?: string;
  active: boolean;
}

export interface BDSprint extends BDEntity {
  projectId: string;
  name: string;
  goal?: string;
  state: BDSprintState;
  startDate?: string;
  endDate?: string;
  capacity?: number;
  completedPoints?: number;
  velocity?: number;
}

export interface BDComponent extends BDEntity {
  projectId: string;
  name: string;
  description?: string;
  leadId?: string;
}

export interface BDVersion extends BDEntity {
  projectId: string;
  name: string;
  description?: string;
  released: boolean;
  releaseDate?: string;
}

export interface BDLabel extends BDEntity {
  projectId: string;
  name: string;
  color?: string;
}

export interface BDWorkflowStatus {
  id: string;
  name: string;
  category: BDBoardTaskStatusCategory;
  position: number;
}

export interface BDWorkflowTransition {
  id: string;
  name: string;
  fromIds: string[];
  toId: string;
  conditions?: string[];
  validators?: string[];
  postFunctions?: string[];
}

export interface BDWorkflow extends BDEntity {
  projectId: string;
  name: string;
  statuses: BDWorkflowStatus[];
  transitions: BDWorkflowTransition[];
}
