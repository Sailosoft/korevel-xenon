/**
 * BSGenerateAgentsModal — Modal for generating AI agents from a natural-language
 * description using Helix AI.
 *
 * Mirrors Bunny Flow's BFlowGenerateTeamModal ("Generated Agents") but lives in
 * Bunny Studio. Opens via the "Generate Agents" header action on:
 *   - the pool-scoped agent list (agents are saved to that pool), or
 *   - the global Agents page (agents are saved as global, or to a chosen pool).
 *
 * Uses the global AI settings (BSAISettingsProvider) for the AI provider/model.
 */

"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Button, Label, TextArea } from "@heroui/react";
import {
  WandSparkles,
  Loader2,
  CheckCircle2,
  XCircle,
  Brain,
  ToggleLeft,
  ToggleRight,
  Users,
} from "lucide-react";
import { v7 as uuidv7 } from "uuid";
import { bsDB } from "../../BSDatabase";
import { useBSAISettings } from "../ai-settings/BSAISettings.Context";
import { bsAgentGenerateTeam } from "./BSAgentGenerate.Server";
import type { BunnySelectOption } from "@/src/modules/bunny/src/form/BunnyForm.Interface";

interface BSGenerateAgentsModalProps {
  open: boolean;
  onClose: () => void;
  /** When provided, generated agents are assigned to this pool */
  poolId?: string;
  /** The pool's description — used when generating from pool description */
  poolDescription?: string;
  /** Called after agents are generated & saved (e.g. to refresh the table) */
  onGenerated?: () => void;
}

type GenerateMode = "pool-description" | "custom-instructions";

