// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — LCContextMenu Component
// Right-click context menu for file tree items with submenu support
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import { useEffect, useRef, useCallback, useState } from "react";

export interface LCContextMenuAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  onClick?: () => void;
  /** Danger/delete actions get red styling */
  danger?: boolean;
  /** Nested submenu actions — when provided, the item shows a submenu indicator */
  children?: LCContextMenuAction[];
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

// ── Submenu Component ─────────────────────────────────────────────────────────

function LCSubMenu({
  actions,
  menuRect,
  itemIndex,
}: {
  actions: LCContextMenuAction[];
  menuRect: DOMRect | null;
  itemIndex: number;
}) {
  const subRef = useRef<HTMLDivElement>(null);
  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  const vh = typeof window !== "undefined" ? window.innerHeight : 768;

  // Compute position synchronously to avoid flashing at {0,0}
  const position = (() => {
    if (!menuRect) return { x: 0, y: 0 };
    const subWidth = 180;
    const subHeight = actions.length * 29 + 8;
    // Main menu has py-1 (4px padding top). Each item row:
    //   button: py-1.5 (12px) + text-xs (16px line-height) = ~28px
    //   separator (idx>0): border-t 1px
    // Total per item after idx 0: 28px button + 1px separator = 29px
    const menuPadding = 4;
    const itemHeight = 29;
    const itemOffsetY = menuRect.top + menuPadding + itemIndex * itemHeight;

    let xPos = menuRect.right;
    if (xPos + subWidth > vw) {
      xPos = menuRect.left - subWidth;
    }

    let yPos = itemOffsetY;
    if (yPos + subHeight > vh) {
      yPos = vh - subHeight - 4;
    }

    return { x: xPos, y: yPos };
  })();

  return (
    <div
      ref={subRef}
      className="fixed z-[110] min-w-[160px] bg-[#2d2d2d] border border-[#444444] rounded-md shadow-xl py-1"
      style={{ left: position.x, top: position.y }}
    >
      {actions.map((subAction, subIdx) => (
        <div key={subAction.id}>
          {subIdx > 0 && (
            <div className="mx-2 border-t border-[#444444]/50" />
          )}
          <button
            className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors select-none ${
              subAction.danger
                ? "text-[#e06c75] hover:bg-[#e06c75]/10"
                : "text-[#d4d4d4] hover:bg-[#3c3c3c]"
            }`}
            onClick={(e) => {
              e.stopPropagation();
              subAction.onClick?.();
              // Close all parent menus — propagate via event
              const closeEvent = new CustomEvent("close-all-menus");
              document.dispatchEvent(closeEvent);
            }}
          >
            {subAction.icon && (
              <span className="w-4 h-4 flex items-center justify-center shrink-0">
                {subAction.icon}
              </span>
            )}
            <span className="flex-1">{subAction.label}</span>
            {subAction.shortcut && (
              <span className="text-[10px] text-[#858585]">{subAction.shortcut}</span>
            )}
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Main Context Menu ─────────────────────────────────────────────────────────

export default function LCContextMenu({
  x,
  y,
  actions,
  onClose,
}: LCContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const submenuTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [openSubmenuId, setOpenSubmenuId] = useState<string | null>(null);

  const clearSubmenuTimeout = useCallback(() => {
    if (submenuTimeoutRef.current) {
      clearTimeout(submenuTimeoutRef.current);
      submenuTimeoutRef.current = null;
    }
  }, []);

  const startSubmenuCloseDelay = useCallback(() => {
    clearSubmenuTimeout();
    submenuTimeoutRef.current = setTimeout(() => {
      setOpenSubmenuId(null);
    }, 300);
  }, [clearSubmenuTimeout]);

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
        if (openSubmenuId) {
          setOpenSubmenuId(null);
        } else {
          onClose();
        }
      }
    },
    [onClose, openSubmenuId],
  );

  // Listen for close-all-menus custom event (fired by submenu items)
  useEffect(() => {
    const handler = () => onClose();
    document.addEventListener("close-all-menus", handler);
    return () => document.removeEventListener("close-all-menus", handler);
  }, [onClose]);

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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (submenuTimeoutRef.current) {
        clearTimeout(submenuTimeoutRef.current);
      }
    };
  }, []);

  // Adjust position to stay within viewport
  const adjustedX = Math.min(x, window.innerWidth - 200);
  const adjustedY = Math.min(y, window.innerHeight - actions.length * 32 - 16);

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] min-w-[180px] bg-[#2d2d2d] border border-[#444444] rounded-md shadow-xl py-1"
      style={{ left: adjustedX, top: adjustedY }}
      onMouseLeave={startSubmenuCloseDelay}
    >
      {actions.map((action, idx) => {
        const hasSubmenu = action.children && action.children.length > 0;
        return (
          <div key={action.id}>
            {idx > 0 && (
              <div className="mx-2 border-t border-[#444444]/50" />
            )}
            <button
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors select-none ${
                action.danger
                  ? "text-[#e06c75] hover:bg-[#e06c75]/10"
                  : "text-[#d4d4d4] hover:bg-[#3c3c3c]"
              } ${openSubmenuId === action.id ? "bg-[#3c3c3c]" : ""}`}
              onMouseEnter={() => {
                clearSubmenuTimeout();
                if (hasSubmenu) {
                  setOpenSubmenuId(action.id);
                } else {
                  // Moving to a non-submenu item — close any open submenu
                  setOpenSubmenuId(null);
                }
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (!hasSubmenu) {
                  action.onClick?.();
                  onClose();
                }
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
              {hasSubmenu && (
                <span className="text-[10px] text-[#858585] ml-1">▸</span>
              )}
            </button>

            {/* Submenu */}
            {hasSubmenu && openSubmenuId === action.id && (
              <div
                data-submenu-id={action.id}
                onMouseEnter={clearSubmenuTimeout}
                onMouseLeave={startSubmenuCloseDelay}
              >
                <LCSubMenu
                  actions={action.children!}
                  menuRect={menuRef.current?.getBoundingClientRect() ?? null}
                  itemIndex={idx}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
