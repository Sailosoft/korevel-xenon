/**
 * BFlowWorkflowStudio.LoadingFallback — Loading indicator shown while Monaco editor is being loaded.
 */

"use client";

import { Loader2 } from "lucide-react";

export function BFlowStudioLoadingFallback() {
  return (
    <div className="h-full flex items-center justify-center bg-default-50 rounded-xl">
      <Loader2 className="w-6 h-6 text-default-400 animate-spin" />
    </div>
  );
}
