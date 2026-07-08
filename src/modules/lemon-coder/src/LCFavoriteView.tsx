// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — LCFavoriteView Component
// Lists favourited files by group, with group management (add, edit, delete)
// and "Add to Stash" action on each item.
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import { useState, useCallback } from "react";
import { Button, Modal } from "@heroui/react";
import {
  Star,
  Folder,
  FolderOpen,
  FileText,
  Plus,
  Trash2,
  Pencil,
  ChevronRight,
  ChevronDown,
  X,
  Layers,
} from "lucide-react";
import type { LCFavoriteGroup, LCFavoriteItem } from "./LCInterface";

export interface LCFavoriteViewProps {
  /** All favourite groups for the current project */
  groups: LCFavoriteGroup[];
  /** All favourite items keyed by group id */
  itemsByGroup: Record<string, LCFavoriteItem[]>;
  /** Select a file by path */
  onSelectFile: (path: string) => void;
  /** Add an item to the context stash */
  onAddToStash: (path: string, name: string) => void;
  /** Create a new favourite group */
  onCreateGroup: (name: string) => Promise<void>;
  /** Rename a favourite group */
  onRenameGroup: (groupId: string, name: string) => Promise<void>;
  /** Delete a favourite group and its items */
  onDeleteGroup: (groupId: string) => Promise<void>;
  /** Remove a single favourite item */
  onRemoveItem: (itemId: string) => Promise<void>;
  /** Move an item to a different group */
  onMoveItem: (itemId: string, newGroupId: string) => Promise<void>;
  /** Loading state */
  isLoading?: boolean;
}

