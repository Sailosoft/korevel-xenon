// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — LCChatView.TypingIndicator Sub-Component
// "Thinking..." animated indicator while AI is processing, with running elapsed
// seconds counter.
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

// ── Props ─────────────────────────────────────────────────────────────────────

export interface LCChatViewTypingIndicatorProps {
  /** Timestamp (ms since epoch) when the AI started processing */
  thinkingStartTime: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Format elapsed milliseconds as a compact string like "3.2s" or "12.0s".
 */
function formatElapsed(ms: number): string {
  const seconds = ms / 1000;
  return `${seconds.toFixed(1)}s`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function LCChatViewTypingIndicator({
  thinkingStartTime,
}: LCChatViewTypingIndicatorProps) {
  const [elapsed, setElapsed] = useState(() =>
    formatElapsed(Date.now() - thinkingStartTime),
  );

  useEffect(() => {
    // Update every 100ms for smooth tenths-of-second display
    const interval = setInterval(() => {
      setElapsed(formatElapsed(Date.now() - thinkingStartTime));
    }, 100);
    return () => clearInterval(interval);
  }, [thinkingStartTime]);

  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-[#2d2d2d] flex items-center justify-center shrink-0">
        <Loader2 className="w-4 h-4 text-[#e5c07b] animate-spin" />
      </div>
      <div className="bg-[#2d2d2d] rounded-lg px-3 py-2 border border-[#333333]">
        <p className="text-sm text-[#858585]">
          Thinking...{" "}
          <span className="text-[#e5c07b] font-mono">{elapsed}</span>
        </p>
      </div>
    </div>
  );
}
