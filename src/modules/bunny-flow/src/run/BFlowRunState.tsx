/**
 * BFlowRunState — Loading, error, and test-run state components for the pipeline run view.
 *
 * Provides consistent empty/loading/error states across the run workspace,
 * plus a test-run mode banner to visually distinguish in-memory test runs.
 */

"use client";

import React from "react";
import { Download, Loader2, XCircle, Beaker, RotateCcw } from "lucide-react";
import { Dropdown, Label } from "@heroui/react";

/**
 * Full-height centered spinner for loading states.
 */
export function BFlowLoadingState() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-default-400 animate-spin" />
    </div>
  );
}

/**
 * Error state with a descriptive message.
 */
export function BFlowErrorState({ message }: { message: string }) {
  return (
    <div className="bg-danger-50 rounded-2xl border border-danger-200 p-8 text-center">
      <XCircle className="w-12 h-12 text-danger mx-auto mb-4" />
      <h2 className="text-lg font-bold text-danger-700 mb-2">
        Failed to Load Pipeline
      </h2>
      <p className="text-sm text-danger-500">{message}</p>
    </div>
  );
}

/**
 * A single export action shown inside the test-run banner's "Export" dropdown.
 * Keeps the banner presentational — callers wire the actual export logic.
 */
export interface BFlowTestRunExportAction {
  /** Unique key for the dropdown item. */
  key: string;
  /** Human-readable label for the dropdown item. */
  label: string;
  /** Optional icon rendered before the label. */
  icon?: React.ReactNode;
  /** Called when the dropdown item is selected. */
  onPress: () => void;
  /** Whether the action is disabled (e.g. no run results yet). */
  isDisabled?: boolean;
}

/**
 * Prominent test-run mode banner shown when test run results are being displayed.
 * Visually distinguishes in-memory (ephemeral) results from persisted pipeline runs.
 * When `exportActions` is provided, an "Export" dropdown is rendered so the user
 * can preview / download the run results (HTML, markdown, plain text, etc.).
 */
export function BFlowTestRunBanner({
  status,
  onClearTestRun,
  exportActions,
}: {
  status?: string;
  onClearTestRun: () => void;
  exportActions?: BFlowTestRunExportAction[];
}) {
  return (
    <div className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap">
      <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
        <Beaker className="w-4 h-4 text-violet-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-violet-800">Test Run Mode</p>
        <p className="text-xs text-violet-500">
          Results are ephemeral — stored in browser memory only.
          {status === "succeeded"
            ? " All steps completed."
            : status === "failed"
              ? " Some steps failed."
              : status === "running"
                ? " Execution in progress..."
                : ""}
        </p>
      </div>

      {/* Export options dropdown (e.g. markdown / html / plain) */}
      {exportActions && exportActions.length > 0 && (
        <Dropdown>
          <Dropdown.Trigger>
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-100 hover:bg-violet-200 transition-colors text-xs font-medium text-violet-700"
              title="Export test run results"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
          </Dropdown.Trigger>
          <Dropdown.Popover>
            <Dropdown.Menu aria-label="Test run export options">
              {exportActions.map((action) => (
                <Dropdown.Item
                  key={action.key}
                  onPress={action.onPress}
                  isDisabled={action.isDisabled}
                >
                  {action.icon}
                  <Label>{action.label}</Label>
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      )}

      <button
        onClick={onClearTestRun}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-100 hover:bg-violet-200 transition-colors text-xs font-medium text-violet-700"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        Clear Results
      </button>
    </div>
  );
}
