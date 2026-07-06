// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — LCChatView.AttachedContext Sub-Component
// Renders the stash items area above the input, with remove buttons
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import { Layers, FileCode, X } from "lucide-react";
import type { LCContextStashItem } from "./LCInterface";

// ── Props ─────────────────────────────────────────────────────────────────────

export interface LCChatViewAttachedContextProps {
  /** Items currently stashed in context */
  stashItems: LCContextStashItem[];
  /** Called when user clicks the remove button on a stash item */
  onRemoveFromStash?: (id: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function LCChatViewAttachedContext({
  stashItems,
  onRemoveFromStash,
}: LCChatViewAttachedContextProps) {
  if (stashItems.length === 0) return null;

  return (
    <div className="px-4 pt-3 pb-2 border-b border-[#333333]/50">
      <div className="flex items-center gap-1.5 mb-2">
        <Layers className="w-3.5 h-3.5 text-[#e5c07b]" />
        <span className="text-[11px] text-[#858585] font-medium uppercase tracking-wide">
          Attached Context
        </span>
        <span className="text-[10px] text-[#858585] bg-[#3c3c3c] px-1.5 py-0.5 rounded-full">
          {stashItems.length}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {stashItems.map((item) => (
          <div
            key={item.id}
            className="group flex items-center gap-1.5 bg-[#2d2d2d] border border-[#444444] rounded-md px-2 py-1 text-[11px] text-[#abb2bf] hover:border-[#e5c07b]/40 hover:bg-[#2d2d2d] transition-colors"
          >
            {item.isDirectory ? (
              <Layers className="w-3 h-3 text-[#61afef] shrink-0" />
            ) : (
              <FileCode className="w-3 h-3 text-[#98c379] shrink-0" />
            )}
            <span className="truncate max-w-[140px]" title={item.path}>
              {item.name}
            </span>
            <span className="hidden group-hover:inline text-[10px] text-[#555] ml-0.5 truncate max-w-[100px]">
              {item.path.replace(/^.*[\\/]/, "") !== item.name &&
                `— ${item.path}`}
            </span>

            {/* Remove button for attached context item */}
            {onRemoveFromStash && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveFromStash(item.id);
                }}
                className="w-4 h-4 flex items-center justify-center rounded text-[#858585] hover:text-red-400 hover:bg-red-400/10 transition-colors ml-0.5 shrink-0"
                title="Remove from context"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