export default function BSGenerateAgentsModal({
  open,
  onClose,
  poolId,
  poolDescription,
  onGenerated,
}: BSGenerateAgentsModalProps) {
  const { aiConfig } = useBSAISettings();
  const [description, setDescription] = useState("");
  const [generateMode, setGenerateMode] = useState<GenerateMode>(
    poolDescription ? "pool-description" : "custom-instructions",
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Optional target pool (only used on the global Agents page).
  const [poolOptions, setPoolOptions] = useState<BunnySelectOption[]>([]);
  const [targetPoolId, setTargetPoolId] = useState<string>("");

  // Load pool options when generating from the global Agents page.
  // When `poolId` is provided it always takes precedence over any selection.
  useEffect(() => {
    if (poolId) return;
    bsDB.agentPoolsRepo
      .toSelectOptions()
      .then(setPoolOptions)
      .catch(() => setPoolOptions([]));
  }, [poolId]);

  const toggleMode = useCallback(() => {
    setGenerateMode((prev) =>
      prev === "pool-description" ? "custom-instructions" : "pool-description",
    );
    setResult(null);
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    setDescription("");
    setResult(null);
    setError(null);
    setGenerateMode(poolDescription ? "pool-description" : "custom-instructions");
    onClose();
  }, [onClose, poolDescription]);

  const handleGenerate = useCallback(async () => {
    const effectiveDescription =
      generateMode === "pool-description"
        ? poolDescription || ""
        : description.trim();

    if (!effectiveDescription) {
      setError(
        generateMode === "pool-description"
          ? "This pool has no description. Switch to custom instructions or add a description to the pool."
          : "Please enter a description for the agents.",
      );
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const generatedAgents = await bsAgentGenerateTeam({
        description: effectiveDescription,
        aiConfig,
      });

      const effectivePoolId = poolId || targetPoolId || undefined;

      const saved: string[] = [];
      for (const agent of generatedAgents) {
        await bsDB.agents.add({
          id: uuidv7(),
          name: agent.name,
          persona: agent.persona,
          skills: agent.skills.join(", "),
          agentPoolId: effectivePoolId,
        });
        saved.push(agent.name);
      }

      setResult(
        `AI generated ${saved.length} agent${saved.length !== 1 ? "s" : ""}:\n${saved.map((n) => `  • ${n}`).join("\n")}`,
      );

      // Reset description for next use
      setDescription("");
      onGenerated?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate agents",
      );
    } finally {
      setIsGenerating(false);
    }
  }, [
    description,
    poolId,
    targetPoolId,
    aiConfig,
    generateMode,
    poolDescription,
    onGenerated,
  ]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-2xl shadow-xl max-w-lg w-full mx-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-default-100">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-red-500" />
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Generate Agents
              </h3>
              <p className="text-xs text-default-400 mt-0.5">
                AI-powered agent generation from a natural-language description
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-default-400 hover:text-default-600 h-8 w-8 flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Mode Toggle */}
          {poolDescription && (
            <div className="flex items-center justify-between bg-default-50 rounded-xl p-2.5">
              <div className="flex items-center gap-2">
                {generateMode === "pool-description" ? (
                  <ToggleRight className="w-4 h-4 text-red-500" />
                ) : (
                  <ToggleLeft className="w-4 h-4 text-default-400" />
                )}
                <span className="text-xs font-medium text-default-600">
                  {generateMode === "pool-description"
                    ? "Using pool description"
                    : "Using custom instructions"}
                </span>
              </div>
              <button
                onClick={toggleMode}
                className="text-[11px] text-red-500 hover:text-red-700 font-medium"
              >
                Switch to{" "}
                {generateMode === "pool-description" ? "custom" : "pool description"}
              </button>
            </div>
          )}

          {/* Pool Description Display (read-only when using pool description) */}
          {generateMode === "pool-description" && poolDescription && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <Label className="text-[11px] font-medium text-red-600 mb-1 block">
                Pool Description
              </Label>
              <p className="text-xs text-red-700 whitespace-pre-wrap">
                {poolDescription}
              </p>
            </div>
          )}

          {/* Custom Instructions Input */}
          {(generateMode === "custom-instructions" || !poolDescription) && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium">Agent Descriptions</Label>
              <TextArea
                placeholder="Describe the agents you need — roles, specialties, or a high-level goal.&#10;e.g. I need a content writing team with a strategist, writer, editor, and SEO specialist"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[120px]"
              />
              <p className="text-[10px] text-default-400">
                The AI analyzes your description and generates dedicated agents
                with tailored personas and skills for each role.
              </p>
            </div>
          )}

          {/* Target pool (only on the global Agents page) */}
          {!poolId && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium">
                Assign to Agent Pool{" "}
                <span className="text-[10px] text-default-400">(optional)</span>
              </Label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-default-400 pointer-events-none" />
                <select
                  value={targetPoolId}
                  onChange={(e) => setTargetPoolId(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-red-400 bg-white"
                >
                  <option value="">Global (no pool)</option>
                  {poolOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[10px] text-default-400">
                Leave as global, or choose a pool so the generated agents are
                grouped inside it.
              </p>
            </div>
          )}

          {/* AI Config Indicator */}
          {aiConfig && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-2.5 text-[11px] text-red-600 flex items-center gap-2">
              <Brain className="w-3.5 h-3.5 shrink-0" />
              <span>
                Using AI config: <strong>{aiConfig.provider}</strong>
                {aiConfig.model ? ` / ${aiConfig.model}` : ""}
              </span>
            </div>
          )}

          {/* Info */}
          <div className="bg-default-50 rounded-xl p-3 text-xs text-default-500 space-y-1">
            <p className="font-medium text-default-600">How it works:</p>
            <p>
              {generateMode === "pool-description"
                ? "The AI will use this pool's description to generate specialized agents. Each agent gets a unique name, persona, and skill tags, then saves directly to this pool."
                : "Describe the agents you want — include roles, specialties, or a high-level goal. The AI generates dedicated agents with unique names, personas, and skill tags, then saves them."}
            </p>
          </div>

          {/* Result / Error */}
          {result && (
            <div className="bg-success-50 border border-success-200 rounded-xl p-3 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
              <pre className="text-xs text-success-700 whitespace-pre-wrap font-sans">
                {result}
              </pre>
            </div>
          )}
          {error && (
            <div className="bg-danger-50 border border-danger-200 rounded-xl p-3 flex items-start gap-2">
              <XCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
              <p className="text-xs text-danger-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-default-100">
          <button
            onClick={handleClose}
            className="px-3 py-1.5 text-xs font-medium text-default-500 hover:text-default-700"
          >
            Close
          </button>
          <Button
            onPress={handleGenerate}
            variant="primary"
            size="sm"
            isDisabled={isGenerating}
            className="bg-red-600 text-white"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <WandSparkles className="w-4 h-4" />
                Generate Agents
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
