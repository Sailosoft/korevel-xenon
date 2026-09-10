"use client";

// BKStepAIRefine.ts
//
// Reusable logic + hook for AI-powered refinement of an existing
// train-of-thought sequence.
//
// The hook owns the refinement instruction, loading and error state, and
// delegates the model call to `refineStepsAction`. The AI returns the FULL
// revised sequence, so a single instruction can add steps, update step
// names/prompts, and remove steps at once.
//
// `BKStepAIRefine.Modal.tsx` renders this hook as a dialog.
//
// Shared by:
// - BKThinkStudioAnon (anonymous Think Studio)
// - BKThoughtDetailPage (persistent thought editor)

import { useCallback, useMemo, useState } from "react";
import { toast } from "@heroui/react";
import {
  refineStepsAction,
  type BKRefinedStep,
} from "../think/BKThink.Actions";
import type { HelixAIOption } from "@/src/modules/helix";

// ─── Re-exports for consumers ───────────────────────────────────────────

export type { BKRefinedStep };

// ─── Types ──────────────────────────────────────────────────────────────

/** Minimal step shape expected from the current editor. */
export interface BKStepAIRefineStep {
  name: string;
  thought: string;
  order?: number;
}

/** Context required to refine steps for a thought. */
export interface BKStepAIRefineContext {
  /** The current steps to refine. */
  steps: BKStepAIRefineStep[];
  /** Optional thought context to keep the refinement coherent. */
  thoughtName?: string;
  thoughtDescription?: string;
  thoughtContent?: string;
  /** AI config (provider + model). */
  aiConfig: HelixAIOption;
}

export interface UseStepAIRefineOptions extends BKStepAIRefineContext {
  /** Called with the full revised step sequence. */
  onRefined: (steps: BKRefinedStep[]) => void;
}

export interface UseStepAIRefineReturn {
  /** Natural-language refinement instruction. */
  instruction: string;
  setInstruction: (instruction: string) => void;
  /** True while the model call is in flight. */
  refining: boolean;
  /** Last refinement error, if any. */
  error: string;
  /** Whether a refinement can be submitted. */
  canRefine: boolean;
  /** Run the refinement request. */
  refine: () => Promise<void>;
  /** Clear transient instruction/error state. */
  reset: () => void;
}

// ─── Hook ───────────────────────────────────────────────────────────────

export function useStepAIRefine({
  steps,
  thoughtName,
  thoughtDescription,
  thoughtContent,
  aiConfig,
  onRefined,
}: UseStepAIRefineOptions): UseStepAIRefineReturn {
  const [instruction, setInstruction] = useState("");
  const [refining, setRefining] = useState(false);
  const [error, setError] = useState("");

  const canRefine = useMemo(
    () => instruction.trim().length > 0 && steps.length > 0,
    [instruction, steps.length],
  );

  const reset = useCallback(() => {
    setInstruction("");
    setError("");
  }, []);

  const refine = useCallback(async () => {
    if (!instruction.trim()) {
      setError("Provide a refinement instruction.");
      return;
    }
    if (steps.length === 0) {
      setError("There are no steps to refine.");
      return;
    }

    setRefining(true);
    setError("");
    try {
      const result = await refineStepsAction({
        instruction,
        steps: steps.map((s, i) => ({
          name: s.name,
          thought: s.thought,
          order: s.order ?? i,
        })),
        thoughtName,
        thoughtDescription,
        thoughtContent,
        aiConfig,
      });

      if (!result.success) {
        const message = result.error || "Failed to refine steps";
        setError(message);
        toast.danger(message);
        return;
      }

      if (!result.steps || result.steps.length === 0) {
        const message = "The AI removed every step. Try a different instruction.";
        setError(message);
        toast.danger(message);
        return;
      }

      onRefined(result.steps);
      toast.success(
        `${result.steps.length} step${result.steps.length > 1 ? "s" : ""} after refinement`,
      );
      setInstruction("");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown refinement error";
      setError(message);
      toast.danger(message);
    } finally {
      setRefining(false);
    }
  }, [
    instruction,
    steps,
    thoughtName,
    thoughtDescription,
    thoughtContent,
    aiConfig,
    onRefined,
  ]);

  return {
    instruction,
    setInstruction,
    refining,
    error,
    canRefine,
    refine,
    reset,
  };
}
