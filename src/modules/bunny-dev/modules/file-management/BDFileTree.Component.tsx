"use client";

// BDFileTree.Component — recursive folder/file tree for the virtual file system.

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  FileText,
  FileCode,
  FileJson,
  FileSpreadsheet,
  FileImage,
  FilePlus2,
  Trash2,
  Plus,
} from "lucide-react";
import type { BDProjectFile, BDProjectFolder } from "../../BDDomain.Types";
import { BDProjectFileKind } from "../../BDDomain.Types";
import { cn } from "@heroui/react";

export interface BDFileTreeComponentProps {
  folders: BDProjectFolder[];
  files: BDProjectFile[];
  selectedFileId?: string;
  onSelectFile: (file: BDProjectFile) => void;
  onAddFolder: (parentId: string | null) => void;
  onAddFile: (folderId: string | null) => void;
  onDeleteFolder: (folder: BDProjectFolder) => void;
  onDeleteFile: (file: BDProjectFile) => void;
}

function fileIcon(kind: BDProjectFile["kind"]) {
  switch (kind) {
    case BDProjectFileKind.code:
      return FileCode;
    case BDProjectFileKind.json:
      return FileJson;
    case BDProjectFileKind.spreadsheet:
      return FileSpreadsheet;
    case BDProjectFileKind.image:
      return FileImage;
    default:
      return FileText;
  }
}

export function BDFileTreeComponent({
  folders,
  files,
  selectedFileId,
  onSelectFile,
  onAddFolder,
  onAddFile,
  onDeleteFolder,
  onDeleteFile,
}: BDFileTreeComponentProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const renderFiles = (folderId: string | null) => {
    const children = files.filter(
      (file) => (file.folderId ?? null) === folderId,
    );
    return children.map((file) => {
      const Icon = fileIcon(file.kind);
      const paddingLeft = folderId === null ? 24 : 24;
      return (
        <div
          key={file.id}
          className={cn(
            "group flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm",
            file.id === selectedFileId
              ? "bg-blue-50 font-medium text-blue-700"
              : "text-slate-600 hover:bg-slate-50",
          )}
          style={{ paddingLeft }}
        >
          <button
            type="button"
            className="flex flex-1 items-center gap-1.5 truncate text-left"
            onClick={() => onSelectFile(file)}
          >
            <Icon className="h-3.5 w-3.5 text-slate-400" />
            <span className="truncate">{file.name}</span>
          </button>
          <button
            type="button"
            className="rounded p-1 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-500"
            onClick={() => onDeleteFile(file)}
            aria-label="Delete file"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      );
    });
  };

  const renderFolder = (folder: BDProjectFolder, depth: number) => {
    const isOpen = expanded[folder.id] ?? depth === 0;
    const childFolders = folders.filter((f) => f.parentId === folder.id);
    return (
      <div key={folder.id}>
        <div
          className="group flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          style={{ paddingLeft: depth * 14 + 8 }}
        >
          <button
            type="button"
            className="flex flex-1 items-center gap-1.5 text-left"
            onClick={() => toggle(folder.id)}
          >
            {isOpen ? (
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            )}
            {isOpen ? (
              <FolderOpen className="h-3.5 w-3.5 text-blue-500" />
            ) : (
              <Folder className="h-3.5 w-3.5 text-blue-400" />
            )}
            <span className="truncate font-medium">{folder.name}</span>
          </button>
          <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              className="rounded p-1 text-slate-400 hover:text-blue-600"
              onClick={() => onAddFolder(folder.id)}
              aria-label="New subfolder"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className="rounded p-1 text-slate-400 hover:text-blue-600"
              onClick={() => onAddFile(folder.id)}
              aria-label="New file"
            >
              <FilePlus2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className="rounded p-1 text-slate-400 hover:text-red-500"
              onClick={() => onDeleteFolder(folder)}
              aria-label="Delete folder"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        {isOpen && (
          <div>
            {childFolders.map((child) => renderFolder(child, depth + 1))}
            {renderFiles(folder.id)}
          </div>
        )}
      </div>
    );
  };

  const rootFolders = folders.filter((f) => !f.parentId);

  return (
    <div className="flex flex-col gap-0.5">
      {rootFolders.map((folder) => renderFolder(folder, 0))}
      {renderFiles(null)}
    </div>
  );
}

export default BDFileTreeComponent;
