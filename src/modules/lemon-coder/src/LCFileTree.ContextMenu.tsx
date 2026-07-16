// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — LCFileTree.ContextMenu Sub-Module
// Context menu hook + delete confirmation modal for file tree items
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import { useState, useCallback, useRef } from "react";
import { Button, Modal, toast } from "@heroui/react";
import {
  Pencil,
  Trash2,
  Plus,
  Copy,
  Scissors,
  ClipboardPaste,
  AlertTriangle,
  Star,
  File,
  Folder,
  BookOpenText,
  Move,
  ClipboardCopy,
  MessageSquareText,
} from "lucide-react";
import type { LCFileTreeItem, LCFavoriteGroup } from "./LCInterface";
import type { LCContextMenuAction } from "./LCContextMenu";

// ── In-memory clipboard for copy/paste ────────────────────────────────────────

let copiedItemClipboard: { item: LCFileTreeItem; cut: boolean } | null = null;

/** Module-level handler for "Send to Chat" — set by LCApp to bypass prop chain */
let sendToChatHandler: ((text: string) => void) | null = null;

export function setSendToChatHandler(handler: ((text: string) => void) | null) {
  sendToChatHandler = handler;
}

export function clearClipboard() {
  copiedItemClipboard = null;
}

// ── Hook return type ──────────────────────────────────────────────────────────

export interface UseLCFileTreeContextMenuReturn {
  /** The current context menu position + item, or null */
  contextMenu: { x: number; y: number; item: LCFileTreeItem } | null;
  /** Open the context menu at mouse position */
  handleContextMenu: (e: React.MouseEvent, item: LCFileTreeItem) => void;
  /** Close the context menu */
  handleCloseContextMenu: () => void;
  /** Build the list of actions for the current context menu item */
  buildContextMenuActions: (item: LCFileTreeItem) => LCContextMenuAction[];
  /** Rename state */
  renameTarget: LCFileTreeItem | null;
  renameValue: string;
  setRenameValue: (val: string) => void;
  setRenameTarget: (item: LCFileTreeItem | null) => void;
  handleRenameStart: (item: LCFileTreeItem) => void;
  handleRenameConfirm: () => Promise<void>;
  handleRenameKeyDown: (e: React.KeyboardEvent) => void;
  /** Delete confirmation modal state */
  deleteConfirmTarget: LCFileTreeItem | null;
  handleDelete: (item: LCFileTreeItem) => void;
  handleDeleteConfirm: () => Promise<void>;
  handleDeleteCancel: () => void;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useLCFileTreeContextMenu(
  onRenameItem?: (itemPath: string, newName: string) => Promise<void>,
  onDeleteItem?: (itemPath: string, isDirectory: boolean) => Promise<void>,
  onAddToStash?: (item: LCFileTreeItem) => void,
  onCopyItem?: (sourcePath: string, destParentPath: string, newName: string) => Promise<void>,
  onAddToFavorites?: (item: LCFileTreeItem, groupId?: string) => void,
  favoriteGroups?: LCFavoriteGroup[],
  onNewItem?: (parentPath: string, type: "file" | "directory") => void,
  /** Add file content to the instruction stash (reads file content and stores it) */
  onAddToInstructionStash?: (item: LCFileTreeItem) => void,
  /** Send arbitrary text to the chat input */
  onSendToChat?: (text: string) => void,
): UseLCFileTreeContextMenuReturn {
  const onSendToChatRef = useRef(onSendToChat);
  onSendToChatRef.current = onSendToChat;
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    item: LCFileTreeItem;
  } | null>(null);
  const [renameTarget, setRenameTarget] = useState<LCFileTreeItem | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<LCFileTreeItem | null>(null);

