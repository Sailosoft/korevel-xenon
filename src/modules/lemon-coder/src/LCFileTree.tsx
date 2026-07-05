// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — LCFileTree Component
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@heroui/react";
import {
  ChevronRight,
  ChevronDown,
  File,
  FileText,
  Folder,
  FolderOpen,
  Plus,
  Code2,
  Terminal,
  Globe,
  Braces,
  FileJson,
  FileType,
  Info,
} from "lucide-react";
import type { LCFileTreeItem } from "./LCInterface";
import LCContextMenu from "./LCContextMenu";
import {
  useLCFileTreeContextMenu,
  LCDeleteConfirmModal,
} from "./LCFileTree.ContextMenu";

/** Map file extensions to distinct icons and colors */
function getFileIcon(name: string, isDirectory: boolean): { icon: React.ReactNode; color: string } {
  if (isDirectory) {
    return { icon: <Folder className="w-4 h-4" />, color: "#e5c07b" };
  }

  const ext = name.split(".").pop()?.toLowerCase() || "";
  const iconMap: Record<string, { icon: React.ReactNode; color: string }> = {
    md: { icon: <FileText className="w-4 h-4" />, color: "#42a5f5" },
    ts: { icon: <FileType className="w-4 h-4" />, color: "#3178c6" },
    tsx: { icon: <Code2 className="w-4 h-4" />, color: "#3178c6" },
    js: { icon: <FileType className="w-4 h-4" />, color: "#f7df1e" },
    jsx: { icon: <Code2 className="w-4 h-4" />, color: "#f7df1e" },
    json: { icon: <Braces className="w-4 h-4" />, color: "#89e051" },
    html: { icon: <Globe className="w-4 h-4" />, color: "#e44d26" },
    css: { icon: <FileJson className="w-4 h-4" />, color: "#42a5f5" },
    scss: { icon: <FileJson className="w-4 h-4" />, color: "#cc6699" },
    py: { icon: <Terminal className="w-4 h-4" />, color: "#3776ab" },
    rs: { icon: <Terminal className="w-4 h-4" />, color: "#dea584" },
    go: { icon: <Terminal className="w-4 h-4" />, color: "#00add8" },
  };
  return iconMap[ext] || { icon: <File className="w-4 h-4" />, color: "#abb2bf" };
}

export interface LCFileTreeProps {
  items: LCFileTreeItem[];
  selectedFile: LCFileTreeItem | null;
  onSelectFile: (item: LCFileTreeItem) => void;
  onToggleExpand: (item: LCFileTreeItem) => void;
  onAddToStash: (item: LCFileTreeItem) => void;
  onNewItem: (parentPath: string, type: "file" | "directory") => void;
  isLoading: boolean;
  /** Whether to show the floating tooltip on hover */
  showTooltip?: boolean;
  /** Callback to toggle tooltip display */
  onToggleTooltip?: () => void;
  /** Rename a file/folder by path */
  onRenameItem?: (itemPath: string, newName: string) => Promise<void>;
  /** Delete a file/folder by path */
  onDeleteItem?: (itemPath: string, isDirectory: boolean) => Promise<void>;
  /** Create a new item by copying an existing one */
  onCopyItem?: (sourcePath: string, destParentPath: string, newName: string) => Promise<void>;
}

// ── Hover Tooltip ────────────────────────────────────────────────────────────

function FileTreeTooltip({
  item,
  mouseX,
  mouseY,
}: {
  item: LCFileTreeItem;
  mouseX: number;
  mouseY: number;
}) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!tooltipRef.current) return;
    const rect = tooltipRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const overflowX = mouseX + 16 + rect.width > vw;
    const overflowY = mouseY + 16 + rect.height > vh;
    setOffset({
      x: overflowX ? -rect.width - 12 : 12,
      y: overflowY ? -rect.height - 8 : 12,
    });
  }, [mouseX, mouseY]);

  const lastSlashIdx = item.path.lastIndexOf("/");
  const dirPart = lastSlashIdx >= 0 ? item.path.slice(0, lastSlashIdx) : "";
  const filePart = lastSlashIdx >= 0 ? item.path.slice(lastSlashIdx + 1) : item.path;

  const fileIcon = getFileIcon(item.name, item.isDirectory);

  return (
    <div
      ref={tooltipRef}
      className="fixed z-50 pointer-events-none"
      style={{
        left: mouseX + offset.x,
        top: mouseY + offset.y,
      }}
    >
      <div className="bg-[#2d2d2d] border border-[#444444] rounded-md shadow-xl px-3 py-2 min-w-[160px] max-w-[320px]">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="shrink-0" style={{ color: fileIcon.color }}>
            {fileIcon.icon}
          </span>
          <span className="text-xs font-medium text-[#d4d4d4] break-all">
            {item.name}
          </span>
        </div>

        {dirPart && (
          <div className="text-[10px] text-[#858585] leading-relaxed">
            <span className="text-[#666]">Path: </span>
            <span className="break-all">{dirPart}/</span>
            <span className="text-[#98c379]">{filePart}</span>
          </div>
        )}

        <div className="mt-1.5 pt-1.5 border-t border-[#444444]/50 text-[10px] text-[#555]">
          {item.isDirectory ? (
            <>Click to {item.expanded ? "collapse" : "expand"}</>
          ) : (
            <>Click to open</>
          )}
        </div>
      </div>
    </div>
  );
}

