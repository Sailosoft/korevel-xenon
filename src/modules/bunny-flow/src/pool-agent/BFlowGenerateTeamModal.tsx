/**
 * BFlowGenerateTeamModal — Modal for generating a team of AI agents
 * from a natural-language description using AI.
 *
 * Opens via the "Generate Agents" header action in the pool agents list.
 * Parses the description and creates pool agent entities.
 */

"use client";

import React, { useCallback, useState } from "react";
import { Button, Input, Label, TextArea } from "@heroui/react";
import { WandSparkles, Loader2, CheckCircle2, XCircle, Brain } from "lucide-react";
import { v7 as uuidv7 } from "uuid";
import { bflowDB } from "../database/BFlowDatabase";
import type { BFlowPoolAgentEntity } from "./BFlowPoolAgent.Types";

interface BFlowGenerateTeamModalProps {
  open: boolean;
  poolId: string;
  onClose: () => void;
}

/**
 * Parse a description into multiple agent definitions.
 * Splits by lines or commas and creates an agent entry for each.
 */
function parseDescriptionToAgents(
  poolId: string,
  description: string,
): Pick<BFlowPoolAgentEntity, "name" | "role" | "prompt" | "poolId">[] {
  const now = new Date();
  const lines = description
    .split(/[,;\n]+/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    // Fallback: create a single generic agent
    return [
      {
        poolId,
        name: "agent-default",
        role: "Default Agent",
        prompt: description || "You are a helpful AI assistant.",
      },
    ];
  }

  return lines.map((line) => {
    const slug = line
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 48);
    return {
      poolId,
      name: `agent-${slug}`,
      role: line,
      prompt: `You are an AI agent specialized in: ${line}.\n\nApply your expertise with precision and thoroughness.`,
    };
  });
}

export default function BFlowGenerateTeamModal({
  open,
  poolId,
  onClose,
}: BFlowGenerateTeamModalProps) {
  const [description, setDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!description.trim()) {
      setError("Please enter a description for the agent team.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const agents = parseDescriptionToAgents(poolId, description);

      // Save each agent to IndexedDB
      const saved: string[] = [];
      for (const agent of agents) {
        const entity: BFlowPoolAgentEntity = {
          id: uuidv7(),
          ...agent,
          provider: undefined,
          model: undefined,
          capabilities: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await bflowDB.poolAgents.add(entity);
        saved.push(entity.name);
      }

      setResult(
        `Generated ${saved.length} agent${saved.length !== 1 ? "s" : ""}:\n${saved.map((n) => `  • ${n}`).join("\n")}`,
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
  }, [description, poolId]);

  const handleClose = useCallback(() => {
    setDescription("");
    setResult(null);
    setError(null);
    onClose();
  }, [onClose]);

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
                Describe the team of agents you need
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
            <Label className="text-xs font-medium">
              Agent Descriptions
            </Label>
            <TextArea
              placeholder="Describe each agent role, separated by commas or new lines&#10;e.g. Content Writer, Code Reviewer, Data Analyst, SEO Specialist"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[120px]"
            />
            <p className="text-[10px] text-default-400">
              Each description becomes a dedicated agent with a system prompt
              tailored to that role.
            </p>
          </div>

          {/* Info */}
          <div className="bg-default-50 rounded-xl p-3 text-xs text-default-500 space-y-1">
            <p className="font-medium text-default-600">How it works:</p>
            <p>
              Enter the roles you need (one per line or comma-separated). Each
              role will generate a dedicated agent with a specialized system
              prompt, saved directly to this pool.
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
            isDisabled={isGenerating || !description.trim()}
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
