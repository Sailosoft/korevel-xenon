"use client";

// BDGenerationPanel — the shared one-shot batch generation UI for every
// BunnyDev subsystem.
//
// Lifecycle: the host page opens the generation modal from a header action →
// pick a mode (create / append / replace) + instruction → Generate (records a
// generationRun) → the full serializable artifact set is stored as a pending
// batchProposal → review preview → Apply (all-or-nothing) or Reject.

import { useState, type ReactNode } from "react";
import { Sparkles, Check, X } from "lucide-react";
import type {
  BDBatchProposal,
  BDGenerationMode,
  BDSubsystem,
} from "../../BDDomain.Types";
import { useBDAISettings } from "../ai-settings/BDAISettings.Context";
import { useBDProject } from "../core/BDProject.Hooks";
import BDButton from "../../components/BDButton";
import BDModal from "../../components/BDModal";
import { useBDToast } from "../../components/BDToast";
import {
  createBatchProposal,
  createGenerationRun,
  finishGenerationRun,
  resolveBatchProposal,
} from "./BDBatch.Repository";

export interface BDGenerationArgs {
  projectId: string;
  mode: BDGenerationMode;
  instruction: string;
  aiConfig: { provider: string; model: string };
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
  onApply: (artifact: TArtifact, mode: BDGenerationMode) => Promise<void>;
  extraFields?: ReactNode;
  onApplied?: (proposal: BDBatchProposal) => void;
}

const ALL_MODES: BDGenerationMode[] = ["create", "append", "replace"];

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
}: BDGenerationPanelProps<TArtifact>) {
  const { aiConfig } = useBDAISettings();
  const { toast } = useBDToast();
  const project = useBDProject(projectId);
  const projectDescription = project?.description?.trim() || "";

  const [mode, setMode] = useState<BDGenerationMode>(defaultMode);
  const [instruction, setInstruction] = useState("");
  const [includeProjectDescription, setIncludeProjectDescription] =
    useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [artifact, setArtifact] = useState<TArtifact | null>(null);
  const [proposal, setProposal] = useState<BDBatchProposal | null>(null);

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
    setIsGenerating(true);
    setError(null);

    const effectiveInstruction = buildInstruction();

    const run = await createGenerationRun({
      projectId,
      subsystem,
      mode,
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
      });
      const created = await createBatchProposal({
        projectId,
        subsystem,
        mode,
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
      await onApply(artifact, mode);
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
                onChange={(e) => setMode(e.target.value as BDGenerationMode)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-blue-400"
              >
                {modes.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>

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
        description="Nothing is written until you apply. Applying replaces the whole set for this subsystem according to the selected mode."
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
