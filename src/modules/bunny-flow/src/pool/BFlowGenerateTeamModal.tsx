/**
 * BFlowGenerateTeamModal — Modal for generating a team of AI agents
 * from a natural-language description using Helix AI.
 *
 * Opens via the "Generate Agents" header action in the pool agents list.
 * Uses structured AI output to generate professional agent definitions
 * (name, role, prompt) and saves them as pool agent entities.
 *
 * Supports two generation modes:
 *   1. From Pool Description — uses the pool's own description as context
 *   2. From Custom Instructions — uses the user's typed instructions
 *
 * Supports an optional BFlowAIConfigValue to override the AI provider/model.
 */

"use client";

import React, { useCallback, useState } from "react";
import { Button, Input, Label, TextArea } from "@heroui/react";
import { WandSparkles, Loader2, CheckCircle2, XCircle, Brain, ToggleLeft, ToggleRight } from "lucide-react";
import { v7 as uuidv7 } from "uuid";
import { bflowDB } from "../database/BFlowDatabase";
import type { BFlowPoolAgentEntity } from "./BFlowPoolAgent.Types";
import type { BFlowAIConfigValue } from "../ai-config/BFlowAIConfig.Types";
import { bflowPoolAgentGenerateTeam } from "./BFlowPoolAgent.Server";

interface BFlowGenerateTeamModalProps {
  open: boolean;
  poolId: string;
  onClose: () => void;
  /**
   * The pool's description — used when generating from pool description.
   */
  poolDescription?: string;
  /**
   * Optional AI config override (provider + model).
   * When provided, this config is passed to the server action
   * to override the default Helix AI provider/model.
   */
  aiConfig?: BFlowAIConfigValue;
}

type GenerateMode = "pool-description" | "custom-instructions";

export default function BFlowGenerateTeamModal({
  open,
  poolId,
  onClose,
  poolDescription,
  aiConfig,
}: BFlowGenerateTeamModalProps) {
  const [description, setDescription] = useState("");
  const [generateMode, setGenerateMode] = useState<GenerateMode>(
    poolDescription ? "pool-description" : "custom-instructions",
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleMode = useCallback(() => {
    setGenerateMode((prev) =>
      prev === "pool-description" ? "custom-instructions" : "pool-description",
    );
    setResult(null);
    setError(null);
  }, []);

  const handleGenerate = useCallback(async () => {
    const effectiveDescription =
      generateMode === "pool-description"
        ? poolDescription || ""
        : description.trim();

    if (!effectiveDescription) {
      setError(
        generateMode === "pool-description"
          ? "This pool has no description. Switch to custom instructions or add a description to the pool."
          : "Please enter a description for the agent team.",
      );
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      // Call the AI-powered server action to generate agent definitions
      const generatedAgents = await bflowPoolAgentGenerateTeam({
        poolId,
        description: effectiveDescription,
        aiConfig,
      });

      // Save each agent to IndexedDB
      const saved: string[] = [];
      for (const agent of generatedAgents) {
        const entity: BFlowPoolAgentEntity = {
          id: uuidv7(),
          poolId,
          name: agent.name,
          role: agent.role,
          prompt: agent.prompt,
          provider: agent.provider,
          model: agent.model,
          capabilities: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await bflowDB.poolAgents.add(entity);
        saved.push(entity.name);
      }

      setResult(
        `AI generated ${saved.length} agent${saved.length !== 1 ? "s" : ""}:\n${saved.map((n) => `  • ${n}`).join("\n")}`,
      );

      // Reset description for next use
      setDescription("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate agents",
      );
    } finally {
      setIsGenerating(false);
    }
  }, [description, poolId, aiConfig, generateMode, poolDescription]);

  const handleClose = useCallback(() => {
    setDescription("");
    setResult(null);
    setError(null);
    setGenerateMode(poolDescription ? "pool-description" : "custom-instructions");
    onClose();
  }, [onClose, poolDescription]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-2xl shadow-xl max-w-lg w-full mx-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-default-100">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-violet-500" />
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Generate Agent Team
              </h3>
              <p className="text-xs text-default-400 mt-0.5">
                AI-powered team generation from a natural-language description
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
                  <ToggleRight className="w-4 h-4 text-violet-500" />
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
                className="text-[11px] text-violet-500 hover:text-violet-700 font-medium"
              >
                Switch to {generateMode === "pool-description" ? "custom" : "pool description"}
              </button>
            </div>
          )}

          {/* Pool Description Display (read-only when using pool description) */}
          {generateMode === "pool-description" && poolDescription && (
            <div className="bg-primary-50 border border-primary-200 rounded-xl p-3">
              <Label className="text-[11px] font-medium text-primary-600 mb-1 block">
                Pool Description
              </Label>
              <p className="text-xs text-primary-700 whitespace-pre-wrap">
                {poolDescription}
              </p>
            </div>
          )}

          {/* Custom Instructions Input */}
          {(generateMode === "custom-instructions" || !poolDescription) && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium">
                Agent Descriptions
              </Label>
              <TextArea
                placeholder="Describe the team you need — roles, specialties, or a high-level goal.&#10;e.g. I need a content writing team with a strategist, writer, editor, and SEO specialist"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[120px]"
              />
              <p className="text-[10px] text-default-400">
                The AI analyzes your description and generates dedicated agents
                with tailored system prompts for each role.
              </p>
            </div>
          )}

          {/* AI Config Indicator */}
          {aiConfig && (
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-2.5 text-[11px] text-violet-600 flex items-center gap-2">
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
                ? "The AI will use this pool's description to generate a team of specialized agents. Each agent gets a unique name, role title, and comprehensive system prompt."
                : "Describe the team you want — include roles, specialties, or a high-level goal. The AI generates dedicated agents with unique names, role titles, and comprehensive system prompts, then saves them directly to this pool."}
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
            className="bg-violet-600 text-white"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <WandSparkles className="w-4 h-4" />
                Generate Team
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
