"use client";

// BDGenerationPanel — the shared one-shot batch generation UI for every
// BunnyDev subsystem.
//
// Lifecycle: the host page opens the generation modal from a header action →
// pick a mode (create / append / update / replace), optionally pick an
// existing target record → instruction → Generate (records a generationRun) →
// the full serializable artifact set is stored as a pending batchProposal →
// review preview → Apply (all-or-nothing) or Reject.

import { useState, type ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Sparkles, Check, X } from "lucide-react";
import type {
  BDBatchProposal,
  BDGenerationMode,
  BDSubsystem,
} from "../../BDDomain.Types";
import { bdDB } from "../../BDDatabase";
import { useBDAISettings } from "../ai-settings/BDAISettings.Context";
import { useBDProject } from "../core/BDProject.Hooks";
import BDButton from "../../components/BDButton";
import BDModal from "../../components/BDModal";
import { useBDToast } from "../../components/BDToast";
import { BD_GENERATION_MODE_LABELS } from "./BDGeneration.Mode";
import {
  createBatchProposal,
  createGenerationRun,
  finishGenerationRun,
  resolveBatchProposal,
} from "./BDBatch.Repository";

export interface BDGenerationTarget {
  id: string;
  label: string;
  hint?: string;
}

export interface BDGenerationArgs {
  projectId: string;
  mode: BDGenerationMode;
  instruction: string;
  aiConfig: { provider: string; model: string };
  targetId?: string;
  targetContext?: string;
}

export interface BDGenerationPanelProps<TArtifact> {
  projectId: string;
  subsystem: BDSubsystem;
  title?: string;
  description?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultMode?: BDGenerationMode;
  modes?: BDGenerationMode[];
  placeholder?: string;
  generateLabel?: string;
  applyLabel?: string;
  generate: (args: BDGenerationArgs) => Promise<TArtifact>;
  renderPreview?: (artifact: TArtifact, mode: BDGenerationMode) => ReactNode;
  onApply: (
    artifact: TArtifact,
    mode: BDGenerationMode,
    targetId?: string,
  ) => Promise<void>;
  extraFields?: ReactNode;
  onApplied?: (proposal: BDBatchProposal) => void;
  /** Existing records selectable as the append/update/replace target. */
  targets?: BDGenerationTarget[];
  /** Label for the target selector (e.g. "Schema group", "Board"). */
  targetLabel?: string;
  /** Modes that show + require a target selection. */
  targetModes?: BDGenerationMode[];
  /** Serialize the selected target for the AI prompt. */
  buildTargetContext?: (targetId: string) => string | undefined;
}

const ALL_MODES: BDGenerationMode[] = ["create", "append", "update", "replace"];
const DEFAULT_TARGET_MODES: BDGenerationMode[] = [
  "append",
  "update",
  "replace",
];

