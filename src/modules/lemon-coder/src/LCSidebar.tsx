// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — LCSidebar Component (Left Icon Bar + File Tree)
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@heroui/react";
import {
  FolderTree,
  Search,
  Puzzle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import type { LCFileTreeItem, LCSidebarIconButton } from "./LCInterface";
import LCFileTree from "./LCFileTree";

const SIDEBAR_MIN_WIDTH = 180;
const SIDEBAR_MAX_WIDTH = 500;
const SIDEBAR_DEFAULT_WIDTH = 224;
const STORAGE_KEY = "lc_sidebar_width";

export interface LCSidebarProps {
  fileTreeItems: LCFileTreeItem[];
  selectedFile: LCFileTreeItem | null;
  isFileTreeLoading: boolean;
  onSelectFile: (item: LCFileTreeItem) => void;
  onToggleExpand: (item: LCFileTreeItem) => void;
  onAddToStash: (item: LCFileTreeItem) => void;
  onNewItem: (parentPath: string, type: "file" | "directory") => void;
  /** Strategy 3 — Explicit refresh of the file tree */
  onRefreshFileTree?: () => void;
}

export default function LCSidebar({
  fileTreeItems,
  selectedFile,
  isFileTreeLoading,
  onSelectFile,
  onToggleExpand,
  onAddToStash,
  onNewItem,
  onRefreshFileTree,
}: LCSidebarProps) {
  const [isFileTreeVisible, setIsFileTreeVisible] = useState(true);
  const [activeIcon, setActiveIcon] = useState<string>("files");

  // ── Resizable sidebar width ──────────────────────────────────────────────
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = parseInt(stored, 10);
          if (!isNaN(parsed)) {
            return Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, parsed));
          }
        }
      } catch {
        // localStorage unavailable — use default
      }
    }
    return SIDEBAR_DEFAULT_WIDTH;
  });

  const isResizingRef = useRef(false);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isResizingRef.current = true;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!isResizingRef.current) return;
        // The sidebar panel starts immediately after the icon bar (w-12 = 48px)
        // The mouse coordinate is relative to the viewport, so we subtract
        // the icon bar width to get the sidebar panel width.
        const newWidth = moveEvent.clientX - 48;
        const clamped = Math.max(
          SIDEBAR_MIN_WIDTH,
          Math.min(SIDEBAR_MAX_WIDTH, newWidth),
        );
        setSidebarWidth(clamped);
      };

      const handleMouseUp = () => {
        isResizingRef.current = false;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        // Persist
        try {
          localStorage.setItem(STORAGE_KEY, String(sidebarWidth));
        } catch {
          // ignore
        }
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [sidebarWidth],
  );

  // Cleanup if component unmounts during drag
  useEffect(() => {
    return () => {
      isResizingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, []);

  const iconButtons: LCSidebarIconButton[] = [
    {
      id: "files",
      icon: <FolderTree className="w-5 h-5" />,
      label: "Files",
      active: activeIcon === "files",
      onClick: () => {
        if (activeIcon === "files") {
          setIsFileTreeVisible(!isFileTreeVisible);
        } else {
          setActiveIcon("files");
          setIsFileTreeVisible(true);
        }
      },
    },
    {
      id: "search",
      icon: <Search className="w-5 h-5" />,
      label: "Search",
      active: activeIcon === "search",
      onClick: () => {
        setActiveIcon("search");
        setIsFileTreeVisible(false);
      },
    },
    {
      id: "extensions",
      icon: <Puzzle className="w-5 h-5" />,
      label: "Extensions",
      active: activeIcon === "extensions",
      onClick: () => {
        setActiveIcon("extensions");
        setIsFileTreeVisible(false);
      },
    },
  ];

  return (
    <div className="flex h-full">
      {/* Icon Bar */}
      <div className="w-12 bg-[#333333] flex flex-col items-center py-2 gap-2 shrink-0 border-r border-[#252526]">
        {iconButtons.map((btn) => (
          <button
            key={btn.id}
            onClick={btn.onClick}
            title={btn.label}
            className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors ${btn.active
                ? "bg-[#e5c07b]/20 text-[#e5c07b] border border-[#e5c07b]/30"
                : "text-[#858585] hover:text-white hover:bg-[#3c3c3c]"
              }`}
          >
            {btn.icon}
          </button>
        ))}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Collapse Toggle */}
        <button
          onClick={() => setIsFileTreeVisible(!isFileTreeVisible)}
          title={isFileTreeVisible ? "Collapse" : "Expand"}
          className="w-8 h-8 flex items-center justify-center rounded-md text-[#858585] hover:text-white hover:bg-[#3c3c3c]"
        >
          {isFileTreeVisible ? (
            <ChevronLeft className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* File Tree Panel (resizable) */}
      {isFileTreeVisible && (
        <div
          className="bg-[#252526] border-r border-[#333333] flex flex-col overflow-hidden relative"
          style={{ width: sidebarWidth }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 h-9 border-b border-[#333333] shrink-0">
            <span className="text-xs font-semibold text-[#cccccc] uppercase tracking-wider">
              {activeIcon === "files"
                ? "Files"
                : activeIcon === "search"
                  ? "Search"
                  : "Extensions"}
            </span>

            {/* Refresh Explorer button — Strategy 3: Explicit Refresh UI */}
            {activeIcon === "files" && onRefreshFileTree && (
              <button
                onClick={onRefreshFileTree}
                title="Refresh Explorer"
                className="w-6 h-6 flex items-center justify-center rounded text-[#858585] hover:text-white hover:bg-[#333333] transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {activeIcon === "files" && (
              <LCFileTree
                items={fileTreeItems}
                selectedFile={selectedFile}
                onSelectFile={onSelectFile}
                onToggleExpand={onToggleExpand}
                onAddToStash={onAddToStash}
                onNewItem={onNewItem}
                isLoading={isFileTreeLoading}
              />
            )}
            {activeIcon === "search" && (
              <div className="flex items-center justify-center h-full text-xs text-[#858585] px-4 text-center">
                Search functionality coming soon.
              </div>
            )}
            {activeIcon === "extensions" && (
              <div className="flex items-center justify-center h-full text-xs text-[#858585] px-4 text-center">
                Extensions coming soon.
              </div>
            )}
          </div>

          {/* Drag Handle */}
          <div
            className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-[#e5c07b]/70 active:bg-[#e5c07b] transition-colors z-10 group"
            onMouseDown={handleResizeStart}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-8 rounded-full bg-[#555] opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      )}
    </div>
  );
}
