"use client";

// BKThoughtConfigPanel.Types.ts
//
// Shared types for the BKThoughtConfigPanel reusable component.
// This component is used by both BKThinkStudioAnon and BKThoughtDetailPage
// for the thought definition and train-of-thought steps editor.

// ─── Step type shared across consumers ─────────────────────────────────

export interface BKConfigPanelStep {
  id: string;
  name: string;
  thought: string;
  order: number;
  /** Optional craft format to apply per-step formatting (e.g. "markdown", "html") */
  craftFormat?: string;
}

// ─── Props ──────────────────────────────────────────────────────────────

export interface BKThoughtConfigPanelProps {
  // ── Thought fields ──────────────────────────────────────────────────
  thoughtName: string;
  onThoughtNameChange: (name: string) => void;
  thoughtDescription: string;
  onThoughtDescriptionChange: (desc: string) => void;
  thoughtContent: string;
  onThoughtContentChange: (content: string) => void;

  // ── Steps ───────────────────────────────────────────────────────────
  steps: BKConfigPanelStep[];
  onAddStep: () => void;
  onRemoveStep: (index: number) => void;
  onUpdateStep: (
    index: number,
    field: "name" | "thought" | "craftFormat",
    value: string,
  ) => void;

  // ── Optional extras ──────────────────────────────────────────────────

  /** Render extra actions per step (e.g. idea selector, move up/down) */
  renderStepActions?: (
    step: BKConfigPanelStep,
    index: number,
  ) => React.ReactNode;

  /**
   * Render extra actions in the "Train of Thoughts" header, beside the
   * "Add Step" button (e.g. a Generative AI step producer button).
   */
  renderStepsHeaderActions?: React.ReactNode;

  /** Render extra content below the entire steps section (e.g. save button) */
  renderStepsFooter?: React.ReactNode;

  /** When true, hides the Thought Definition section entirely.
   *  Useful when the parent already renders thought info (e.g. BKThoughtDetailPage). */
  hideThoughtDefinition?: boolean;
}
