// BDBatch.Repository — create/track generation runs and one-shot batch
// proposals. Runs entirely against local Dexie (server actions never touch the
// client's IndexedDB).
//
// Every BunnyDev AI flow follows the same lifecycle:
//   generate → generationRuns(status finished|failed)
//            → batchProposals(status pending)
//            → user review → apply (target tables) | reject
// No partial writes: apply is all-or-nothing from the proposal's artifact.

import { bdDB } from "../../BDDatabase";
import type {
  BDBatchProposal,
  BDBatchStatus,
  BDGenerationMode,
  BDGenerationRun,
  BDSubsystem,
} from "../../BDDomain.Types";

export interface BDCreateRunInput {
  projectId: string;
  subsystem: BDSubsystem;
  mode: BDGenerationMode;
  targetId?: string;
  instruction?: string;
  provider?: string;
  model?: string;
}

export async function createGenerationRun(
  input: BDCreateRunInput,
): Promise<BDGenerationRun> {
  return bdDB.generationRunsRepo.create({
    projectId: input.projectId,
    subsystem: input.subsystem,
    mode: input.mode,
    targetId: input.targetId,
    status: "running",
    instruction: input.instruction,
    provider: input.provider,
    model: input.model,
    startedAt: new Date().toISOString(),
  });
}

export async function finishGenerationRun(
  runId: string,
  status: "finished" | "failed",
  error?: string,
): Promise<void> {
  await bdDB.generationRunsRepo.update(runId, {
    status,
    error,
    finishedAt: new Date().toISOString(),
  });
}

export interface BDCreateProposalInput {
  projectId: string;
  subsystem: BDSubsystem;
  mode: BDGenerationMode;
  targetId?: string;
  artifact: unknown;
  summary?: string;
  runId?: string;
}

export async function createBatchProposal(
  input: BDCreateProposalInput,
): Promise<BDBatchProposal> {
  return bdDB.batchProposalsRepo.create({
    projectId: input.projectId,
    subsystem: input.subsystem,
    mode: input.mode,
    status: "pending",
    targetId: input.targetId,
    artifact: input.artifact,
    summary: input.summary,
    runId: input.runId,
  });
}

export async function resolveBatchProposal(
  id: string,
  status: Exclude<BDBatchStatus, "pending">,
): Promise<void> {
  await bdDB.batchProposalsRepo.update(id, {
    status,
    resolvedAt: new Date().toISOString(),
  });
}