  // ── Context Menu ─────────────────────────────────────────────────────────

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, item: LCFileTreeItem) => {
      setContextMenu({ x: e.clientX, y: e.clientY, item });
    },
    [],
  );

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // ── Rename ───────────────────────────────────────────────────────────────

  const handleRenameStart = useCallback((item: LCFileTreeItem) => {
    setContextMenu(null);
    setRenameTarget(item);
    setRenameValue(item.name);
  }, []);

  const handleRenameConfirm = useCallback(async () => {
    if (!renameTarget || !renameValue.trim() || renameValue.trim() === renameTarget.name) {
      setRenameTarget(null);
      return;
    }
    try {
      await onRenameItem?.(renameTarget.path, renameValue.trim());
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      toast.danger(`Rename failed: ${msg}`);
      throw error;
    }
    setRenameTarget(null);
  }, [renameTarget, renameValue, onRenameItem]);

  const handleRenameKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleRenameConfirm();
      } else if (e.key === "Escape") {
        setRenameTarget(null);
      }
    },
    [handleRenameConfirm],
  );

  // ── Delete ───────────────────────────────────────────────────────────────

  const handleDelete = useCallback(
    (item: LCFileTreeItem) => {
      setContextMenu(null);
      setDeleteConfirmTarget(item);
    },
    [],
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteConfirmTarget) return;
    try {
      await onDeleteItem?.(deleteConfirmTarget.path, deleteConfirmTarget.isDirectory);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      toast.danger(`Delete failed: ${msg}`);
      throw error;
    }
    setDeleteConfirmTarget(null);
  }, [deleteConfirmTarget, onDeleteItem]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteConfirmTarget(null);
  }, []);

  // ── Copy / Paste ─────────────────────────────────────────────────────────

  const handleCopy = useCallback((item: LCFileTreeItem, cut: boolean) => {
    setContextMenu(null);
    copiedItemClipboard = { item, cut };
  }, []);

  const handlePaste = useCallback(
    async (targetDir: LCFileTreeItem) => {
      setContextMenu(null);
      if (!copiedItemClipboard) return;

      const source = copiedItemClipboard.item;
      const targetPath = targetDir.isDirectory ? targetDir.path : "";
      const newName = source.name;

      if (onCopyItem) {
        try {
          await onCopyItem(source.path, targetPath, newName);
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          toast.danger(`Copy failed: ${msg}`);
          throw error;
        }
      }

      if (copiedItemClipboard.cut && onDeleteItem) {
        try {
          await onDeleteItem(source.path, source.isDirectory);
        } catch (error) {
          console.error("[lemon-coder] Cut failed:", error);
        }
      }

      copiedItemClipboard = null;
    },
    [onCopyItem, onDeleteItem],
  );

  // ── Build actions ────────────────────────────────────────────────────────

  const buildContextMenuActions = useCallback(
    (item: LCFileTreeItem): LCContextMenuAction[] => {
      const actions: LCContextMenuAction[] = [];

      // "New File" / "New Folder" — only for directories
      if (item.isDirectory) {
        actions.push({
          id: "new-file",
          label: "New File",
          icon: <File className="w-3.5 h-3.5" />,
          onClick: () => {
            setContextMenu(null);
            onNewItem?.(item.path, "file");
          },
        });
        actions.push({
          id: "new-folder",
          label: "New Folder",
          icon: <Folder className="w-3.5 h-3.5" />,
          onClick: () => {
            setContextMenu(null);
            onNewItem?.(item.path, "directory");
          },
        });
      }

      actions.push({
        id: "rename",
        label: "Rename",
        icon: <Pencil className="w-3.5 h-3.5" />,
        onClick: () => handleRenameStart(item),
      });

      actions.push({
        id: "delete",
        label: "Delete",
        icon: <Trash2 className="w-3.5 h-3.5" />,
        danger: true,
        onClick: () => handleDelete(item),
      });

      actions.push({
        id: "add-to-stash",
        label: "Add to Stash",
        icon: <Plus className="w-3.5 h-3.5" />,
        onClick: () => {
          setContextMenu(null);
          onAddToStash?.(item);
        },
      });

      // "Add to Instruction Stash" — reads file content and stores as instruction
      if (!item.isDirectory && onAddToInstructionStash) {
        actions.push({
          id: "add-to-instruction-stash",
          label: "Add to Instruction Stash",
          icon: <BookOpenText className="w-3.5 h-3.5" />,
          onClick: () => {
            setContextMenu(null);
            onAddToInstructionStash(item);
          },
        });
      }

      // ── File Paths submenu ───────────────────────────────────────────────

      actions.push({
        id: "file-paths",
        label: "File Paths",
        icon: <Copy className="w-3.5 h-3.5" />,
        onClick: () => {
          // Fallback if submenu not triggered — copy relative path
          setContextMenu(null);
          navigator.clipboard.writeText(item.path).catch(() => {});
        },
        children: [
          {
            id: "copy-relative-path",
            label: "Copy Relative Path",
            icon: <ClipboardCopy className="w-3.5 h-3.5" />,
            onClick: () => {
              navigator.clipboard.writeText(item.path).catch(() => {});
            },
          },
          {
            id: "copy-filename",
            label: "Copy Filename",
            icon: <ClipboardCopy className="w-3.5 h-3.5" />,
            onClick: () => {
              navigator.clipboard.writeText(item.name).catch(() => {});
            },
          },
          {
            id: "send-path-to-chat",
            label: "Send Relative Path to Chat",
            icon: <MessageSquareText className="w-3.5 h-3.5" />,
            onClick: () => {
              if (sendToChatHandler) {
                sendToChatHandler(item.path);
              } else {
                navigator.clipboard.writeText(item.path).catch(() => {});
              }
            },
          },
          {
            id: "send-filename-to-chat",
            label: "Send Filename to Chat",
            icon: <MessageSquareText className="w-3.5 h-3.5" />,
            onClick: () => {
              if (sendToChatHandler) {
                sendToChatHandler(item.name);
              } else {
                navigator.clipboard.writeText(item.name).catch(() => {});
              }
            },
          },
        ],
      });

      // "Add to Favourites" — only for files, with per-group sub-items if multiple groups
      if (!item.isDirectory && onAddToFavorites) {
        const groups = favoriteGroups || [];
        if (groups.length <= 1) {
          // Single item — add to Default
          actions.push({
            id: "add-to-favorites",
            label: "Add to Favourites",
            icon: <Star className="w-3.5 h-3.5" />,
            onClick: () => {
              setContextMenu(null);
              onAddToFavorites(item, groups[0]?.id);
            },
          });
        } else {
          // Multiple groups — show each as "Add to {group-name}"
            for (const group of groups) {
              actions.push({
                id: `add-to-favorites-${group.id}`,
                label: `Add to ${group.name}`,
                icon: <Star className="w-3.5 h-3.5" />,
                onClick: () => {
                  setContextMenu(null);
                  onAddToFavorites(item, group.id);
                },
              });
            }
        }
      }

      actions.push({
        id: "move",
        label: "Move",
        icon: <Move className="w-3.5 h-3.5" />,
        onClick: () => {
          setContextMenu(null);
          handleCopy(item, true);
        },
      });

      actions.push({
        id: "copy",
        label: "Copy",
        icon: <Copy className="w-3.5 h-3.5" />,
        shortcut: "Ctrl+C",
        onClick: () => handleCopy(item, false),
      });

      actions.push({
        id: "cut",
        label: "Cut",
        icon: <Scissors className="w-3.5 h-3.5" />,
        shortcut: "Ctrl+X",
        onClick: () => handleCopy(item, true),
      });

      if (copiedItemClipboard) {
        actions.push({
          id: "paste",
          label: copiedItemClipboard.cut ? "Paste (move here)" : "Paste",
          icon: <ClipboardPaste className="w-3.5 h-3.5" />,
          shortcut: "Ctrl+V",
          onClick: () => handlePaste(item),
        });
      }

      return actions;
    },
    [handleRenameStart, handleDelete, onAddToStash, onAddToFavorites, handleCopy, handlePaste, favoriteGroups, onNewItem, onAddToInstructionStash, onSendToChatRef],
  );

  return {
    contextMenu,
    handleContextMenu,
    handleCloseContextMenu,
    buildContextMenuActions,
    renameTarget,
    renameValue,
    setRenameValue,
    setRenameTarget,
    handleRenameStart,
    handleRenameConfirm,
    handleRenameKeyDown,
    deleteConfirmTarget,
    handleDelete,
    handleDeleteConfirm,
    handleDeleteCancel,
  };
}

