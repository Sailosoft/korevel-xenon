"use client";

// BKStepAIGenerate.ts
//
// Reusable logic + hook for Generative AI train-of-thought step generation.
//
// The hook owns all generation state (production mode, direction, merge
// strategy, context toggles, loading, validation) and delegates the actual
// model call to `generateStepsAction`. `BKStepAIGenerate.Modal.tsx` renders
// this hook as a dialog, and any other surface can drive generation
// programmatically.
//
// Shared by:
// - BKThinkStudioAnon (anonymous Think Studio)
// - BKThoughtDetailPage (persistent thought editor)

import { useCallback, useMemo, useState } from "react";
import { toast } from "@heroui/react";
import {
  generateStepsAction,
  type BKGeneratedStep,
} from "../think/BKThink.Actions";
import {
  BK_STEP_GENERATION_MODES,
  BK_STEP_GENERATION_MODES_SORTED,
  bkGetStepGenerationMode,
  bkSortStepGenerationModes,
  type BKStepGenerationMode,
  type BKStepGenerationModeConfig,
  type BKStepGenerationStrategy,
} from "./BKStepAIGenerate.Config";
import type { BKThoughtPattern } from "../thought-pattern/BKThoughtPattern.Types";
import type { BKAssociationSlotValue } from "../thought-association/BKThoughtAssociation.Types";
import type { HelixAIOption } from "@/src/modules/helix";

// ─── Re-exports for consumers ───────────────────────────────────────────

export {
  BK_STEP_GENERATION_MODES,
  BK_STEP_GENERATION_MODES_SORTED,
  bkGetStepGenerationMode,
  bkSortStepGenerationModes,
};
export type {
  BKGeneratedStep,
  BKStepGenerationMode,
  BKStepGenerationModeConfig,
  BKStepGenerationStrategy,
};

// ─── Context baking ─────────────────────────────────────────────────────

/**
 * Bake a thought pattern (and optional association slot overrides) into a
 * compact, prompt-friendly context block.
 */
export function bkBakePatternContext(
  pattern: BKThoughtPattern,
  slotOverrides?: BKAssociationSlotValue[],
): string {
  const lines: string[] = [];
  lines.push(`Thought Pattern: ${pattern.name}`);
  if (pattern.description) {
    lines.push(pattern.description);
  }
  lines.push("");
  lines.push("Slots:");
  if (pattern.slots.length > 0) {
    for (const slot of pattern.slots) {
      const slotValue = slotOverrides?.find((sv) => sv.slotId === slot.id);
      const resolvedValue = slotValue?.value ?? slot.defaultValue ?? "";
      const label = slot.label || slot.name;
      if (resolvedValue) {
        lines.push(`  - ${label}: ${resolvedValue}`);
      } else {
        lines.push(`  - ${label}: [not set]`);
      }
    }
  } else {
    lines.push("  (no slots defined)");
  }
  return lines.join("\n");
}

// ─── Types ──────────────────────────────────────────────────────────────

/** Minimal step shape expected from the current editor. */
export interface BKStepAIGenerateExistingStep {
  name: string;
  thought: string;
}

/** Optional pattern/association context sources for generation. */
export interface BKStepAIGenerateContextSources {
  /** Whether a thought pattern is available to include in the prompt. */
  hasPattern?: boolean;
  /** Whether a thought association is available to include in the prompt. */
  hasAssociation?: boolean;
  /**
   * Resolve the pattern/association context text at generation time.
   * Only read when the corresponding toggle is enabled.
   */
  getContexts?: () => {
    patternContext?: string;
    associationContext?: string;
  };
}

/** Context required to generate steps for a thought. */
export interface BKStepAIGenerateContext extends BKStepAIGenerateContextSources {
  /** AI config (provider + model). */
  aiConfig: HelixAIOption;
  /** The thought being built — used as generation context. */
  thoughtName: string;
  /** Optional description, used as direction when enabled. */
  thoughtDescription?: string;
  thoughtContent: string;
  /** Existing steps, so the AI stays coherent when appending. */
  existingSteps?: BKStepAIGenerateExistingStep[];
}

export interface UseStepAIGenerateOptions extends BKStepAIGenerateContext {
  /** Called with the generated steps and the chosen merge strategy. */
  onGenerated: (
    steps: BKGeneratedStep[],
    strategy: BKStepGenerationStrategy,
  ) => void;
}

