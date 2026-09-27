"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Bot,
  Plus,
  Pencil,
  Trash2,
  Handshake,
  Inbox,
  History,
  Eye,
  Check,
  X,
  Sparkles,
} from "lucide-react";
import { bdDB } from "../../BDDatabase";
import type {
  BDAgent,
  BDAgentHandoff,
  BDBatchProposal,
} from "../../BDDomain.Types";
import { useBDProjectContext } from "../core/BDProject.Context";
import {
  useBDAgents,
  useBDAgentHandoffs,
  useBDBatchProposals,
  useBDGenerationRuns,
} from "./BDAgent.Hooks";
import {
  bdAgentHandoffRepository,
  bdAgentRepository,
  bdAgentTaskRepository,
} from "./BDAgent.Repository";
import {
  BD_HANDOFF_STATE_OPTIONS,
  createAgent,
  createAgentTask,
  createHandoff,
  type BDAgentArtifact,
  type BDAgentForm,
} from "./BDAgent.Types";
import { bdGenerateAgents } from "./BDAgent.Server";
import {
  createGenerationRun,
  finishGenerationRun,
  resolveBatchProposal,
} from "./BDBatch.Repository";
import BDAgentComponent from "./BDAgent.Component";
import BDPageHeader from "../../components/BDPageHeader";
import BDButton from "../../components/BDButton";
import BDList from "../../components/BDList";
import BDModal from "../../components/BDModal";
import BDBadge from "../../components/BDBadge";
import BDCodeEditor from "../../components/BDCodeEditor";
import BDEmptyState from "../../components/BDEmptyState";
import BDConfirmDialog from "../../components/BDConfirmDialog";
import BDGenerationPanel from "./BDGenerationPanel";
import { useBDToast } from "../../components/BDToast";
import { cn } from "@heroui/react";

type AgentTab = "agents" | "handoffs" | "proposals" | "runs";

const HANDOFF_CELL =
  "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400";

