// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — LCRightSidebar Component
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import { useState, useCallback } from "react";
import { Button, Modal } from "@heroui/react";
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
  Upload,
  Save,
  RefreshCw,
  Plus,
  BookOpenText,
} from "lucide-react";
import type { LCContextStashItem, LCChatSession, LCInstructionStashItem } from "./LCInterface";
import type { LCDeepstash, LCDeepstashItem, LCDeepstashMergeStrategy } from "./LCInterface";
import { lcDB } from "./LCDatabase";

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
  onKeepOnlyFolder?: (folderId: string) => void;
  onDeleteSession?: (sessionId: string) => void;
  onClearSessions?: () => void;
  /** Deepstashes for the current project (live-queried) */
  deepstashes: LCDeepstash[];
  /** Save current context stash as a new deepstash */
  onSaveDeepstash: () => void;
  /** Apply a deepstash with the given merge strategy */
  onApplyDeepstash: (deepstash: LCDeepstash, strategy: LCDeepstashMergeStrategy) => void;
  /** Delete a deepstash */
  onDeleteDeepstash: (id: string) => void;
  /** Clear all deepstashes for the current project */
  onClearDeepstashes?: () => void;
  // ── Instruction Stash props ──────────────────────────────────────────
  /** Instruction stash items */
  instructionStashItems: LCInstructionStashItem[];
  /** Add a new instruction snippet */
  onAddInstruction: (name: string, content: string) => void;
  /** Remove an instruction by id */
  onRemoveInstruction: (id: string) => void;
  /** Clear all instructions */
  onClearInstructions: () => void;
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
  onDeleteSession,
  onClearSessions,
  deepstashes,
  onSaveDeepstash,
  onApplyDeepstash,
  onDeleteDeepstash,
  onClearDeepstashes,
  instructionStashItems = [],
  onAddInstruction = () => {},
  onRemoveInstruction = () => {},
  onClearInstructions = () => {},
}: LCRightSidebarProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [expandedDeepstashes, setExpandedDeepstashes] = useState<Set<string>>(new Set());
  const [deepstashItemsMap, setDeepstashItemsMap] = useState<Record<string, LCDeepstashItem[]>>({});
  const [loadingItems, setLoadingItems] = useState<Set<string>>(new Set());
  const [applyConfirmId, setApplyConfirmId] = useState<string | null>(null);
  const [applyStrategy, setApplyStrategy] = useState<LCDeepstashMergeStrategy>("override");
  const [clearDeepstashConfirm, setClearDeepstashConfirm] = useState(false);

  // ── Instruction Stash inline add state ──────────────────────────────────
  const [isAddingInstruction, setIsAddingInstruction] = useState(false);
  const [newInstName, setNewInstName] = useState("");
  const [newInstContent, setNewInstContent] = useState("");

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

  const toggleDeepstash = useCallback(async (dsId: string) => {
    setExpandedDeepstashes((prev) => {
      const next = new Set(prev);
      if (next.has(dsId)) {
        next.delete(dsId);
      } else {
        next.add(dsId);
      }
      return next;
    });

    // Load items if not yet loaded
    if (!deepstashItemsMap[dsId] && !loadingItems.has(dsId)) {
      setLoadingItems((prev) => new Set(prev).add(dsId));
      try {
        const items = await lcDB.getDeepstashItems(dsId);
        setDeepstashItemsMap((prev) => ({ ...prev, [dsId]: items }));
      } finally {
        setLoadingItems((prev) => {
          const next = new Set(prev);
          next.delete(dsId);
          return next;
        });
      }
    }
  }, [deepstashItemsMap, loadingItems]);

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

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

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
                        {(childrenByParent.get(item.id) || []).length === 0 && (
                          <p className="text-[10px] text-[#858585] pl-1">
                            No files in this folder
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
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

          {/* Deepstash quick save button */}
          {stashItems.length > 0 && (
            <div className="mt-2 pt-2 border-t border-[#333333]">
              <Button
                size="sm"
                variant="ghost"
                onPress={onSaveDeepstash}
                className="w-full text-[10px] h-6 text-[#e5c07b] hover:bg-[#e5c07b]/10 min-w-0"
              >
                <Save className="w-3 h-3" />
                Save Current as Deepstash
              </Button>
            </div>
          )}
        </div>

        {/* Separator */}
        <div className="mx-3 border-t border-[#333333]" />

        {/* Deepstashes Section — display stored deepstashes inline */}
        <div className="px-3 py-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#61afef]" />
              <span className="text-xs text-[#abb2bf]">Deepstashes</span>
              <span className="text-[10px] text-[#858585]">
                ({deepstashes.length})
              </span>
            </div>
            {onClearDeepstashes && deepstashes.length > 0 && (
              <Button
                isIconOnly
                size="sm"
                variant="ghost"
                onPress={() => setClearDeepstashConfirm(true)}
                className="w-5 h-5 min-w-0 text-[#858585] hover:text-red-400"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>

          {deepstashes.length === 0 ? (
            <p className="text-[11px] text-[#858585] pl-1">
              No saved deepstashes yet.
            </p>
          ) : (
            <div className="space-y-0.5">
              {deepstashes.map((ds) => {
                const isOpen = expandedDeepstashes.has(ds.id);
                const items = deepstashItemsMap[ds.id];
                const isLoading = loadingItems.has(ds.id);

                return (
                  <div key={ds.id}>
                    {/* Deepstash accordion header */}
                    <div
                      className="flex items-center justify-between gap-1 px-1 py-1 rounded cursor-pointer hover:bg-[#333333] group select-none"
                      onClick={() => toggleDeepstash(ds.id)}
                    >
                      <div className="flex items-center gap-1.5 truncate min-w-0 flex-1">
                        <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
                          {isOpen ? (
                            <ChevronDown className="w-3 h-3 text-[#858585]" />
                          ) : (
                            <ChevronRight className="w-3 h-3 text-[#858585]" />
                          )}
                        </span>
                        <Layers className="w-3.5 h-3.5 text-[#61afef] shrink-0" />
                        <span className="text-xs text-[#d4d4d4] truncate">
                          {ds.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button
                          isIconOnly
                          size="sm"
                          variant="ghost"
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            setApplyConfirmId(ds.id);
                            setApplyStrategy("override");
                          }}
                          className="w-4 h-4 min-w-0 opacity-0 group-hover:opacity-100 text-[#858585] hover:text-[#98c379] shrink-0"
                          aria-label="Pop this deepstash into the context stash"
                        >
                          <Upload className="w-2.5 h-2.5" />
                        </Button>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="ghost"
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            onDeleteDeepstash(ds.id);
                          }}
                          className="w-4 h-4 min-w-0 opacity-0 group-hover:opacity-100 text-[#858585] hover:text-red-400 shrink-0"
                        >
                          <X className="w-2.5 h-2.5" />
                        </Button>
                      </div>
                    </div>
                    {/* Deepstash items (expandable) */}
                    {isOpen && (
                      <div className="ml-3 space-y-0.5">
                        {isLoading ? (
                          <p className="text-[10px] text-[#858585] pl-1">
                            Loading...
                          </p>
                        ) : items && items.length > 0 ? (
                          items.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-1.5 px-1 py-0.5 rounded select-none"
                            >
                              {item.isDirectory ? (
                                <Folder className="w-2.5 h-2.5 text-[#e5c07b] shrink-0" />
                              ) : (
                                <FileText className="w-2.5 h-2.5 text-[#abb2bf] shrink-0" />
                              )}
                              <span className="text-[10px] text-[#abb2bf] truncate">
                                {item.path}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-[10px] text-[#858585] pl-1">
                            Empty
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Separator */}
        <div className="mx-3 border-t border-[#333333]" />

        {/* Instruction Stash Section */}
        <div className="px-3 py-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <BookOpenText className="w-3.5 h-3.5 text-[#98c379]" />
              <span className="text-xs text-[#abb2bf]">Instructions</span>
              <span className="text-[10px] text-[#858585]">
                ({instructionStashItems.length})
              </span>
            </div>
            <div className="flex items-center gap-0.5">
              {instructionStashItems.length > 0 && (
                <Button
                  isIconOnly
                  size="sm"
                  variant="ghost"
                  onPress={onClearInstructions}
                  className="w-5 h-5 min-w-0 text-[#858585] hover:text-red-400"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
              <Button
                isIconOnly
                size="sm"
                variant="ghost"
                onPress={() => {
                  setIsAddingInstruction(true);
                  setNewInstName("");
                  setNewInstContent("");
                }}
                className="w-5 h-5 min-w-0 text-[#858585] hover:text-[#98c379]"
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {isAddingInstruction && (
            <div className="mb-2 space-y-1.5">
              <input
                value={newInstName}
                onChange={(e) => setNewInstName(e.target.value)}
                placeholder="Instruction name..."
                className="w-full bg-[#3c3c3c] text-xs text-[#d4d4d4] placeholder:text-[#858585] border border-[#444444] rounded px-2 py-1 outline-none focus:border-[#98c379] transition-colors"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newInstName.trim()) {
                    // Move focus to content textarea
                    const textarea = e.currentTarget.parentElement?.querySelector("textarea");
                    textarea?.focus();
                  } else if (e.key === "Escape") {
                    setIsAddingInstruction(false);
                  }
                }}
              />
              <textarea
                value={newInstContent}
                onChange={(e) => setNewInstContent(e.target.value)}
                placeholder="Paste or type your instruction here..."
                rows={3}
                className="w-full bg-[#3c3c3c] text-xs text-[#d4d4d4] placeholder:text-[#858585] border border-[#444444] rounded px-2 py-1 outline-none focus:border-[#98c379] transition-colors resize-none"
                style={{ scrollbarWidth: "thin" }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && newInstName.trim() && newInstContent.trim()) {
                    e.preventDefault();
                    onAddInstruction(newInstName.trim(), newInstContent.trim());
                    setIsAddingInstruction(false);
                  } else if (e.key === "Escape") {
                    setIsAddingInstruction(false);
                  }
                }}
              />
              <div className="flex items-center gap-1.5 justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  onPress={() => setIsAddingInstruction(false)}
                  className="text-[10px] h-5 text-[#858585] hover:text-white min-w-0 px-2"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  isDisabled={!newInstName.trim() || !newInstContent.trim()}
                  onPress={() => {
                    onAddInstruction(newInstName.trim(), newInstContent.trim());
                    setIsAddingInstruction(false);
                  }}
                  className="text-[10px] h-5 text-[#98c379] hover:bg-[#98c379]/10 min-w-0 px-2"
                >
                  Add
                </Button>
              </div>
            </div>
          )}

          {instructionStashItems.length === 0 && !isAddingInstruction ? (
            <p className="text-[11px] text-[#858585] pl-1">
              Add instructions to include in the system prompt.
            </p>
          ) : (
            <div className="space-y-0.5">
              {instructionStashItems.map((inst) => (
                <div
                  key={inst.id}
                  className="flex items-start justify-between gap-1 px-1 py-1 rounded hover:bg-[#333333] group select-none"
                >
                  <div className="flex flex-col gap-0.5 truncate min-w-0 flex-1">
                    <span className="text-xs text-[#d4d4d4] truncate font-medium">
                      {inst.name}
                    </span>
                    <span className="text-[10px] text-[#858585] line-clamp-2 leading-relaxed">
                      {inst.content}
                    </span>
                  </div>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="ghost"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      onRemoveInstruction(inst.id);
                    }}
                    className="w-4 h-4 min-w-0 opacity-0 group-hover:opacity-100 text-[#858585] hover:text-red-400 shrink-0 mt-0.5"
                  >
                    <X className="w-2.5 h-2.5" />
                  </Button>
                </div>
              ))}
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
              {chatSessions.length > 0 && (
                <span className="text-[10px] text-[#858585]">
                  ({chatSessions.length})
                </span>
              )}
            </div>
            <div className="flex items-center gap-0.5">
              {chatSessions.length > 0 && onClearSessions && (
                <Button
                  isIconOnly
                  size="sm"
                  variant="ghost"
                  onPress={onClearSessions}
                  className="w-5 h-5 min-w-0 text-[#858585] hover:text-red-400"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onPress={onCreateSession}
                className="text-xs h-6 text-[#e5c07b] min-w-0 px-2"
              >
                + New
              </Button>
            </div>
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
                  className={`flex items-center gap-1 px-2 py-1.5 rounded cursor-pointer text-xs transition-colors group ${
                    activeSessionId === session.id
                      ? "bg-[#333333] text-white"
                      : "text-[#abb2bf] hover:bg-[#2a2d2e]"
                  }`}
                  onClick={() => onSelectSession(session)}
                >
                  <MessageSquare className="w-3 h-3 text-[#e5c07b] shrink-0" />
                  <span className="truncate flex-1">{session.title}</span>
                  {onDeleteSession && (
                    <Button
                      isIconOnly
                      size="sm"
                      variant="ghost"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        onDeleteSession(session.id);
                      }}
                      className="w-4 h-4 min-w-0 opacity-0 group-hover:opacity-100 text-[#858585] hover:text-red-400 shrink-0"
                    >
                      <X className="w-2.5 h-2.5" />
                    </Button>
                  )}
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

      {/* Apply Deepstash Confirmation Inline Modal */}
      <Modal.Backdrop
        isOpen={applyConfirmId !== null}
        onOpenChange={(open: boolean) => { if (!open) setApplyConfirmId(null); }}
      >
        <Modal.Container className="bg-[#1e1e1e] border border-[#333]">
          <Modal.Dialog className="sm:max-w-sm bg-[#1e1e1e] text-white">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading className="text-white flex items-center gap-2 text-sm">
                  <Upload className="w-4 h-4 text-[#98c379]" />
                  Pop Deepstash
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <p className="text-sm text-gray-300 mb-3">
                How do you want to apply this deepstash to your current context stash?
              </p>
              <div className="flex gap-2">
                <button
                  className={`flex-1 flex items-center gap-2 px-3 py-2 rounded text-xs border transition-colors ${
                    applyStrategy === "override"
                      ? "bg-[#98c379]/20 border-[#98c379]/40 text-white"
                      : "border-[#333] text-gray-400 hover:bg-[#333]"
                  }`}
                  onClick={() => setApplyStrategy("override")}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Override
                </button>
                <button
                  className={`flex-1 flex items-center gap-2 px-3 py-2 rounded text-xs border transition-colors ${
                    applyStrategy === "overlap"
                      ? "bg-[#98c379]/20 border-[#98c379]/40 text-white"
                      : "border-[#333] text-gray-400 hover:bg-[#333]"
                  }`}
                  onClick={() => setApplyStrategy("overlap")}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Overlap
                </button>
              </div>
              <p className="text-[10px] text-gray-500 mt-2">
                {applyStrategy === "override"
                  ? "Replace current context stash entirely."
                  : "Keep existing items, add new ones only."}
              </p>
            </Modal.Body>
            <Modal.Footer>
              <Button
                slot="close"
                variant="ghost"
                className="bg-transparent text-gray-300 hover:bg-[#333] text-xs"
              >
                Cancel
              </Button>
              <Button
                slot="close"
                onPress={() => {
                  const ds = deepstashes.find((d) => d.id === applyConfirmId);
                  if (ds) {
                    onApplyDeepstash(ds, applyStrategy);
                  }
                  setApplyConfirmId(null);
                }}
                className="bg-[#98c379] text-black hover:bg-[#7fb06d] text-xs"
              >
                <Upload className="w-3.5 h-3.5" />
                Pop
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      {/* Clear All Deepstashes Confirmation Modal */}
      <Modal.Backdrop
        isOpen={clearDeepstashConfirm}
        onOpenChange={(open: boolean) => { if (!open) setClearDeepstashConfirm(false); }}
      >
        <Modal.Container className="bg-[#1e1e1e] border border-[#333]">
          <Modal.Dialog className="sm:max-w-sm bg-[#1e1e1e] text-white">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading className="text-white flex items-center gap-2 text-sm">
                <Trash2 className="w-4 h-4 text-red-400" />
                Clear All Deepstashes
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <p className="text-sm text-gray-300">
                This will permanently delete all {deepstashes.length} deepstash{deepstashes.length !== 1 ? "es" : ""} and their items for this project.
              </p>
              <p className="text-xs text-red-400 mt-2">
                This action cannot be undone.
              </p>
            </Modal.Body>
            <Modal.Footer>
              <Button
                slot="close"
                variant="ghost"
                className="bg-transparent text-gray-300 hover:bg-[#333] text-xs"
              >
                Cancel
              </Button>
              <Button
                slot="close"
                onPress={() => {
                  onClearDeepstashes?.();
                  setClearDeepstashConfirm(false);
                }}
                className="bg-red-500 text-white hover:bg-red-600 text-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear All
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </div>
  );
}
