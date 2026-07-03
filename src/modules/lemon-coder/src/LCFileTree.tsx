// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — LCFileTree Component
// ───────────────────────────────────────────────────────────────────────────────

"use client";

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
  isLoading: boolean;
}

function FileTreeItem({
  item,
  depth = 0,
  selectedFile,
  onSelectFile,
  onToggleExpand,
  onAddToStash,
}: {
  item: LCFileTreeItem;
  depth?: number;
  selectedFile: LCFileTreeItem | null;
  onSelectFile: (item: LCFileTreeItem) => void;
  onToggleExpand: (item: LCFileTreeItem) => void;
  onAddToStash: (item: LCFileTreeItem) => void;
}) {
  const isSelected = selectedFile?.id === item.id;
  const isExpanded = item.expanded ?? false;

  return (
    <div>
      <div
        className={`flex items-center gap-1 py-0.5 pr-2 cursor-pointer group hover:bg-[#2a2d2e] transition-colors select-none ${
          isSelected ? "bg-[#37373d]" : ""
        }`}
        style={{ paddingLeft: `${depth * 16 + 4}px` }}
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
            {isExpanded ? (
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
            isExpanded ? (
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
          title={item.path}
        >
          {item.name}
        </span>

        {/* Add to Stash Button */}
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          className="w-5 h-5 min-w-0 opacity-0 group-hover:opacity-100 text-[#858585] hover:text-[#e5c07b]"
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            onAddToStash(item);
          }}
        >
          <Plus className="w-3 h-3" />
        </Button>
      </div>

      {/* Children (if directory and expanded) */}
      {item.isDirectory && isExpanded && item.children && (
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
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function LCFileTree({
  items,
  selectedFile,
  onSelectFile,
  onToggleExpand,
  onAddToStash,
  isLoading,
}: LCFileTreeProps) {
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
    <div className="overflow-auto h-full">
      {items.map((item) => (
        <FileTreeItem
          key={item.id}
          item={item}
          selectedFile={selectedFile}
          onSelectFile={onSelectFile}
          onToggleExpand={onToggleExpand}
          onAddToStash={onAddToStash}
        />
      ))}
    </div>
  );
}
