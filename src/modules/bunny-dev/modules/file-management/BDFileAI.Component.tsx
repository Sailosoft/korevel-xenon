"use client";

// BDFileAI.Component — the file AI assistant modal.
//
// Flow: the user describes a change → the server action asks Helix for patches
// ({ patternToReplaceStart, patternToReplaceEnd, contentReplace }[]) → the
// client applies them and shows a git-style diff → Accept all / Reject all.
// Accepting updates the editor content only; Save still persists.

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Sparkles, Check, X } from "lucide-react";
import { bdDB } from "../../BDDatabase";
import { useBDAISettings } from "../ai-settings/BDAISettings.Context";
import BDButton from "../../components/BDButton";
import BDModal from "../../components/BDModal";
import BDDiffView from "../../components/BDDiffView";
import { useBDToast } from "../../components/BDToast";
import { bdFileAssist } from "./BDFileAI.Server";
import {
  applyFilePatches,
  BDFilePatchError,
  type BDFilePatch,
} from "./BDFile.Patch";

type BDFileAIPhase = "form" | "loading" | "review";

export interface BDFileAIComponentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  fileName: string;
  language?: string;
  /** The current editor content sent to the AI. */
  content: string;
  /** Called with the patched content when the user accepts. */
  onAccept: (next: string) => void;
}

export function BDFileAIComponent({
  open,
  onOpenChange,
  projectId,
  fileName,
  language,
  content,
  onAccept,
}: BDFileAIComponentProps) {
  const { aiConfig: globalAiConfig } = useBDAISettings();
  const { toast } = useBDToast();

  // Per-project override (project-{id}) wins over the global singleton,
  // matching the shared generation panel.
  const overrideKey = `project-${projectId}`;
  const projectOverride = useLiveQuery(
    () => bdDB.aiSettings.get(overrideKey),
    [overrideKey],
  );
  const aiConfig = projectOverride
    ? { provider: projectOverride.provider, model: projectOverride.model }
    : globalAiConfig;

  const [phase, setPhase] = useState<BDFileAIPhase>("form");
  const [instruction, setInstruction] = useState("");
  const [patches, setPatches] = useState<BDFilePatch[]>([]);
  const [modified, setModified] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setPhase("form");
    setInstruction("");
    setPatches([]);
    setModified(null);
    setError(null);
  };

  const isLoading = phase === "loading";

  const handleClose = () => {
    if (isLoading) return;
    reset();
    onOpenChange(false);
  };

  const handleGenerate = async () => {
    if (!instruction.trim()) {
      toast({ title: "Describe the change first", status: "warning" });
      return;
    }
    setPhase("loading");
    setError(null);
    try {
      const result = await bdFileAssist({
        fileName,
        language,
        content,
        instruction: instruction.trim(),
        aiConfig: { provider: aiConfig.provider, model: aiConfig.model },
      });

      let applied: { content: string; applied: number };
      try {
        applied = applyFilePatches(content, result);
      } catch (err) {
        setError(
          err instanceof BDFilePatchError
            ? err.message
            : "The AI changes could not be applied to the file.",
        );
        setPhase("form");
        return;
      }

      setPatches(result);
      setModified(applied.content);
      setPhase("review");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate changes.",
      );
      setPhase("form");
    }
  };

  const handleAccept = () => {
    if (modified === null) return;
    onAccept(modified);
    reset();
    onOpenChange(false);
  };

  return (
    <BDModal
      open={open}
      onClose={handleClose}
      title="AI Assistant"
      description={
        phase === "review"
          ? "Review the changes below. Nothing is saved until you accept."
          : "Describe what you want changed. The assistant reads the current file content."
      }
      size="lg"
      footer={
        phase === "review" ? (
          <>
            <BDButton variant="ghost" icon={X} onClick={handleClose}>
              Reject
            </BDButton>
            <BDButton icon={Check} onClick={handleAccept}>
              Accept changes
            </BDButton>
          </>
        ) : (
          <>
            <BDButton variant="ghost" onClick={handleClose} disabled={isLoading}>
              Cancel
            </BDButton>
            <BDButton
              icon={Sparkles}
              isLoading={isLoading}
              onClick={handleGenerate}
            >
              Generate
            </BDButton>
          </>
        )
      }
    >
      {phase === "review" && modified !== null ? (
        <div className="flex flex-col gap-3">
          <BDDiffView
            original={content}
            modified={modified}
            fileName={fileName}
          />
          <p className="text-xs text-slate-500">
            {patches.length} patch{patches.length === 1 ? "" : "es"} applied.
            Accepting applies the changes and saves the file.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-slate-500">
              Request
            </span>
            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="e.g. Rename the function `fetchData` to `loadData` and update its call sites."
              rows={5}
              disabled={isLoading}
              className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 disabled:bg-slate-50 disabled:text-slate-400"
            />
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
      )}
    </BDModal>
  );
}

export default BDFileAIComponent;
