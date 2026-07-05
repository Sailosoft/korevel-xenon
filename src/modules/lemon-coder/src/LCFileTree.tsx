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
  Folder,
  FolderOpen,
  Plus,
} from "lucide-react";
import type { LCFileTreeItem } from "./LCInterface";

export interface LCFileTreeProps {
  items: LCFileTreeItem[];
  selectedFile: LCFileTreeItem | null;
  onSelectFile: (item: LCFileTreeItem) => void;
  onToggleExpand: (item: LCFileTreeItem) => void;
  onAddToStash: (item: LCFileTreeItem) => void;
  onNewItem: (parentPath: string, type: "file" | "directory") => void;
  isLoading: boolean;
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
    // If tooltip would overflow right edge, flip to left of cursor
    const overflowX = mouseX + 16 + rect.width > vw;
    // If tooltip would overflow bottom edge, flip above cursor
    const overflowY = mouseY + 16 + rect.height > vh;
    setOffset({
      x: overflowX ? -rect.width - 12 : 12,
      y: overflowY ? -rect.height - 8 : 12,
    });
  }, [mouseX, mouseY]);

  // Break the path into directory and filename parts
  const lastSlashIdx = item.path.lastIndexOf("/");
  const dirPart = lastSlashIdx >= 0 ? item.path.slice(0, lastSlashIdx) : "";
  const filePart = lastSlashIdx >= 0 ? item.path.slice(lastSlashIdx + 1) : item.path;

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
        {/* Header: icon + filename */}
        <div className="flex items-center gap-2 mb-1.5">
          {item.isDirectory ? (
            <Folder className="w-3.5 h-3.5 text-[#e5c07b] shrink-0" />
          ) : (
            <File className="w-3.5 h-3.5 text-[#abb2bf] shrink-0" />
          )}
          <span className="text-xs font-medium text-[#d4d4d4] break-all">
            {item.name}
          </span>
        </div>

        {/* Full path */}
        {dirPart && (
          <div className="text-[10px] text-[#858585] leading-relaxed">
            <span className="text-[#666]">Path: </span>
            <span className="break-all">{dirPart}/</span>
            <span className="text-[#98c379]">{filePart}</span>
          </div>
        )}

        {/* Hint */}
        <div className="mt-1.5 pt-1.5 border-t border-[#444444]/50 text-[10px] text-[#555]">
          {item.isDirectory ? (
            <>Click to {isExpanded(item) ? "collapse" : "expand"}</>
          ) : (
            <>Click to open</>
          )}
        </div>
      </div>
    </div>
  );
}

/** Helper — checks expanded state via a recursive climb; used inside tooltip render */
function isExpanded(item: LCFileTreeItem): boolean {
  return item.expanded ?? false;
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
}) {
  const isSelected = selectedFile?.id === item.id;
  const itemExpanded = item.expanded ?? false;
  const rowRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent) => {
      // Use the row element for position, but pass the actual mouse coords
      const rect = rowRef.current?.getBoundingClientRect();
      if (rect) {
        onHover(item, e.clientX, e.clientY);
      }
    },
    [item, onHover],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      // Update position on mousemove so tooltip follows cursor
      if (hoveredItem?.item.id === item.id) {
        onHover(item, e.clientX, e.clientY);
      }
    },
    [item, hoveredItem?.item.id, onHover],
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
        onClick={() => {
          if (item.isDirectory) {
            onToggleExpand(item);
          } else {
            onSelectFile(item);
          }
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

        {/* File/Folder Icon */}
        <span className="w-4 h-4 flex items-center justify-center shrink-0">
          {item.isDirectory ? (
            itemExpanded ? (
              <FolderOpen className="w-4 h-4 text-[#e5c07b]" />
            ) : (
              <Folder className="w-4 h-4 text-[#e5c07b]" />
            )
          ) : (
            <File className="w-4 h-4 text-[#abb2bf]" />
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
}: LCFileTreeProps) {
  const [hoveredItem, setHoveredItem] = useState<{
    item: LCFileTreeItem;
    x: number;
    y: number;
  } | null>(null);

  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleHover = useCallback(
    (item: LCFileTreeItem, x: number, y: number) => {
      // Clear any pending hide timeout
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
      setHoveredItem({ item, x, y });
    },
    [],
  );

  const handleUnhover = useCallback(() => {
    // Small delay so moving between child items doesn't flicker
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredItem(null);
    }, 80);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

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
    <div className="overflow-auto h-full relative">
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
        />
      ))}

      {/* Tooltip overlay */}
      {hoveredItem && (
        <FileTreeTooltip
          item={hoveredItem.item}
          mouseX={hoveredItem.x}
          mouseY={hoveredItem.y}
        />
      )}
    </div>
  );
}

