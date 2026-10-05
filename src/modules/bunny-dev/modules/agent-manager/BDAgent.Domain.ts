// BDAgent.Domain.ts — Agent Manager domain model (agents, tasks, handoffs,
// runs) plus the shared one-shot AI generation pipeline types.

import type { BDEntity } from "../core/BDShared.Types";

export const BDAgentTaskStatus = {
  pending: "pending",
  queued: "queued",
  processing: "processing",
  handoff: "handoff",
  blocked: "blocked",
  finished: "finished",
  failed: "failed",
} as const;
export type BDAgentTaskStatus = (typeof BDAgentTaskStatus)[keyof typeof BDAgentTaskStatus];

export const BDAgentHandoffState = {
  requested: "requested",
  accepted: "accepted",
  running: "running",
  waitingInput: "waitingInput",
  returned: "returned",
  rejected: "rejected",
  failed: "failed",
} as const;
export type BDAgentHandoffState = (typeof BDAgentHandoffState)[keyof typeof BDAgentHandoffState];

export const BDAgentHandoffPolicy = {
  manual: "manual",
  assisted: "assisted",
  auto: "auto",
} as const;
export type BDAgentHandoffPolicy = (typeof BDAgentHandoffPolicy)[keyof typeof BDAgentHandoffPolicy];

export interface BDAgentCapability {
  name: string;
  description?: string;
}

export interface BDAgent extends BDEntity {
  projectId: string;
  name: string;
  prompt: string;
  description?: string;
  avatar?: string;
  model?: string;
  provider?: string;
  capabilities: BDAgentCapability[];
  enabled: boolean;
}

export interface BDAgentSettings {
  concurrent: number;
  active: boolean;
  autoAssign: boolean;
  allowHandoff: boolean;
  handoffPolicy: BDAgentHandoffPolicy;
  defaultAgentId?: string;
  escalationAgentId?: string;
  maxIterations?: number;
  maxTokens?: number;
}

export interface BDAgentHandoff extends BDEntity {
  projectId: string;
  taskId?: string;
  agentId: string;
  fromMemberId?: string;
  state: BDAgentHandoffState;
  instruction: string;
  summary?: string;
  artifactIds?: string[];
  tokensUsed?: number;
  cost?: number;
  requestedAt: string;
  startedAt?: string;
  finishedAt?: string;
}

export interface BDAgentRun extends BDEntity {
  projectId: string;
  agentTaskId: string;
  startedAt: string;
  finishedAt?: string;
  iterations: number;
  toolCalls: number;
  logs: string[];
  error?: string;
}

export interface BDAgentTask extends BDEntity {
  projectId: string;
  boardId?: string;
  taskId?: string;
  agentId: string;
  status: BDAgentTaskStatus;
  handoffId?: string;
  runId?: string;
}

// ── AI generation pipeline (Agent Manager / one-shot batch) ────────────────

export type BDGenerationMode = "create" | "append" | "update" | "replace";
export type BDGenerationStatus = "pending" | "running" | "finished" | "failed";
export type BDBatchStatus = "pending" | "applied" | "rejected";

export type BDSubsystem =
  | "schema"
  | "app"
  | "api"
  | "diagram"
  | "outline"
  | "architecture"
  | "board"
  | "files"
  | "agent";

export interface BDGenerationRun extends BDEntity {
  projectId: string;
  subsystem: BDSubsystem;
  mode: BDGenerationMode;
  status: BDGenerationStatus;
  /** Existing target record selected for append/update/replace. */
  targetId?: string;
  instruction?: string;
  provider?: string;
  model?: string;
  error?: string;
  startedAt?: string;
  finishedAt?: string;
}

/** One pending/applied/rejected batch of generated artifacts. */
export interface BDBatchProposal extends BDEntity {
  projectId: string;
  subsystem: BDSubsystem;
  mode: BDGenerationMode;
  status: BDBatchStatus;
  summary?: string;
  runId?: string;
  /** Existing target record selected for append/update/replace. */
  targetId?: string;
  /** Full serializable artifact set — shape depends on `subsystem`. */
  artifact: unknown;
  resolvedAt?: string;
}
