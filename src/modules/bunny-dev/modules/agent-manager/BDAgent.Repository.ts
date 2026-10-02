// BDAgent.Repository.ts — agent, agent-task, handoff, and run repositories.

import { bdDB } from "../../BDDatabase";
import type {
  BDAgent,
  BDAgentHandoff,
  BDAgentRun,
  BDAgentTask,
  BDAgentHandoffState,
} from "../../BDDomain.Types";
import { BDRepository } from "../../BDRepository";

export class BDAgentRepository extends BDRepository<BDAgent> {
  constructor() {
    super(bdDB.agents);
  }

  async listByProject(projectId: string): Promise<BDAgent[]> {
    return this.listWhere("projectId", projectId);
  }
}

export class BDAgentTaskRepository extends BDRepository<BDAgentTask> {
  constructor() {
    super(bdDB.agentTasks);
  }

  async listByProject(projectId: string): Promise<BDAgentTask[]> {
    return this.listWhere("projectId", projectId);
  }
}

export class BDAgentHandoffRepository extends BDRepository<BDAgentHandoff> {
  constructor() {
    super(bdDB.agentHandoffs);
  }

  async listByProject(projectId: string): Promise<BDAgentHandoff[]> {
    const rows = await this.listWhere("projectId", projectId);
    return rows.sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  }

  async setState(id: string, state: BDAgentHandoffState): Promise<void> {
    const now = new Date().toISOString();
    await this.update(id, {
      state,
      startedAt: state === "running" ? now : undefined,
      finishedAt:
        state === "returned" || state === "failed" || state === "rejected"
          ? now
          : undefined,
    });
  }
}

export class BDAgentRunRepository extends BDRepository<BDAgentRun> {
  constructor() {
    super(bdDB.agentRuns);
  }

  async listByProject(projectId: string): Promise<BDAgentRun[]> {
    return this.listWhere("projectId", projectId);
  }
}

export const bdAgentRepository = new BDAgentRepository();
export const bdAgentTaskRepository = new BDAgentTaskRepository();
export const bdAgentHandoffRepository = new BDAgentHandoffRepository();
export const bdAgentRunRepository = new BDAgentRunRepository();
