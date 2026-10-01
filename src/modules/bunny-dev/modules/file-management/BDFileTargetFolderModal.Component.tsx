"use client";

// BDFileTargetFolderModal — folder picker shared by the bulk Move and Copy
// actions. Renders the project's folder tree as a flat, indented radio list
// with an optional "same location" choice and disabled (cycle) folders.

import { useState } from "react";
import { Folder, FolderTree } from "lucide-react";
import { cn } from "@heroui/react";
import type { BDProjectFolder } from "../../BDDomain.Types";
import type { BDCopyTarget } from "./BDFile.Types";
import BDModal from "../../components/BDModal";
import BDButton from "../../components/BDButton";

export interface BDFileTargetFolderModalProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  folders: BDProjectFolder[];
  /** Folders that cannot receive the selection (self/descendant on move). */
  disabledFolderIds?: Set<string>;
  allowSameLocation?: boolean;
  sameLocationLabel?: string;
  onConfirm: (target: BDCopyTarget) => void;
  onClose: () => void;
}

const SAME = "__same__";
const ROOT = "__root__";

export function BDFileTargetFolderModal({
  open,
  title,
  description,
  confirmLabel,
  folders,
  disabledFolderIds,
  allowSameLocation = false,
  sameLocationLabel = "Same location",
  onConfirm,
  onClose,
}: BDFileTargetFolderModalProps) {
  const [selected, setSelected] = useState<string>(
    allowSameLocation ? SAME : ROOT,
  );

  // Reset the choice each time the modal opens (render-time adjustment).
  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setSelected(allowSameLocation ? SAME : ROOT);
  }

  const options = folders
    .slice()
    .sort((a, b) => a.path.localeCompare(b.path))
    .map((folder) => ({
      folder,
      depth: folder.path.split("/").filter(Boolean).length - 1,
      disabled: disabledFolderIds?.has(folder.id) ?? false,
    }));

  const confirmDisabled =
    selected !== SAME &&
    selected !== ROOT &&
    (disabledFolderIds?.has(selected) ?? false);

  const handleConfirm = () => {
    if (confirmDisabled) return;
    if (selected === SAME) onConfirm({ mode: "same" });
    else if (selected === ROOT) onConfirm({ mode: "folder", folderId: null });
    else onConfirm({ mode: "folder", folderId: selected });
  };

  return (
    <BDModal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <BDButton variant="ghost" onClick={onClose}>
            Cancel
          </BDButton>
          <BDButton onClick={handleConfirm} disabled={confirmDisabled}>
            {confirmLabel}
          </BDButton>
        </>
      }
    >
      <div className="max-h-80 space-y-1 overflow-y-auto">
        {allowSameLocation && (
          <FolderOption
            label={sameLocationLabel}
            selected={selected === SAME}
            onSelect={() => setSelected(SAME)}
          />
        )}
        <FolderOption
          label="Project root"
          icon={<FolderTree className="h-4 w-4 text-blue-500" />}
          selected={selected === ROOT}
          onSelect={() => setSelected(ROOT)}
        />
        {options.map(({ folder, depth, disabled }) => (
          <FolderOption
            key={folder.id}
            label={folder.name}
            depth={depth + 1}
            disabled={disabled}
            selected={selected === folder.id}
            onSelect={() => !disabled && setSelected(folder.id)}
          />
        ))}
      </div>
    </BDModal>
  );
}

function FolderOption({
  label,
  selected,
  onSelect,
  disabled = false,
  depth = 0,
  icon,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  depth?: number;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      style={{ paddingLeft: 12 + depth * 14 }}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
        selected
          ? "bg-blue-50 text-blue-700"
          : "text-slate-700 hover:bg-slate-100",
        disabled && "cursor-not-allowed opacity-40 hover:bg-transparent",
      )}
    >
      {icon ?? <Folder className="h-4 w-4 text-blue-500" />}
      <span className="flex-1 truncate">{label}</span>
    </button>
  );
}

export default BDFileTargetFolderModal;
