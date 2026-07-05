// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — LCFileTree.ContextMenu Sub-Module
// Context menu hook + delete confirmation modal for file tree items
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import { useState, useCallback } from "react";
import { Button, Modal } from "@heroui/react";
import {
  Pencil,
  Trash2,
  Plus,
  Copy,
  Scissors,
  ClipboardPaste,
  AlertTriangle,
} from "lucide-react";
import type { LCFileTreeItem } from "./LCInterface";
import type { LCContextMenuAction } from "./LCContextMenu";

// ── In-memory clipboard for copy/paste ────────────────────────────────────────

let copiedItemClipboard: { item: LCFileTreeItem; cut: boolean } | null = null;

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
): UseLCFileTreeContextMenuReturn {
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
      console.error("[lemon-coder] Rename failed:", error);
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
      console.error("[lemon-coder] Delete failed:", error);
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
          console.error("[lemon-coder] Copy failed:", error);
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
    [handleRenameStart, handleDelete, onAddToStash, handleCopy, handlePaste],
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
      <Modal.Container className="bg-[#1e1e1e] border border-[#333]">
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
