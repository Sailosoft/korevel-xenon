// modules/agent-manager/index.ts
//
// The Agent Manager owns the shared one-shot generation pipeline plus agent,
// handoff, and run management.

export {
  createGenerationRun,
  finishGenerationRun,
  createBatchProposal,
  resolveBatchProposal,
} from "./BDBatch.Repository";
export type {
  BDCreateRunInput,
  BDCreateProposalInput,
} from "./BDBatch.Repository";

export { BDGenerationPanel } from "./BDGenerationPanel";
export type {
  BDGenerationPanelProps,
  BDGenerationArgs,
} from "./BDGenerationPanel";

export * from "./BDAgent.Types";
export {
  BDAgentRepository,
  BDAgentTaskRepository,
  BDAgentHandoffRepository,
  BDAgentRunRepository,
  bdAgentRepository,
  bdAgentTaskRepository,
  bdAgentHandoffRepository,
  bdAgentRunRepository,
} from "./BDAgent.Repository";
export {
  useBDAgents,
  useBDAgentTasks,
  useBDAgentHandoffs,
  useBDGenerationRuns,
  useBDBatchProposals,
} from "./BDAgent.Hooks";
export { BDAgentComponent } from "./BDAgent.Component";
export { BDAgentManagerComponent } from "./BDAgentManager.Component";
