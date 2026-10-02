"use client";

// BDAgent.Hooks — Dexie live queries for agents, handoffs, runs, and proposals.

import { useLiveQuery } from "dexie-react-hooks";
import { bdDB } from "../../BDDatabase";
import type {
  BDAgent,
  BDAgentHandoff,
  BDAgentTask,
  BDBatchProposal,
  BDGenerationRun,
} from "../../BDDomain.Types";

export function useBDAgents(projectId: string): BDAgent[] | undefined {
  return useLiveQuery(
    () => bdDB.agents.where("projectId").equals(projectId).toArray(),
    [projectId],
  );
}

export function useBDAgentTasks(projectId: string): BDAgentTask[] | undefined {
  return useLiveQuery(
    () => bdDB.agentTasks.where("projectId").equals(projectId).toArray(),
    [projectId],
  );
}

export function useBDAgentHandoffs(
  projectId: string,
): BDAgentHandoff[] | undefined {
  return useLiveQuery(async () => {
    const rows = await bdDB.agentHandoffs
      .where("projectId")
      .equals(projectId)
      .toArray();
    return rows.sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  }, [projectId]);
}

export function useBDGenerationRuns(
  projectId: string,
): BDGenerationRun[] | undefined {
  return useLiveQuery(async () => {
    const rows = await bdDB.generationRuns
      .where("projectId")
      .equals(projectId)
      .toArray();
    return rows.sort((a, b) =>
      (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
    );
  }, [projectId]);
}

export function useBDBatchProposals(
  projectId: string,
): BDBatchProposal[] | undefined {
  return useLiveQuery(async () => {
    const rows = await bdDB.batchProposals
      .where("projectId")
      .equals(projectId)
      .toArray();
    return rows.sort((a, b) =>
      (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
    );
  }, [projectId]);
}
