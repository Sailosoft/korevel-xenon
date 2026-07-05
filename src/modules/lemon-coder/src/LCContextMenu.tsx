// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — LCContextMenu Component
// Right-click context menu for file tree items
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import { useEffect, useRef, useCallback } from "react";

export interface LCContextMenuAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  onClick: () => void;
  /** Danger/delete actions get red styling */
  danger?: boolean;
}

export interface LCContextMenuProps {
  /** Pixel position of the menu */
  x: number;
  y: number;
  /** List of actions */
  actions: LCContextMenuAction[];
  /** Close the menu */
  onClose: () => void;
}

export default function LCContextMenu({
  x,
  y,
  actions,
  onClose,
}: LCContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    },
    [onClose],
  );

  // Close on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    // Delay adding listener so the right-click event doesn't immediately close it
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleClickOutside, handleKeyDown]);

  // Adjust position to stay within viewport
  const adjustedX = Math.min(x, window.innerWidth - 180);
  const adjustedY = Math.min(y, window.innerHeight - actions.length * 32 - 16);

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] min-w-[160px] bg-[#2d2d2d] border border-[#444444] rounded-md shadow-xl py-1"
      style={{ left: adjustedX, top: adjustedY }}
    >
      {actions.map((action, idx) => (
        <div key={action.id}>
          {idx > 0 && (
            <div className="mx-2 border-t border-[#444444]/50" />
          )}
          <button
            className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors select-none ${
              action.danger
                ? "text-[#e06c75] hover:bg-[#e06c75]/10"
                : "text-[#d4d4d4] hover:bg-[#3c3c3c]"
            }`}
            onClick={(e) => {
              e.stopPropagation();
              action.onClick();
              onClose();
            }}
          >
            {action.icon && (
              <span className="w-4 h-4 flex items-center justify-center shrink-0">
                {action.icon}
              </span>
            )}
            <span className="flex-1">{action.label}</span>
            {action.shortcut && (
              <span className="text-[10px] text-[#858585]">{action.shortcut}</span>
            )}
          </button>
        </div>
      ))}
    </div>
  );
}
