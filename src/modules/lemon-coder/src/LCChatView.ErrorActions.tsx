// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — LCChatView.ErrorActions Sub-Component
// Error chip + "View Details" + "Retry" buttons for failed messages
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import { Button, Chip } from "@heroui/react";
import { AlertTriangle, Eye, RefreshCw } from "lucide-react";
import type { LCErrorInfo } from "./LCInterface";

// ── Props ─────────────────────────────────────────────────────────────────────

export interface LCChatViewErrorActionsProps {
  /** The error info to display */
  error: LCErrorInfo;
  /** Called when user clicks "View Details" — opens the error detail modal */
  onViewDetails: () => void;
  /** Called when user clicks "Retry" — retries the failed message */
  onRetryMessage?: (content: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function LCChatViewErrorActions({
  error,
  onViewDetails,
  onRetryMessage,
}: LCChatViewErrorActionsProps) {
  return (
    <div className="mt-2 pt-2 border-t border-[#e06c75]/20 flex items-center gap-2">
      <Chip
        size="sm"
        variant="soft"
        className="text-[10px] h-5 bg-[#e06c75]/10 text-[#e06c75]"
      >
        <AlertTriangle className="w-3 h-3 inline mr-0.5" />
        {error.name || "Error"}
      </Chip>
      <Button
        size="sm"
        variant="ghost"
        className="text-xs h-6 text-[#e06c75] hover:bg-[#e06c75]/10 border-0"
        onPress={onViewDetails}
      >
        <Eye className="w-3 h-3" />
        View Details
      </Button>
      {onRetryMessage && error.failedContent && (
        <Button
          size="sm"
          variant="ghost"
          className="text-xs h-6 text-[#e5c07b] hover:bg-[#e5c07b]/10 border-0"
          onPress={() => error.failedContent && onRetryMessage(error.failedContent)}
        >
          <RefreshCw className="w-3 h-3" />
          Retry
        </Button>
      )}
    </div>
  );
}