export function BDGenerationPanel<TArtifact>({
  projectId,
  subsystem,
  title = "AI Generation",
  description = "Generate a full artifact set from an instruction, review it, then apply all-or-nothing.",
  open,
  onOpenChange,
  defaultMode = "create",
  modes = ALL_MODES,
  placeholder = "Describe what to generate…",
  generateLabel = "Generate",
  applyLabel = "Apply",
  generate,
  renderPreview,
  onApply,
  extraFields,
  onApplied,
  targets,
  targetLabel = "Target",
  targetModes = DEFAULT_TARGET_MODES,
  buildTargetContext,
}: BDGenerationPanelProps<TArtifact>) {
  const { aiConfig: globalAiConfig } = useBDAISettings();
  const { toast } = useBDToast();
  const project = useBDProject(projectId);
  const projectDescription = project?.description?.trim() || "";

  // Per-project override (project-{id}) takes precedence over the global
  // singleton, matching Project Settings. Reactive so a change applies here too.
  const overrideKey = `project-${projectId}`;
  const projectOverride = useLiveQuery(
    () => bdDB.aiSettings.get(overrideKey),
    [overrideKey],
  );
  const aiConfig = projectOverride
    ? { provider: projectOverride.provider, model: projectOverride.model }
    : globalAiConfig;

  const [mode, setMode] = useState<BDGenerationMode>(defaultMode);
  const [targetId, setTargetId] = useState<string>("");
  const [instruction, setInstruction] = useState("");
  const [includeProjectDescription, setIncludeProjectDescription] =
    useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [artifact, setArtifact] = useState<TArtifact | null>(null);
  const [proposal, setProposal] = useState<BDBatchProposal | null>(null);

  const targetRequired = targetModes.includes(mode) && !!targets;
  const hasTargets = !!targets && targets.length > 0;

  const changeMode = (next: BDGenerationMode) => {
    setMode(next);
    if (!targetModes.includes(next)) setTargetId("");
  };

  const closePanel = () => {
    if (isGenerating) return;
    setError(null);
    onOpenChange(false);
  };

  const buildInstruction = () => {
    if (!includeProjectDescription || !projectDescription) return instruction;
    const heading = project?.name
      ? `Project "${project.name}" description:\n${projectDescription}`
      : `Project description:\n${projectDescription}`;
    return `${heading}\n\nUser instruction:\n${instruction}`;
  };

  const handleGenerate = async () => {
    if (!instruction.trim()) {
      toast({ title: "Add an instruction first", status: "warning" });
      return;
    }
    if (targetRequired && !targetId) {
      toast({
        title: `Select a ${targetLabel.toLowerCase()} first`,
        status: "warning",
      });
      return;
    }
    setIsGenerating(true);
    setError(null);

    const effectiveInstruction = buildInstruction();
    const effectiveTargetId = targetRequired ? targetId || undefined : undefined;
    const targetContext = effectiveTargetId
      ? buildTargetContext?.(effectiveTargetId)
      : undefined;

    const run = await createGenerationRun({
      projectId,
      subsystem,
      mode,
      targetId: effectiveTargetId,
      instruction: effectiveInstruction,
      provider: aiConfig.provider,
      model: aiConfig.model,
    });

    try {
      const result = await generate({
        projectId,
        mode,
        instruction: effectiveInstruction,
        aiConfig: { provider: aiConfig.provider, model: aiConfig.model },
        targetId: effectiveTargetId,
        targetContext,
      });
      const created = await createBatchProposal({
        projectId,
        subsystem,
        mode,
        targetId: effectiveTargetId,
        artifact: result,
        summary: instruction.slice(0, 140),
        runId: run.id,
      });
      await finishGenerationRun(run.id, "finished");
      setArtifact(result);
      setProposal(created);
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await finishGenerationRun(run.id, "failed", message);
      setError(message);
      toast({ title: "Generation failed", description: message, status: "error" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = async () => {
    if (!artifact || !proposal) return;
    setIsApplying(true);
    try {
      const effectiveTargetId = targetModes.includes(mode)
        ? targetId || undefined
        : undefined;
      await onApply(artifact, mode, effectiveTargetId);
      await resolveBatchProposal(proposal.id, "applied");
      onApplied?.(proposal);
      toast({ title: "Applied successfully", status: "success" });
      setArtifact(null);
      setProposal(null);
      setInstruction("");
    } catch (err) {
      toast({
        title: "Apply failed",
        description: err instanceof Error ? err.message : undefined,
        status: "error",
      });
    } finally {
      setIsApplying(false);
    }
  };

  const handleReject = async () => {
    if (proposal) await resolveBatchProposal(proposal.id, "rejected");
    setArtifact(null);
    setProposal(null);
  };

  return (
    <>
      <BDModal
        open={open}
        onClose={closePanel}
        title={title}
        description={description}
        size="lg"
        footer={
          <>
            <BDButton
              variant="ghost"
              onClick={closePanel}
              disabled={isGenerating}
            >
              Cancel
            </BDButton>
            <BDButton
              icon={Sparkles}
              isLoading={isGenerating}
              onClick={handleGenerate}
            >
              {generateLabel}
            </BDButton>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-slate-500">
                Mode
              </span>
              <select
                value={mode}
                onChange={(e) =>
                  changeMode(e.target.value as BDGenerationMode)
                }
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-blue-400"
              >
                {modes.map((m) => (
                  <option key={m} value={m}>
                    {BD_GENERATION_MODE_LABELS[m]}
                  </option>
                ))}
              </select>
            </label>

            {targetModes.includes(mode) && targets && (
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-medium text-slate-500">
                  {targetLabel}
                </span>
                <select
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  disabled={!hasTargets}
                  className="max-w-[18rem] rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-blue-400 disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">
                    {hasTargets ? `Select ${targetLabel.toLowerCase()}…` : `No ${targetLabel.toLowerCase()} yet`}
                  </option>
                  {targets.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                      {t.hint ? ` · ${t.hint}` : ""}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {extraFields}
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-slate-500">
              Instruction
            </span>
            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder={placeholder}
              rows={5}
              className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
          </label>

          <label className="flex items-start gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={includeProjectDescription && !!projectDescription}
              disabled={!projectDescription}
              onChange={(e) => setIncludeProjectDescription(e.target.checked)}
              className="mt-0.5"
            />
            <span className="flex flex-col gap-0.5">
              <span>Include project description in the instruction</span>
              {projectDescription ? (
                <span className="line-clamp-2 text-slate-400">
                  {projectDescription}
                </span>
              ) : (
                <span className="text-slate-400">
                  This project has no description yet.
                </span>
              )}
            </span>
          </label>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-600">
              {error}
            </p>
          )}
          <p className="text-[11px] text-slate-400">
            Using {aiConfig.provider} / {aiConfig.model}
          </p>
        </div>
      </BDModal>

      <BDModal
        open={artifact !== null}
        onClose={handleReject}
        title="Review generated artifacts"
        description={
          mode === "create"
            ? "Nothing is written until you apply. Applying creates new records."
            : mode === "append"
              ? "Nothing is written until you apply. Applying adds the generated items to the selected target; existing items are kept."
              : mode === "update"
                ? "Nothing is written until you apply. Applying merges the generated items into the selected target, preserving items not returned."
                : "Nothing is written until you apply. Applying replaces the selected target's existing contents with the generated set."
        }
        size="xl"
        footer={
          <>
            <BDButton variant="ghost" icon={X} onClick={handleReject}>
              Reject
            </BDButton>
            <BDButton
              icon={Check}
              isLoading={isApplying}
              onClick={handleApply}
            >
              {applyLabel}
            </BDButton>
          </>
        }
      >
        {artifact !== null &&
          (renderPreview ? (
            renderPreview(artifact, mode)
          ) : (
            <pre className="bd-scroll max-h-[60vh] overflow-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-100">
              {JSON.stringify(artifact, null, 2)}
            </pre>
          ))}
      </BDModal>
    </>
  );
}

export default BDGenerationPanel;