export interface UseStepAIGenerateReturn {
  /** Selected production mode (Analytic, Plan, SDLC, ...). */
  mode: BKStepGenerationMode;
  setMode: (mode: BKStepGenerationMode) => void;
  /** Free-form user direction for the generated steps. */
  request: string;
  setRequest: (request: string) => void;
  /** How generated steps merge with existing ones (append vs override). */
  strategy: BKStepGenerationStrategy;
  setStrategy: (strategy: BKStepGenerationStrategy) => void;
  /** When true, the thought description is treated as the primary direction. */
  useDescriptionAsDirection: boolean;
  setUseDescriptionAsDirection: (value: boolean) => void;
  /** When true, the thought's main prompt/content is included in the prompt. */
  includeThoughtPrompt: boolean;
  setIncludeThoughtPrompt: (value: boolean) => void;
  /** When true, the thought pattern is included in the prompt. */
  includePattern: boolean;
  setIncludePattern: (value: boolean) => void;
  /**
   * When true, the thought association overrides are included on top of the
   * pattern. Defaults to true when an association is available.
   */
  includeAssociation: boolean;
  setIncludeAssociation: (value: boolean) => void;
  /** Whether a thought pattern is available to include. */
  hasPattern: boolean;
  /** Whether a thought association is available to include. */
  hasAssociation: boolean;
  /** True while the model call is in flight. */
  generating: boolean;
  /** Last generation error, if any. */
  error: string;
  /** Whether the editor currently has steps to merge with. */
  hasExistingSteps: boolean;
  /**
   * Effective strategy — forced to "override" when there are no existing
   * steps, otherwise the user's selection.
   */
  resolvedStrategy: BKStepGenerationStrategy;
  /** Resolved config for the currently selected mode. */
  activeMode: BKStepGenerationModeConfig;
  /** Run the generation request. */
  generate: () => Promise<void>;
  /** Clear transient request/error state. */
  reset: () => void;
}

// ─── Hook ───────────────────────────────────────────────────────────────

export function useStepAIGenerate({
  aiConfig,
  thoughtName,
  thoughtDescription,
  thoughtContent,
  existingSteps,
  hasPattern: hasPatternSource,
  hasAssociation: hasAssociationSource,
  getContexts,
  onGenerated,
}: UseStepAIGenerateOptions): UseStepAIGenerateReturn {
  const [mode, setMode] = useState<BKStepGenerationMode>("analytic");
  const [request, setRequest] = useState("");
  const [strategy, setStrategy] = useState<BKStepGenerationStrategy>("append");
  const [useDescriptionAsDirection, setUseDescriptionAsDirection] =
    useState(true);
  const [includeThoughtPrompt, setIncludeThoughtPrompt] = useState(true);
  const [includePattern, setIncludePattern] = useState(false);
  // null → follow availability; otherwise the user's explicit choice.
  const [associationOverride, setAssociationOverride] = useState<
    boolean | null
  >(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const hasPattern = !!hasPatternSource;
  const hasAssociation = !!hasAssociationSource;
  const includeAssociation = associationOverride ?? hasAssociation;
  const setIncludeAssociation = useCallback((value: boolean) => {
    setAssociationOverride(value);
  }, []);

  const hasExistingSteps = useMemo(
    () => !!existingSteps && existingSteps.length > 0,
    [existingSteps],
  );

  // Keep the effective strategy aligned with whether existing steps are present.
  const resolvedStrategy: BKStepGenerationStrategy = hasExistingSteps
    ? strategy
    : "override";

  const activeMode = bkGetStepGenerationMode(mode);

  const reset = useCallback(() => {
    setRequest("");
    setError("");
  }, []);

  const generate = useCallback(async () => {
    setGenerating(true);
    setError("");
    try {
      // Resolve pattern/association context only when the toggles need it.
      let patternContext: string | undefined;
      let associationContext: string | undefined;
      if (includePattern && getContexts) {
        const resolved = getContexts();
        patternContext = resolved.patternContext;
        if (includeAssociation) {
          associationContext = resolved.associationContext;
        }
      }

      const result = await generateStepsAction({
        mode,
        strategy: resolvedStrategy,
        request,
        thoughtName,
        thoughtDescription,
        thoughtContent,
        existingSteps: hasExistingSteps ? existingSteps : undefined,
        useDescriptionAsDirection,
        includeThoughtPrompt,
        thoughtPatternContext: includePattern ? patternContext : undefined,
        thoughtAssociationContext:
          includePattern && includeAssociation ? associationContext : undefined,
        aiConfig,
      });

      if (!result.success) {
        const message = result.error || "Failed to generate steps";
        setError(message);
        toast.danger(message);
        return;
      }

      if (!result.steps || result.steps.length === 0) {
        const message = "The AI returned no steps. Try a different direction.";
        setError(message);
        toast.danger(message);
        return;
      }

      onGenerated(result.steps, resolvedStrategy);
      toast.success(
        `${result.steps.length} step${result.steps.length > 1 ? "s" : ""} generated (${
          resolvedStrategy === "append" ? "appended" : "replaced"
        })`,
      );
      setRequest("");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown generation error";
      setError(message);
      toast.danger(message);
    } finally {
      setGenerating(false);
    }
  }, [
    mode,
    resolvedStrategy,
    request,
    thoughtName,
    thoughtDescription,
    thoughtContent,
    hasExistingSteps,
    existingSteps,
    useDescriptionAsDirection,
    includeThoughtPrompt,
    includePattern,
    includeAssociation,
    getContexts,
    aiConfig,
    onGenerated,
  ]);

  return {
    mode,
    setMode,
    request,
    setRequest,
    strategy,
    setStrategy,
    useDescriptionAsDirection,
    setUseDescriptionAsDirection,
    includeThoughtPrompt,
    setIncludeThoughtPrompt,
    includePattern,
    setIncludePattern,
    includeAssociation,
    setIncludeAssociation,
    hasPattern,
    hasAssociation,
    generating,
    error,
    hasExistingSteps,
    resolvedStrategy,
    activeMode,
    generate,
    reset,
  };
}
