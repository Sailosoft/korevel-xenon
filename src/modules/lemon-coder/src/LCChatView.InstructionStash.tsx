// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — LCChatView.InstructionStash Sub-Component
// Renders the instruction items area above the input
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import { BookOpenText } from "lucide-react";
import type { LCInstructionStashItem } from "./LCInterface";

// ── Props ─────────────────────────────────────────────────────────────────────

export interface LCChatViewInstructionStashProps {
  /** Instruction items to display */
  instructionStashItems: LCInstructionStashItem[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function LCChatViewInstructionStash({
  instructionStashItems,
}: LCChatViewInstructionStashProps) {
  if (!instructionStashItems || instructionStashItems.length === 0) return null;

  return (
    <div className="px-4 pt-3 pb-2 border-b border-[#333333]/50">
      <div className="flex items-center gap-1.5 mb-2">
        <BookOpenText className="w-3.5 h-3.5 text-[#98c379]" />
        <span className="text-[11px] text-[#858585] font-medium uppercase tracking-wide">
          Instructions in System Prompt
        </span>
        <span className="text-[10px] text-[#858585] bg-[#3c3c3c] px-1.5 py-0.5 rounded-full">
          {instructionStashItems.length}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {instructionStashItems.map((inst) => (
          <div
            key={inst.id}
            className="group flex items-start gap-1.5 bg-[#2d2d2d] border border-[#444444] rounded-md px-2 py-1 text-[11px] text-[#abb2bf] hover:border-[#98c379]/40 hover:bg-[#2d2d2d] transition-colors max-w-full"
          >
            <BookOpenText className="w-3 h-3 text-[#98c379] shrink-0 mt-0.5" />
            <div className="flex flex-col min-w-0">
              <span className="truncate font-medium text-[#d4d4d4]">
                {inst.name}
              </span>
              <span className="text-[10px] text-[#858585] line-clamp-2 leading-relaxed">
                {inst.content}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
