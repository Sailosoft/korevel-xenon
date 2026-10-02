"use client";

// BDContextMenu — config-first right-click menu (BD light theme).
//
// Rendered at an absolute pixel position, clamped to the viewport, and closed
// on outside mousedown, Escape, or action activation.

import { useEffect, useRef } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@heroui/react";

export interface BDContextMenuAction {
  id: string;
  label: string;
  icon?: LucideIcon;
  shortcut?: string;
  /** Native tooltip, e.g. to explain why a disabled action is unavailable. */
  tooltip?: string;
  onClick?: () => void;
  /** Danger/delete actions get red styling. */
  danger?: boolean;
  disabled?: boolean;
}

export interface BDContextMenuProps {
  /** Pixel position where the menu should open. */
  x: number;
  y: number;
  actions: BDContextMenuAction[];
  onClose: () => void;
}

const MENU_WIDTH = 208;
const ITEM_HEIGHT = 32;
const MENU_PADDING = 6;

export function BDContextMenu({ x, y, actions, onClose }: BDContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Clamp to the viewport during render (the menu only mounts on interaction).
  const height = actions.length * ITEM_HEIGHT + MENU_PADDING * 2;
  const position =
    typeof window === "undefined"
      ? { x, y }
      : {
          x: Math.max(8, Math.min(x, window.innerWidth - MENU_WIDTH - 8)),
          y: Math.max(8, Math.min(y, window.innerHeight - height - 8)),
        };

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      role="menu"
      className="fixed z-[60] min-w-[200px] rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl"
      style={{ left: position.x, top: position.y }}
      onContextMenu={(event) => event.preventDefault()}
    >
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.id}
            type="button"
            role="menuitem"
            disabled={action.disabled}
            title={action.tooltip}
            className={cn(
              "flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm transition-colors",
              action.danger
                ? "text-red-600 hover:bg-red-50"
                : "text-slate-700 hover:bg-slate-100",
              action.disabled && "cursor-not-allowed opacity-40 hover:bg-transparent",
            )}
            onClick={(event) => {
              event.stopPropagation();
              if (action.disabled) return;
              action.onClick?.();
              onClose();
            }}
          >
            {Icon && <Icon className="h-4 w-4 shrink-0 opacity-70" />}
            <span className="flex-1 truncate">{action.label}</span>
            {action.shortcut && (
              <span className="text-[10px] text-slate-400">
                {action.shortcut}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default BDContextMenu;