// ── File Tree Item ───────────────────────────────────────────────────────────

function FileTreeItem({
  item,
  depth = 0,
  selectedFile,
  onSelectFile,
  onToggleExpand,
  onAddToStash,
  onNewItem,
  hoveredItem,
  onHover,
  onUnhover,
  showTooltip,
  onContextMenu,
}: {
  item: LCFileTreeItem;
  depth?: number;
  selectedFile: LCFileTreeItem | null;
  onSelectFile: (item: LCFileTreeItem) => void;
  onToggleExpand: (item: LCFileTreeItem) => void;
  onAddToStash: (item: LCFileTreeItem) => void;
  onNewItem: (parentPath: string, type: "file" | "directory") => void;
  hoveredItem: { item: LCFileTreeItem; x: number; y: number } | null;
  onHover: (item: LCFileTreeItem, x: number, y: number) => void;
  onUnhover: () => void;
  showTooltip?: boolean;
  onContextMenu?: (e: React.MouseEvent, item: LCFileTreeItem) => void;
}) {
  const isSelected = selectedFile?.id === item.id;
  const itemExpanded = item.expanded ?? false;
  const rowRef = useRef<HTMLDivElement>(null);
  const fileIcon = getFileIcon(item.name, item.isDirectory);

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent) => {
      if (!showTooltip) return;
      const rect = rowRef.current?.getBoundingClientRect();
      if (rect) {
        onHover(item, e.clientX, e.clientY);
      }
    },
    [item, onHover, showTooltip],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!showTooltip) return;
      if (hoveredItem?.item.id === item.id) {
        onHover(item, e.clientX, e.clientY);
      }
    },
    [item, hoveredItem?.item.id, onHover, showTooltip],
  );

  const handleMouseLeave = useCallback(() => {
    onUnhover();
  }, [onUnhover]);

  return (
    <div ref={rowRef}>
      <div
        className={`flex items-center gap-1 py-0.5 pr-2 cursor-pointer group hover:bg-[#2a2d2e] transition-colors select-none ${
          isSelected ? "bg-[#37373d]" : ""
        }`}
        style={{ paddingLeft: `${depth * 16 + 4}px` }}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        title={!showTooltip ? `${item.name}\n${item.path}` : undefined}
        onClick={() => {
          if (item.isDirectory) {
            onToggleExpand(item);
          } else {
            onSelectFile(item);
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onContextMenu?.(e, item);
        }}
      >
        {/* Expand/Collapse for directories */}
        {item.isDirectory ? (
          <span className="w-4 h-4 flex items-center justify-center text-[#858585] shrink-0">
            {itemExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </span>
        ) : (
          <span className="w-4 h-4" />
        )}

        {/* File/Folder Icon with per-filetype icons */}
        <span className="w-4 h-4 flex items-center justify-center shrink-0" style={{ color: fileIcon.color }}>
          {item.isDirectory && itemExpanded ? (
            <FolderOpen className="w-4 h-4" style={{ color: "#e5c07b" }} />
          ) : (
            fileIcon.icon
          )}
        </span>

        {/* File Name */}
        <span
          className={`text-xs truncate flex-1 ${
            isSelected
              ? "text-white"
              : item.isDirectory
                ? "text-[#d4d4d4]"
                : "text-[#abb2bf]"
          }`}
        >
          {item.name}
        </span>

        {/* Actions (Stash / New File / New Folder) */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {item.isDirectory && (
            <>
              <Button
                isIconOnly
                size="sm"
                variant="ghost"
                className="w-5 h-5 min-w-0 text-[#858585] hover:text-[#e5c07b]"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  onNewItem(item.path, "file");
                }}
              >
                <File className="w-3 h-3" />
              </Button>
              <Button
                isIconOnly
                size="sm"
                variant="ghost"
                className="w-5 h-5 min-w-0 text-[#858585] hover:text-[#e5c07b]"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  onNewItem(item.path, "directory");
                }}
              >
                <Folder className="w-3 h-3" />
              </Button>
            </>
          )}
          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            className="w-5 h-5 min-w-0 text-[#858585] hover:text-[#e5c07b]"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onAddToStash(item);
            }}
          >
            <Plus className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Children (if directory and expanded) */}
      {item.isDirectory && itemExpanded && item.children && (
        <div>
          {item.children.map((child) => (
            <FileTreeItem
              key={child.id}
              item={child}
              depth={depth + 1}
              selectedFile={selectedFile}
              onSelectFile={onSelectFile}
              onToggleExpand={onToggleExpand}
              onAddToStash={onAddToStash}
              onNewItem={onNewItem}
              hoveredItem={hoveredItem}
              onHover={onHover}
              onUnhover={onUnhover}
              showTooltip={showTooltip}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Export ──────────────────────────────────────────────────────────────

export default function LCFileTree({
  items,
  selectedFile,
  onSelectFile,
  onToggleExpand,
  onAddToStash,
  onNewItem,
  isLoading,
  showTooltip = true,
  onToggleTooltip,
  onRenameItem,
  onDeleteItem,
  onCopyItem,
}: LCFileTreeProps) {
  const [hoveredItem, setHoveredItem] = useState<{
    item: LCFileTreeItem;
    x: number;
    y: number;
  } | null>(null);

  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ctx = useLCFileTreeContextMenu(onRenameItem, onDeleteItem, onAddToStash, onCopyItem);

  const handleHover = useCallback(
    (item: LCFileTreeItem, x: number, y: number) => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
      setHoveredItem({ item, x, y });
    },
    [],
  );

  const handleUnhover = useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredItem(null);
    }, 80);
  }, []);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Focus rename input when it appears
  useEffect(() => {
    if (ctx.renameTarget) {
      // The rename input ref is inside the modal, so we need to find it
      // Use a timeout to wait for the DOM to render
      const timer = setTimeout(() => {
        const input = document.querySelector<HTMLInputElement>('[data-rename-input="true"]');
        input?.focus();
        input?.select();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [ctx.renameTarget]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-[#858585]">
        Loading...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-[#858585] px-4 text-center">
        No files. Open a project to see files here.
      </div>
    );
  }

  return (
    <div className="h-full relative">
      {items.map((item) => (
        <FileTreeItem
          key={item.id}
          item={item}
          selectedFile={selectedFile}
          onSelectFile={onSelectFile}
          onToggleExpand={onToggleExpand}
          onAddToStash={onAddToStash}
          onNewItem={onNewItem}
          hoveredItem={hoveredItem}
          onHover={handleHover}
          onUnhover={handleUnhover}
          showTooltip={showTooltip}
          onContextMenu={ctx.handleContextMenu}
        />
      ))}

      {/* Inline Rename Input */}
      {ctx.renameTarget && (
        <div
          className="absolute inset-0 z-50 flex items-start pt-0.5 bg-[#252526]/80"
          style={{ paddingLeft: "8px" }}
          onClick={() => ctx.setRenameTarget(null)}
        >
          <input
            data-rename-input="true"
            value={ctx.renameValue}
            onChange={(e) => ctx.setRenameValue(e.target.value)}
            onKeyDown={ctx.handleRenameKeyDown}
            onBlur={ctx.handleRenameConfirm}
            className="w-full bg-[#3c3c3c] text-sm text-[#d4d4d4] border border-[#e5c07b] rounded px-2 py-1 outline-none mx-1"
            placeholder="New name..."
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Context Menu */}
      {ctx.contextMenu && (
        <LCContextMenu
          x={ctx.contextMenu.x}
          y={ctx.contextMenu.y}
          actions={ctx.buildContextMenuActions(ctx.contextMenu.item)}
          onClose={ctx.handleCloseContextMenu}
        />
      )}

      {/* Tooltip overlay (only when enabled) */}
      {showTooltip && hoveredItem && (
        <FileTreeTooltip
          item={hoveredItem.item}
          mouseX={hoveredItem.x}
          mouseY={hoveredItem.y}
        />
      )}

      {/* Delete Confirmation Modal */}
      <LCDeleteConfirmModal
        deleteConfirmTarget={ctx.deleteConfirmTarget}
        onConfirm={ctx.handleDeleteConfirm}
        onCancel={ctx.handleDeleteCancel}
        onClose={ctx.handleDeleteCancel}
      />
    </div>
  );
}
