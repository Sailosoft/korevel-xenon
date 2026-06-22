/**
 * BFlowRunState — Loading and error state components for the pipeline run view.
 *
 * Provides consistent empty/loading/error states across the run workspace.
 */

import React from "react";
import { Loader2, XCircle } from "lucide-react";

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
