"use client";

// BKStepActions.tsx
//
// Reusable step action buttons for the Train of Thoughts editor.
// Provides move up/down, add step before/after, and a slot for
// extra actions (e.g. idea selector).
//
// Used by:
// - BKThoughtDetailPage (via BKThoughtConfigPanel.renderStepActions)
// - BKThinkStudioAnon   (via BKThoughtConfigPanel.renderStepActions)

import React from "react";
import { Button } from "@heroui/react";
import { Plus } from "lucide-react";

// ─── Props ───────────────────────────────────────────────────────────────

export interface BKStepActionsProps {
  /** Current step index within the list */
  stepIndex: number;
  /** Total number of steps */
  totalSteps: number;
  /** Called to move a step up by one position */
  onMoveUp: (index: number) => void;
  /** Called to move a step down by one position */
  onMoveDown: (index: number) => void;
  /** Called to insert a new step before the current one */
  onAddBefore: (index: number) => void;
  /** Called to insert a new step after the current one */
  onAddAfter: (index: number) => void;
  /** Optional extra action buttons rendered to the right (e.g. idea selector) */
  children?: React.ReactNode;
}

// ─── Component ───────────────────────────────────────────────────────────

export default function BKStepActions({
  stepIndex,
  totalSteps,
  onMoveUp,
  onMoveDown,
  onAddBefore,
  onAddAfter,
  children,
}: BKStepActionsProps) {
  return (
    <>
      {/* ── Add step before ─────────────────────────────────────────── */}
      <Button
        variant="ghost"
        size="sm"
        isIconOnly
        onPress={() => onAddBefore(stepIndex)}
        className="p-1 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
        aria-label={`Add step before step ${stepIndex + 1}`}
      >
        <Plus size={12} />
        <span className="text-[10px] font-bold leading-none">↑</span>
      </Button>

      {/* ── Move up ─────────────────────────────────────────────────── */}
      <Button
        variant="ghost"
        size="sm"
        isIconOnly
        isDisabled={stepIndex === 0}
        onPress={() => onMoveUp(stepIndex)}
        className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
        aria-label={`Move step ${stepIndex + 1} up`}
      >
        ↑
      </Button>

      {/* ── Move down ───────────────────────────────────────────────── */}
      <Button
        variant="ghost"
        size="sm"
        isIconOnly
        isDisabled={stepIndex >= totalSteps - 1}
        onPress={() => onMoveDown(stepIndex)}
        className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
        aria-label={`Move step ${stepIndex + 1} down`}
      >
        ↓
      </Button>

      {/* ── Add step after ──────────────────────────────────────────── */}
      <Button
        variant="ghost"
        size="sm"
        isIconOnly
        onPress={() => onAddAfter(stepIndex)}
        className="p-1 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
        aria-label={`Add step after step ${stepIndex + 1}`}
      >
        <Plus size={12} />
        <span className="text-[10px] font-bold leading-none">↓</span>
      </Button>

      {/* ── Extra actions (idea selector, etc.) ─────────────────────── */}
      {children}
    </>
  );
}
