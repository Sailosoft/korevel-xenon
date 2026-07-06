// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — LCChatView.AIInfoBar Sub-Component
// Top bar with AI provider info, model label, and session title
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import { BrainCircuit, Layers, MessageSquare } from "lucide-react";

// ── Props ─────────────────────────────────────────────────────────────────────

export interface LCChatViewAIInfoBarProps {
  /** Label of the AI provider (e.g. "OpenAI", "Anthropic") */
  providerLabel: string;
  /** Label of the AI model (e.g. "gpt-4", "claude-3") */
  modelLabel: string;
  /** Current session title to display */
  sessionTitle?: string;
  /** Number of items in the context stash (shown when no sessionTitle) */
  stashCount: number;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function LCChatViewAIInfoBar({
  providerLabel,
  modelLabel,
  sessionTitle,
  stashCount,
}: LCChatViewAIInfoBarProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-1.5 bg-[#252526] border-b border-[#333333] shrink-0">
      <BrainCircuit className="w-3.5 h-3.5 text-[#e5c07b]" />
      <span className="text-[11px] text-[#858585]">
        AI: <span className="text-[#abb2bf] font-medium">{providerLabel}</span>
        {modelLabel !== "—" && (
          <>
            <span className="mx-1 text-[#555]">/</span>
            <span className="text-[#abb2bf]">{modelLabel}</span>
          </>
        )}
      </span>

      {/* Session Name Display */}
      {sessionTitle && (
        <span className="ml-auto flex items-center gap-1 text-[11px] text-[#61afef] bg-[#61afef]/10 px-2 py-0.5 rounded-full max-w-[200px] truncate">
          <MessageSquare className="w-3 h-3 shrink-0" />
          <span className="truncate">{sessionTitle}</span>
        </span>
      )}

      {!sessionTitle && stashCount > 0 && (
        <span className="ml-auto flex items-center gap-1 text-[11px] text-[#98c379] bg-[#98c379]/10 px-2 py-0.5 rounded-full">
          <Layers className="w-3 h-3" />
          {stashCount} file{stashCount !== 1 ? "s" : ""} in context
        </span>
      )}
    </div>
  );
}
