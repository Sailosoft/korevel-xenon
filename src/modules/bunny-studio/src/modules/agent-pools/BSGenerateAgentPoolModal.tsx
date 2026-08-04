/**
 * BSGenerateAgentPoolModal — Modal for generating an AI agent pool.
 *
 * Takes a natural-language description and uses Helix AI to generate:
 *   - a pool (name + description)
 *   - a set of initial agents (name, persona, skills)
 *
 * The pool and its agents are saved directly to IndexedDB. Opens via the
 * "Generate Pool" header action on the Agent Pools page.
 */

"use client";

import React, { useCallback, useState } from "react";
import { Button, Label, TextArea } from "@heroui/react";
import {
  WandSparkles,
  Loader2,
  CheckCircle2,
  XCircle,
  Brain,
  Layers,
  ArrowRight,
} from "lucide-react";
import { v7 as uuidv7 } from "uuid";
import { useRouter } from "next/navigation";
import { bsDB } from "../../BSDatabase";
import { useBSAISettings } from "../ai-settings/BSAISettings.Context";
import { bsAgentGeneratePool } from "../agents/BSAgentGenerate.Server";

interface BSGenerateAgentPoolModalProps {
  open: boolean;
  onClose: () => void;
  /** Called after the pool + agents are generated & saved */
  onGenerated?: (poolId: string) => void;
}

export default function BSGenerateAgentPoolModal({
  open,
  onClose,
  onGenerated,
}: BSGenerateAgentPoolModalProps) {
  const { aiConfig } = useBSAISettings();
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generatedPoolId, setGeneratedPoolId] = useState<string | null>(null);

  const handleClose = useCallback(() => {
    setDescription("");
    setResult(null);
    setError(null);
    setGeneratedPoolId(null);
    onClose();
  }, [onClose]);

  const handleGenerate = useCallback(async () => {
    const trimmed = description.trim();
    if (!trimmed) {
      setError("Please describe the agent pool you want to create.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const { pool, agents } = await bsAgentGeneratePool({
        description: trimmed,
        aiConfig,
      });

      // 1. Create the agent pool
      const created = await bsDB.agentPoolsRepo.createPool({
        name: pool.name,
        description: pool.description,
      });

      // 2. Save each generated agent into the new pool
      const saved: string[] = [];
      for (const agent of agents) {
        await bsDB.agents.add({
          id: uuidv7(),
          name: agent.name,
          persona: agent.persona,
          skills: agent.skills.join(", "),
          agentPoolId: created.id,
        });
        saved.push(agent.name);
      }

      setGeneratedPoolId(created.id);
      setResult(
        `Created agent pool "${created.name}" with ${saved.length} AI agent${saved.length !== 1 ? "s" : ""}:\n${saved.map((n) => `  • ${n}`).join("\n")}`,
      );

      // Reset description for next use
      setDescription("");
      onGenerated?.(created.id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate agent pool",
      );
    } finally {
      setIsGenerating(false);
    }
  }, [description, aiConfig, onGenerated]);

  const handleViewAgents = useCallback(() => {
    if (generatedPoolId) {
      router.push(`/modules/bunny-studio/agent-pools/${generatedPoolId}/agents`);
    }
  }, [generatedPoolId, router]);

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
                Generate Agent Pool
              </h3>
              <p className="text-xs text-default-400 mt-0.5">
                AI-powered pool + agent team generation
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
          {/* Description Input */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium">Pool Description</Label>
            <TextArea
              placeholder="Describe the agent pool you need — its purpose and the agents that should belong to it.&#10;e.g. A content writing pool with a strategist, writer, editor, and SEO specialist"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[120px]"
            />
            <p className="text-[10px] text-default-400">
              The AI proposes a pool name + description and generates dedicated
              agents with tailored personas and skills for each role.
            </p>
          </div>

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
              Describe the pool you want — the AI generates a pool definition
              plus 1-8 specialized agents, then saves the pool and its agents
              directly to Bunny Studio.
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
          {generatedPoolId && (
            <button
              onClick={handleViewAgents}
              className="px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-800 flex items-center gap-1"
            >
              <Layers className="w-3.5 h-3.5" />
              View Pool Agents
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
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
                Generate Pool
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