// ── Delete Confirmation Modal ─────────────────────────────────────────────────

export interface LCDeleteConfirmModalProps {
  deleteConfirmTarget: LCFileTreeItem | null;
  onConfirm: () => void;
  onCancel: () => void;
  onClose: () => void;
}

export function LCDeleteConfirmModal({
  deleteConfirmTarget,
  onConfirm,
  onCancel,
  onClose,
}: LCDeleteConfirmModalProps) {
  return (
    <Modal.Backdrop
      isOpen={deleteConfirmTarget !== null}
      onOpenChange={(open: boolean) => { if (!open) onClose(); }}
    >
      <Modal.Container>
        <Modal.Dialog className="sm:max-w-sm bg-[#1e1e1e] text-white">
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading className="text-white flex items-center gap-2 text-sm">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              Delete {deleteConfirmTarget?.isDirectory ? "Folder" : "File"}
            </Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            <p className="text-sm text-gray-300">
              Are you sure you want to delete the {deleteConfirmTarget?.isDirectory ? "folder" : "file"}
              {' '}<strong className="text-[#e5c07b]">{deleteConfirmTarget?.name}</strong>?
            </p>
            {deleteConfirmTarget && (
              <p className="text-xs text-[#858585] mt-2 break-all">
                Path: {deleteConfirmTarget.path}
              </p>
            )}
            <p className="text-xs text-red-400 mt-3">
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
              onPress={onConfirm}
              className="bg-red-500 text-white hover:bg-red-600 text-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
