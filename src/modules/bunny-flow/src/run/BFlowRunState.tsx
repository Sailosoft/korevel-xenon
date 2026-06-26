/**
 * BFlowRunState — Loading, error, and test-run state components for the pipeline run view.
 *
 * Provides consistent empty/loading/error states across the run workspace,
 * plus a test-run mode banner to visually distinguish in-memory test runs.
 */

import React from "react";
import { Loader2, XCircle, Beaker, RotateCcw } from "lucide-react";

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
 * Prominent test-run mode banner shown when test run results are being displayed.
 * Visually distinguishes in-memory (ephemeral) results from persisted pipeline runs.
 */
export function BFlowTestRunBanner({
  status,
  onClearTestRun,
}: {
  status?: string;
  onClearTestRun: () => void;
}) {
  return (
    <div className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 flex items-center gap-3">
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