export default function LCFavoriteView({
  groups,
  itemsByGroup,
  onSelectFile,
  onAddToStash,
  onCreateGroup,
  onRenameGroup,
  onDeleteGroup,
  onRemoveItem,
  onMoveItem,
  isLoading = false,
}: LCFavoriteViewProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deleteConfirmGroupId, setDeleteConfirmGroupId] = useState<string | null>(null);

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCreateGroup = useCallback(async () => {
    const name = newGroupName.trim();
    if (!name) return;
    await onCreateGroup(name);
    setNewGroupName("");
    setIsCreateModalOpen(false);
  }, [newGroupName, onCreateGroup]);

  const handleStartEdit = useCallback((group: LCFavoriteGroup) => {
    setEditingGroupId(group.id);
    setEditingName(group.name);
  }, []);

  const handleConfirmEdit = useCallback(async () => {
    if (!editingGroupId || !editingName.trim()) {
      setEditingGroupId(null);
      return;
    }
    await onRenameGroup(editingGroupId, editingName.trim());
    setEditingGroupId(null);
  }, [editingGroupId, editingName, onRenameGroup]);

  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleConfirmEdit();
      } else if (e.key === "Escape") {
        setEditingGroupId(null);
      }
    },
    [handleConfirmEdit],
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteConfirmGroupId) return;
    await onDeleteGroup(deleteConfirmGroupId);
    setDeleteConfirmGroupId(null);
  }, [deleteConfirmGroupId, onDeleteGroup]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-[#858585]">
        Loading...
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Create Group Inline */}
      <div className="px-3 py-2 border-b border-[#333333]">
        <Button
          size="sm"
          variant="ghost"
          onPress={() => setIsCreateModalOpen(true)}
          className="w-full text-[10px] h-6 text-[#e5c07b] hover:bg-[#e5c07b]/10 min-w-0"
        >
          <Plus className="w-3 h-3" />
          New Group
        </Button>
      </div>

      {/* Groups List */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1">
        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-xs text-[#858585] px-4 text-center gap-2">
            <Star className="w-8 h-8 text-[#e5c07b]/40" />
            <span>No favourites yet.</span>
            <span className="text-[10px]">
              Right-click a file and select "Add to Favourites".
            </span>
          </div>
        ) : (
          groups.map((group) => {
            const isOpen = expandedGroups.has(group.id);
            const items = itemsByGroup[group.id] || [];
            const isEditing = editingGroupId === group.id;

            return (
              <div key={group.id}>
                {/* Group Header */}
                <div
                  className="flex items-center justify-between gap-1 px-1 py-1 rounded cursor-pointer hover:bg-[#333333] group select-none"
                  onClick={() => toggleGroup(group.id)}
                >
                  <div className="flex items-center gap-1.5 truncate min-w-0 flex-1">
                    <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
                      {isOpen ? (
                        <ChevronDown className="w-3 h-3 text-[#858585]" />
                      ) : (
                        <ChevronRight className="w-3 h-3 text-[#858585]" />
                      )}
                    </span>
                    {isOpen ? (
                      <FolderOpen className="w-3.5 h-3.5 text-[#e5c07b] shrink-0" />
                    ) : (
                      <Folder className="w-3.5 h-3.5 text-[#e5c07b] shrink-0" />
                    )}
                    {isEditing ? (
                      <input
                        className="flex-1 bg-[#3c3c3c] text-xs text-[#d4d4d4] border border-[#e5c07b] rounded px-1 py-0.5 outline-none min-w-0"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={handleEditKeyDown}
                        onBlur={handleConfirmEdit}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                      />
                    ) : (
                      <span className="text-xs text-[#d4d4d4] truncate">
                        {group.name}
                      </span>
                    )}
                    <span className="text-[10px] text-[#858585] shrink-0">
                      ({items.length})
                    </span>
                  </div>

                  {/* Group Actions */}
                  <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      isIconOnly
                      size="sm"
                      variant="ghost"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        handleStartEdit(group);
                      }}
                      className="w-4 h-4 min-w-0 text-[#858585] hover:text-[#e5c07b]"
                    >
                      <Pencil className="w-2.5 h-2.5" />
                    </Button>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="ghost"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        setDeleteConfirmGroupId(group.id);
                      }}
                      className="w-4 h-4 min-w-0 text-[#858585] hover:text-red-400"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </Button>
                  </div>
                </div>

                {/* Group Items */}
                {isOpen && (
                  <div className="ml-3 space-y-0.5 mt-0.5">
                    {items.length === 0 ? (
                      <p className="text-[10px] text-[#858585] pl-1 py-1">
                        No items in this group.
                      </p>
                    ) : (
                      items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-1 px-1 py-1 rounded cursor-pointer hover:bg-[#333333] group/item select-none"
                          onClick={() => onSelectFile(item.path)}
                        >
                          <div className="flex items-center gap-1.5 truncate min-w-0 flex-1">
                            <FileText className="w-3 h-3 text-[#abb2bf] shrink-0" />
                            <span className="text-xs text-[#abb2bf] truncate">
                              {item.name}
                            </span>
                          </div>

                          {/* Item Actions: Add to Stash + Remove */}
                          <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity">
                            <Button
                              isIconOnly
                              size="sm"
                              variant="ghost"
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                onAddToStash(item.path, item.name);
                              }}
                              className="w-4 h-4 min-w-0 text-[#858585] hover:text-[#98c379]"
                              aria-label="Add to Stash"
                            >
                              <Layers className="w-2.5 h-2.5" />
                            </Button>
                            <Button
                              isIconOnly
                              size="sm"
                              variant="ghost"
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                onRemoveItem(item.id);
                              }}
                              className="w-4 h-4 min-w-0 text-[#858585] hover:text-red-400"
                            >
                              <X className="w-2.5 h-2.5" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Create Group Modal */}
      <Modal.Backdrop
        isOpen={isCreateModalOpen}
        onOpenChange={(open: boolean) => { if (!open) { setIsCreateModalOpen(false); setNewGroupName(""); } }}
      >
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-sm bg-[#1e1e1e] text-white">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading className="text-white flex items-center gap-2 text-sm">
                <Plus className="w-4 h-4 text-[#e5c07b]" />
                New Favourite Group
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <input
                className="w-full bg-[#3c3c3c] text-sm text-[#d4d4d4] border border-[#555] rounded px-2 py-1.5 outline-none focus:border-[#e5c07b]"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateGroup();
                  if (e.key === "Escape") { setIsCreateModalOpen(false); setNewGroupName(""); }
                }}
                placeholder="Group name..."
                autoFocus
              />
            </Modal.Body>
            <Modal.Footer>
              <Button
                slot="close"
                variant="ghost"
                className="bg-transparent text-gray-300 hover:bg-[#333] text-xs"
                onPress={() => { setIsCreateModalOpen(false); setNewGroupName(""); }}
              >
                Cancel
              </Button>
              <Button
                slot="close"
                onPress={handleCreateGroup}
                isDisabled={!newGroupName.trim()}
                className="bg-[#e5c07b] text-black hover:bg-[#d4ae6a] text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Create
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      {/* Delete Group Confirmation Modal */}
      <Modal.Backdrop
        isOpen={deleteConfirmGroupId !== null}
        onOpenChange={(open: boolean) => { if (!open) setDeleteConfirmGroupId(null); }}
      >
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-sm bg-[#1e1e1e] text-white">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading className="text-white flex items-center gap-2 text-sm">
                <Trash2 className="w-4 h-4 text-red-400" />
                Delete Group
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <p className="text-sm text-gray-300">
                Are you sure you want to delete this group and all its favourite items?
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
                onPress={handleDeleteConfirm}
                className="bg-red-500 text-white hover:bg-red-600 text-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </div>
  );
}