export function BDAgentManagerComponent() {
  const { projectId } = useBDProjectContext();
  const { toast } = useBDToast();
  const agents = useBDAgents(projectId);
  const handoffs = useBDAgentHandoffs(projectId);
  const proposals = useBDBatchProposals(projectId);
  const runs = useBDGenerationRuns(projectId);
  const boardTasks =
    useLiveQuery(
      () => bdDB.boardTasks.where("projectId").equals(projectId).toArray(),
      [projectId],
    ) ?? [];

  const [tab, setTab] = useState<AgentTab>("agents");
  const [editingAgent, setEditingAgent] = useState<BDAgent | null>(null);
  const [creating, setCreating] = useState(false);
  const [deletingAgent, setDeletingAgent] = useState<BDAgent | null>(null);
  const [saving, setSaving] = useState(false);
  const [viewingProposal, setViewingProposal] = useState<BDBatchProposal | null>(
    null,
  );
  const [aiOpen, setAiOpen] = useState(false);

  // Handoff composer
  const [handoffAgentId, setHandoffAgentId] = useState("");
  const [handoffTaskId, setHandoffTaskId] = useState("");
  const [handoffInstruction, setHandoffInstruction] = useState("");

  const submitAgent = async (form: BDAgentForm) => {
    setSaving(true);
    try {
      if (editingAgent) {
        await bdAgentRepository.update(editingAgent.id, createAgent(projectId, form));
      } else {
        await bdAgentRepository.create(createAgent(projectId, form));
      }
      setEditingAgent(null);
      setCreating(false);
      toast({ title: "Agent saved", status: "success" });
    } finally {
      setSaving(false);
    }
  };

  const deleteAgent = async () => {
    if (!deletingAgent) return;
    await bdAgentRepository.delete(deletingAgent.id);
    setDeletingAgent(null);
    toast({ title: "Agent deleted", status: "success" });
  };

  const createHandoffEntry = async () => {
    if (!handoffAgentId || !handoffInstruction.trim()) {
      toast({ title: "Pick an agent and add an instruction", status: "warning" });
      return;
    }
    const agentTask = await bdAgentTaskRepository.create(
      createAgentTask(projectId, handoffAgentId, handoffTaskId || undefined),
    );
    await bdAgentHandoffRepository.create(
      createHandoff(
        projectId,
        handoffAgentId,
        handoffInstruction.trim(),
        handoffTaskId || undefined,
      ),
    );
    await bdAgentTaskRepository.update(agentTask.id, { status: "queued" });
    setHandoffInstruction("");
    setHandoffTaskId("");
    toast({ title: "Handoff requested", status: "success" });
  };

  const setHandoffState = async (
    handoff: BDAgentHandoff,
    state: BDAgentHandoff["state"],
  ) => {
    await bdAgentHandoffRepository.setState(handoff.id, state);
  };

  const applyAgentsArtifact = async (artifact: BDAgentArtifact) => {
    for (const draft of artifact.agents) {
      await bdAgentRepository.create({
        projectId,
        name: draft.name,
        prompt: draft.prompt,
        description: draft.description,
        capabilities: draft.capabilities ?? [],
        enabled: true,
      });
    }
  };

  const generateAgents = async (args: {
    mode: "create" | "append" | "replace";
    instruction: string;
    aiConfig: { provider: string; model: string };
  }): Promise<BDAgentArtifact> => {
    const run = await createGenerationRun({
      projectId,
      subsystem: "agent",
      mode: args.mode,
      instruction: args.instruction,
      provider: args.aiConfig.provider,
      model: args.aiConfig.model,
    });
    try {
      const artifact = await bdGenerateAgents({
        instruction: args.instruction,
        mode: args.mode,
        aiConfig: args.aiConfig,
      });
      await finishGenerationRun(run.id, "finished");
      return artifact;
    } catch (err) {
      await finishGenerationRun(
        run.id,
        "failed",
        err instanceof Error ? err.message : "Unknown error",
      );
      throw err;
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <BDPageHeader
        icon={Bot}
        title="Agent Manager"
        description="Configure AI agents, request task handoffs, and review every one-shot batch generation proposal."
        actions={
          <>
            <BDButton
              variant="secondary"
              icon={Sparkles}
              onClick={() => setAiOpen(true)}
            >
              AI Generate
            </BDButton>
            <BDButton
              icon={Plus}
              onClick={() => {
                setEditingAgent(null);
                setCreating(true);
              }}
            >
              New agent
            </BDButton>
          </>
        }
      />

      <div className="flex gap-2">
        {(
          [
            ["agents", "Agents", Bot],
            ["handoffs", "Handoffs", Handshake],
            ["proposals", "Proposals", Inbox],
            ["runs", "Runs", History],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm",
              tab === key
                ? "bg-blue-100 font-semibold text-blue-700"
                : "text-slate-500 hover:bg-slate-100",
            )}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      <BDGenerationPanel<BDAgentArtifact>
        projectId={projectId}
        subsystem="agent"
        open={aiOpen}
        onOpenChange={setAiOpen}
        title="AI Agent Generation"
        placeholder="e.g. A reviewer agent, a test-writer agent, and a docs agent"
        generate={generateAgents}
        onApply={applyAgentsArtifact}
        defaultMode="append"
      />

      {tab === "agents" && (
        <>
          <BDList<BDAgent>
            title="Agents"
            data={agents ?? []}
            isLoading={agents === undefined}
            getRowId={(row) => row.id}
            searchable
            getSearchText={(row) => `${row.name} ${row.description ?? ""}`}
            emptyState={{
              title: "No agents yet",
              description: "Create an agent or generate some with AI.",
            }}
            columns={[
              {
                key: "name",
                label: "Agent",
                render: (row) => (
                  <span className="font-medium text-slate-800">{row.name}</span>
                ),
              },
              {
                key: "capabilities",
                label: "Capabilities",
                render: (row) => (
                  <BDBadge>{row.capabilities?.length ?? 0}</BDBadge>
                ),
              },
              {
                key: "enabled",
                label: "Enabled",
                width: 90,
                render: (row) => (
                  <BDBadge color={row.enabled ? "success" : "gray"}>
                    {row.enabled ? "yes" : "no"}
                  </BDBadge>
                ),
              },
            ]}
            rowActions={[
              {
                label: "Edit",
                icon: Pencil,
                onSelect: ([row]) => setEditingAgent(row),
              },
              {
                label: "Delete",
                icon: Trash2,
                variant: "danger",
                onSelect: ([row]) => setDeletingAgent(row),
              },
            ]}
          />
        </>
      )}

      {tab === "handoffs" && (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-700">
              Request a handoff
            </h3>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <select
                className={HANDOFF_CELL}
                value={handoffAgentId}
                onChange={(e) => setHandoffAgentId(e.target.value)}
              >
                <option value="">Select agent…</option>
                {(agents ?? []).map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
              <select
                className={HANDOFF_CELL}
                value={handoffTaskId}
                onChange={(e) => setHandoffTaskId(e.target.value)}
              >
                <option value="">No task (standalone)</option>
                {boardTasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.key} · {task.name}
                  </option>
                ))}
              </select>
              <BDButton icon={Handshake} onClick={createHandoffEntry}>
                Hand off
              </BDButton>
            </div>
            <textarea
              className={`${HANDOFF_CELL} mt-2 w-full`}
              rows={2}
              placeholder="Instruction for the agent…"
              value={handoffInstruction}
              onChange={(e) => setHandoffInstruction(e.target.value)}
            />
          </div>

          {(handoffs ?? []).length === 0 ? (
            <BDEmptyState
              icon={Handshake}
              title="No handoffs"
              description="Request a handoff to assign work to an agent."
            />
          ) : (
            <div className="flex flex-col gap-2">
              {(handoffs ?? []).map((handoff) => (
                <div
                  key={handoff.id}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-3"
                >
                  <BDBadge color="primary">{handoff.state}</BDBadge>
                  <span className="text-sm text-slate-700">
                    {handoff.instruction}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(handoff.requestedAt).toLocaleString()}
                  </span>
                  <div className="ml-auto flex gap-1">
                    {BD_HANDOFF_STATE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          setHandoffState(
                            handoff,
                            opt.value as BDAgentHandoff["state"],
                          )
                        }
                        className="rounded px-1.5 py-0.5 text-[11px] text-slate-400 hover:bg-slate-100 hover:text-blue-600"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "proposals" && (
        <div className="flex flex-col gap-2">
          {(proposals ?? []).length === 0 ? (
            <BDEmptyState
              icon={Inbox}
              title="No proposals"
              description="AI generations land here as pending proposals for review."
            />
          ) : (
            (proposals ?? []).map((proposal) => (
              <div
                key={proposal.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-3"
              >
                <BDBadge color="info">{proposal.subsystem}</BDBadge>
                <BDBadge
                  color={
                    proposal.status === "applied"
                      ? "success"
                      : proposal.status === "rejected"
                        ? "danger"
                        : "warning"
                  }
                >
                  {proposal.status}
                </BDBadge>
                <span className="text-sm text-slate-600">
                  {proposal.mode} · {proposal.summary ?? "No summary"}
                </span>
                <div className="ml-auto flex items-center gap-1">
                  <button
                    type="button"
                    className="rounded p-1 text-slate-400 hover:text-blue-600"
                    onClick={() => setViewingProposal(proposal)}
                    aria-label="View artifact"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  {proposal.status === "pending" && (
                    <>
                      <button
                        type="button"
                        className="rounded p-1 text-slate-400 hover:text-green-600"
                        onClick={() =>
                          resolveBatchProposal(proposal.id, "applied")
                        }
                        aria-label="Mark applied"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="rounded p-1 text-slate-400 hover:text-red-500"
                        onClick={() =>
                          resolveBatchProposal(proposal.id, "rejected")
                        }
                        aria-label="Reject"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "runs" && (
        <BDList
          title="Generation runs"
          data={runs ?? []}
          isLoading={runs === undefined}
          getRowId={(row) => row.id}
          emptyState={{
            title: "No runs yet",
            description: "Generation runs are recorded here.",
          }}
          columns={[
            {
              key: "subsystem",
              label: "Subsystem",
              render: (row) => <BDBadge color="info">{row.subsystem}</BDBadge>,
            },
            {
              key: "status",
              label: "Status",
              render: (row) => (
                <BDBadge
                  color={
                    row.status === "finished"
                      ? "success"
                      : row.status === "failed"
                        ? "danger"
                        : "warning"
                  }
                >
                  {row.status}
                </BDBadge>
              ),
            },
            { key: "mode", label: "Mode", width: 90 },
            {
              key: "createdAt",
              label: "When",
              render: (row) =>
                row.createdAt ? new Date(row.createdAt).toLocaleString() : "—",
            },
          ]}
        />
      )}

      <BDAgentComponent
        open={creating || editingAgent !== null}
        agent={editingAgent}
        isLoading={saving}
        onClose={() => {
          setCreating(false);
          setEditingAgent(null);
        }}
        onSubmit={submitAgent}
      />

      <BDModal
        open={viewingProposal !== null}
        onClose={() => setViewingProposal(null)}
        title={`${viewingProposal?.subsystem ?? ""} proposal`}
        size="xl"
        footer={
          viewingProposal?.status === "pending" ? (
            <BDButton
              icon={Check}
              onClick={async () => {
                if (viewingProposal) {
                  await resolveBatchProposal(viewingProposal.id, "applied");
                  setViewingProposal(null);
                  toast({
                    title: "Marked applied",
                    description:
                      "Apply in the owning sub-module to write artifacts.",
                    status: "success",
                  });
                }
              }}
            >
              Mark applied
            </BDButton>
          ) : undefined
        }
      >
        <BDCodeEditor
          value={JSON.stringify(viewingProposal?.artifact ?? {}, null, 2)}
          language="json"
          readOnly
          height={460}
        />
        <p className="mt-2 flex items-center gap-1 text-[11px] text-slate-400">
          <Sparkles className="h-3 w-3" /> Proposals are review records; apply
          them from the owning sub-module.
        </p>
      </BDModal>

      <BDConfirmDialog
        open={!!deletingAgent}
        title={`Delete ${deletingAgent?.name ?? "agent"}?`}
        confirmLabel="Delete agent"
        onConfirm={deleteAgent}
        onCancel={() => setDeletingAgent(null)}
      />
    </div>
  );
}

export default BDAgentManagerComponent;
