// BDAgent.Types.ts — agent form shapes, defaults, and factories.

import type {
  BDAgent,
  BDAgentHandoff,
  BDAgentTask,
  BDAgentTaskStatus,
} from "./BDAgent.Domain";
import {
  BDAgentHandoffPolicy,
  BDAgentHandoffState,
  BDAgentTaskStatus as TaskStatus,
} from "./BDAgent.Domain";

export interface BDAgentForm {
  name: string;
  prompt: string;
  description: string;
  model: string;
  provider: string;
  enabled: boolean;
}

export const BD_AGENT_EMPTY_FORM: BDAgentForm = {
  name: "",
  prompt: "",
  description: "",
  model: "",
  provider: "",
  enabled: true,
};

export const BD_HANDOFF_POLICY_OPTIONS = [
  { label: "Manual", value: BDAgentHandoffPolicy.manual },
  { label: "Assisted", value: BDAgentHandoffPolicy.assisted },
  { label: "Auto", value: BDAgentHandoffPolicy.auto },
];

export const BD_HANDOFF_STATE_OPTIONS = [
  "requested",
  "accepted",
  "running",
  "waitingInput",
  "returned",
  "rejected",
  "failed",
].map((value) => ({ label: value, value }));

export const BD_AGENT_TASK_STATUS_OPTIONS = [
  "pending",
  "queued",
  "processing",
  "handoff",
  "blocked",
  "finished",
  "failed",
].map((value) => ({ label: value, value }));

export function createAgent(
  projectId: string,
  form: BDAgentForm,
): Omit<BDAgent, "id"> {
  return {
    projectId,
    name: form.name,
    prompt: form.prompt,
    description: form.description || undefined,
    model: form.model || undefined,
    provider: form.provider || undefined,
    capabilities: [],
    enabled: form.enabled,
  };
}

export function toAgentForm(agent: BDAgent): BDAgentForm {
  return {
    name: agent.name,
    prompt: agent.prompt,
    description: agent.description ?? "",
    model: agent.model ?? "",
    provider: agent.provider ?? "",
    enabled: agent.enabled,
  };
}

export function createAgentTask(
  projectId: string,
  agentId: string,
  taskId?: string,
  boardId?: string,
  status: BDAgentTaskStatus = TaskStatus.pending,
): Omit<BDAgentTask, "id"> {
  return { projectId, agentId, taskId, boardId, status };
}

export function createHandoff(
  projectId: string,
  agentId: string,
  instruction: string,
  taskId?: string,
): Omit<BDAgentHandoff, "id"> {
  return {
    projectId,
    agentId,
    taskId,
    state: BDAgentHandoffState.requested,
    instruction,
    requestedAt: new Date().toISOString(),
  };
}

// ── AI artifact drafts ─────────────────────────────────────────────────────

export interface BDAgentDraft {
  name: string;
  prompt: string;
  description?: string;
  capabilities?: { name: string; description?: string }[];
}

export interface BDAgentArtifact {
  agents: BDAgentDraft[];
}
