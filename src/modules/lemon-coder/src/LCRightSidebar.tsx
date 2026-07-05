// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — LCRightSidebar Component
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import { useState } from "react";
import { Button } from "@heroui/react";
import {
  Layers,
  X,
  FileText,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Trash2,
  MessageSquare,
  Settings,
  FolderMinus,
} from "lucide-react";
import type { LCContextStashItem, LCChatSession } from "./LCInterface";

export interface LCRightSidebarProps {
  stashItems: LCContextStashItem[];
  chatSessions: LCChatSession[];
  activeSessionId: string | null;
  onRemoveFromStash: (id: string) => void;
  onClearStash: () => void;
  onStashItemClick: (item: LCContextStashItem) => void;
  onSelectSession: (session: LCChatSession) => void;
  onCreateSession: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  /**
   * Remove all child items from a folder stash entry, keeping only the
   * folder reference (directory path) in the context stash.
   */
  onKeepOnlyFolder?: (folderId: string) => void;
}

export default function LCRightSidebar({
  stashItems,
  chatSessions,
  activeSessionId,
  onRemoveFromStash,
  onClearStash,
  onStashItemClick,
  onSelectSession,
  onCreateSession,
  isExpanded,
  onToggleExpand,
  onKeepOnlyFolder,
}: LCRightSidebarProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const toggleFolder = (id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (!isExpanded) {
    return (
      <div className="w-10 bg-[#252526] border-l border-[#333333] flex flex-col items-center py-2 gap-3 shrink-0">
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          onPress={onToggleExpand}
          className="w-7 h-7 min-w-0 text-[#858585] hover:text-[#e5c07b]"
        >
          <Layers className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  // Separate root items (no parentId) from children
  const rootItems = stashItems.filter((s) => !s.parentId);
  const childrenByParent = new Map<string, LCContextStashItem[]>();
  for (const item of stashItems) {
    if (item.parentId) {
      const list = childrenByParent.get(item.parentId) || [];
      list.push(item);
      childrenByParent.set(item.parentId, list);
    }
  }

  return (
    <div className="w-64 bg-[#252526] border-l border-[#333333] flex flex-col shrink-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 h-9 border-b border-[#333333] shrink-0">
        <span className="text-xs font-semibold text-[#cccccc] uppercase tracking-wider">
          Stash
        </span>
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          onPress={onToggleExpand}
          className="w-6 h-6 min-w-0 text-[#858585] hover:text-white"
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Context Stash Section */}
        <div className="px-3 py-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#e5c07b]" />
              <span className="text-xs text-[#abb2bf]">Context Stash</span>
              <span className="text-[10px] text-[#858585]">
                ({rootItems.length})
              </span>
            </div>
            {stashItems.length > 0 && (
              <Button
                isIconOnly
                size="sm"
                variant="ghost"
                onPress={onClearStash}
                className="w-5 h-5 min-w-0 text-[#858585] hover:text-red-400"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>

          {rootItems.length === 0 ? (
            <p className="text-[11px] text-[#858585] pl-1">
              Click the + button on files to add them here.
            </p>
          ) : (
            <div className="space-y-0.5">
              {rootItems.map((item) =>
                item.isDirectory ? (
                  <div key={item.id}>
                    {/* Folder accordion header */}
                    <div
                      className="flex items-center justify-between gap-1 px-1 py-1 rounded cursor-pointer hover:bg-[#333333] group select-none"
                      onClick={() => toggleFolder(item.id)}
                    >
                      <div className="flex items-center gap-1.5 truncate min-w-0 flex-1">
                        <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
                          {expandedFolders.has(item.id) ? (
                            <ChevronDown className="w-3 h-3 text-[#858585]" />
                          ) : (
                            <ChevronRight className="w-3 h-3 text-[#858585]" />
                          )}
                        </span>
                        {expandedFolders.has(item.id) ? (
                          <FolderOpen className="w-3.5 h-3.5 text-[#e5c07b] shrink-0" />
                        ) : (
                          <Folder className="w-3.5 h-3.5 text-[#e5c07b] shrink-0" />
                        )}
                        <span className="text-xs text-[#d4d4d4] truncate">
                          {item.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {/* Keep Only Folder — removes children but keeps the folder reference */}
                        {onKeepOnlyFolder && (childrenByParent.get(item.id) || []).length > 0 && (
                          <Button
                            isIconOnly
                            size="sm"
                            variant="ghost"
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              onKeepOnlyFolder(item.id);
                            }}
                            className="w-4 h-4 min-w-0 opacity-0 group-hover:opacity-100 text-[#858585] hover:text-[#e5c07b] shrink-0"
                            aria-label="Keep only this folder, remove its children"
                          >
                            <FolderMinus className="w-2.5 h-2.5" />
                          </Button>
                        )}
                        <Button
                          isIconOnly
                          size="sm"
                          variant="ghost"
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            onRemoveFromStash(item.id);
                          }}
                          className="w-4 h-4 min-w-0 opacity-0 group-hover:opacity-100 text-[#858585] hover:text-red-400 shrink-0"
                        >
                          <X className="w-2.5 h-2.5" />
                        </Button>
                      </div>
                    </div>
                    {/* Children (expandable) */}
                    {expandedFolders.has(item.id) && (
                      <div className="ml-3 space-y-0.5">
                        {(childrenByParent.get(item.id) || []).map((child) => (
                          <div
                            key={child.id}
                            className="flex items-center justify-between gap-1 px-1 py-1 rounded cursor-pointer hover:bg-[#333333] group select-none"
                            onClick={() => onStashItemClick(child)}
                          >
                            <div className="flex items-center gap-1.5 truncate min-w-0 flex-1">
                              <FileText className="w-3 h-3 text-[#abb2bf] shrink-0" />
                              <span className="text-xs text-[#abb2bf] truncate">
                                {child.name}
                              </span>
                            </div>
                            <Button
                              isIconOnly
                              size="sm"
                              variant="ghost"
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                onRemoveFromStash(child.id);
                              }}
                              className="w-4 h-4 min-w-0 opacity-0 group-hover:opacity-100 text-[#858585] hover:text-red-400 shrink-0"
                            >
                              <X className="w-2.5 h-2.5" />
                            </Button>
                          </div>
                        ))}
                        {(childrenByParent.get(item.id) || []).length ===
                          0 && (
                          <p className="text-[10px] text-[#858585] pl-1">
                            No files in this folder
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Standalone file (no parent) */
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-1 px-1 py-1 rounded cursor-pointer hover:bg-[#333333] group select-none"
                    onClick={() => onStashItemClick(item)}
                  >
                    <div className="flex items-center gap-1.5 truncate min-w-0 flex-1">
                      <FileText className="w-3 h-3 text-[#abb2bf] shrink-0" />
                      <span className="text-xs text-[#abb2bf] truncate">
                        {item.path}
                      </span>
                    </div>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="ghost"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        onRemoveFromStash(item.id);
                      }}
                      className="w-4 h-4 min-w-0 opacity-0 group-hover:opacity-100 text-[#858585] hover:text-red-400 shrink-0"
                    >
                      <X className="w-2.5 h-2.5" />
                    </Button>
                  </div>
                ),
              )}
            </div>
          )}
        </div>

        {/* Separator */}
        <div className="mx-3 border-t border-[#333333]" />

        {/* Chat Sessions Section */}
        <div className="px-3 py-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-[#e5c07b]" />
              <span className="text-xs text-[#abb2bf]">Sessions</span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onPress={onCreateSession}
              className="text-xs h-6 text-[#e5c07b] min-w-0 px-2"
            >
              + New
            </Button>
          </div>

          {chatSessions.length === 0 ? (
            <p className="text-[11px] text-[#858585] pl-1">
              No chat sessions yet.
            </p>
          ) : (
            <div className="space-y-0.5">
              {chatSessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => onSelectSession(session)}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-xs transition-colors ${
                    activeSessionId === session.id
                      ? "bg-[#333333] text-white"
                      : "text-[#abb2bf] hover:bg-[#2a2d2e]"
                  }`}
                >
                  <MessageSquare className="w-3 h-3 text-[#e5c07b] shrink-0" />
                  <span className="truncate">{session.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Separator */}
        <div className="mx-3 border-t border-[#333333]" />

        {/* Settings Accordion (Placeholder) */}
        <div className="px-3 py-2">
          <div className="flex items-center gap-1.5">
            <Settings className="w-3.5 h-3.5 text-[#858585]" />
            <span className="text-xs text-[#858585]">Settings</span>
          </div>
        </div>
      </div>
    </div>
  );
}
