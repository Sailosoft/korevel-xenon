"use client";

// BDFile.Manager.Component — Google Drive-style full-page file manager.
//
// Lists only the open folder's contents (grid or list), keeps the open folder
// in the URL (?folder=<id>&view=grid|list), and opens files in the dedicated
// editor route. Editing happens on the editor page, never here.

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronRight,
  Download,
  FileCode,
  FileImage,
  FileJson,
  FilePlus2,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  FolderTree,
  LayoutGrid,
  List,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { cn } from "@heroui/react";
import type { BDProjectFile, BDProjectFolder } from "../../BDDomain.Types";
import { BDProjectFileEncoding, BDProjectFileKind } from "../../BDDomain.Types";
import { useBDProjectContext } from "../core/BDProject.Context";
import { useBDFiles, useBDFolders } from "./BDFile.Hooks";
import { bdFileRepository, bdFolderRepository } from "./BDFile.Repository";
import {
  applyRenameFile,
  applyRenameFolder,
  breadcrumbOf,
  createFolder,
  createTextFile,
  createUploadedFile,
  detectKind,
  formatSize,
  isTextKind,
  nameTaken,
} from "./BDFile.Types";
import BDPageHeader from "../../components/BDPageHeader";
import BDButton from "../../components/BDButton";
import BDModal from "../../components/BDModal";
import BDEmptyState from "../../components/BDEmptyState";
import BDConfirmDialog from "../../components/BDConfirmDialog";
import BDContextMenu, {
  type BDContextMenuAction,
} from "../../components/BDContextMenu";
import { useBDToast } from "../../components/BDToast";
import { downloadBlob, downloadText } from "../../BDDownload";

type ViewMode = "grid" | "list";

type CreatePrompt = {
  kind: "folder" | "file";
  parentId: string | null;
} | null;

type RenameTarget =
  | { type: "folder"; folder: BDProjectFolder }
  | { type: "file"; file: BDProjectFile }
  | null;

type MenuTarget =
  | { type: "folder"; folder: BDProjectFolder }
  | { type: "file"; file: BDProjectFile }
  | { type: "empty" };

function fileIcon(kind: BDProjectFileKind) {
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

function formatDate(iso?: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function BDFileManagerComponent() {
  const { projectId } = useBDProjectContext();
  const { toast } = useBDToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const folders = useBDFolders(projectId);
  const files = useBDFiles(projectId);
  const uploadRef = useRef<HTMLInputElement>(null);

  const rawFolderId = searchParams.get("folder");
  const view: ViewMode = searchParams.get("view") === "list" ? "list" : "grid";

  const folderList = folders ?? [];
  const fileList = files ?? [];
  const folderExists =
    rawFolderId !== null && folderList.some((f) => f.id === rawFolderId);
  const currentFolderId = rawFolderId !== null && folderExists ? rawFolderId : null;
  const currentFolder = currentFolderId
    ? folderList.find((f) => f.id === currentFolderId) ?? null
    : null;

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [createPrompt, setCreatePrompt] = useState<CreatePrompt>(null);
  const [renameTarget, setRenameTarget] = useState<RenameTarget>(null);
  const [promptValue, setPromptValue] = useState("");
  const [deletingFile, setDeletingFile] = useState<BDProjectFile | null>(null);
  const [deletingFolder, setDeletingFolder] = useState<BDProjectFolder | null>(
    null,
  );
  const [query, setQuery] = useState("");
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    target: MenuTarget;
  } | null>(null);

  // Drop a stale ?folder=<id> once folders have loaded.
  useEffect(() => {
    if (rawFolderId && folders && !folderExists) {
      router.replace(buildUrl(null, view));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawFolderId, folders, folderExists, view]);

  function buildUrl(folderId: string | null, mode: ViewMode): string {
    const params = new URLSearchParams();
    if (folderId) params.set("folder", folderId);
    if (mode === "list") params.set("view", "list");
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  const editorHref = (fileId: string) => {
    const params = new URLSearchParams();
    if (currentFolderId) params.set("folder", currentFolderId);
    if (view === "list") params.set("view", "list");
    const qs = params.toString();
    return `${pathname}/${fileId}${qs ? `?${qs}` : ""}`;
  };

  const goToFolder = (folderId: string | null) =>
    router.push(buildUrl(folderId, view));

  const setViewMode = (mode: ViewMode) => router.replace(buildUrl(currentFolderId, mode));

  const parentPathOfFolder = (folderId: string | null) =>
    folderList.find((f) => f.id === folderId)?.path ?? "/";

  const matchesQuery = (name: string) =>
    !query.trim() || name.toLowerCase().includes(query.trim().toLowerCase());

  const childFolders = folderList
    .filter((f) => (f.parentId ?? null) === currentFolderId && matchesQuery(f.name))
    .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
  const childFiles = fileList
    .filter((f) => (f.folderId ?? null) === currentFolderId && matchesQuery(f.name))
    .sort((a, b) => a.name.localeCompare(b.name));

  const breadcrumb = breadcrumbOf(currentFolderId, folderList);
  const isEmpty = childFolders.length === 0 && childFiles.length === 0;

  const openCreate = (kind: "folder" | "file", parentId: string | null) => {
    setPromptValue("");
    setCreatePrompt({ kind, parentId });
  };

  const openRenameFolder = (folder: BDProjectFolder) => {
    setPromptValue(folder.name);
    setRenameTarget({ type: "folder", folder });
  };

  const openRenameFile = (file: BDProjectFile) => {
    setPromptValue(file.name);
    setRenameTarget({ type: "file", file });
  };

  const siblingNames = (
    parentId: string | null,
    excludeId?: string,
  ): string[] => {
    const folderNames = folderList
      .filter((f) => (f.parentId ?? null) === parentId && f.id !== excludeId)
      .map((f) => f.name);
    const fileNames = fileList
      .filter((f) => (f.folderId ?? null) === parentId && f.id !== excludeId)
      .map((f) => f.name);
    return [...folderNames, ...fileNames];
  };

  const submitCreate = async () => {
    if (!createPrompt) return;
    const name = promptValue.trim();
    if (!name) return;
    const parentId = createPrompt.parentId;
    if (nameTaken(siblingNames(parentId), name)) {
      toast({ title: "A file or folder with that name exists", status: "error" });
      return;
    }
    if (createPrompt.kind === "folder") {
      await bdFolderRepository.create(
        createFolder(projectId, parentId, name, parentPathOfFolder(parentId)),
      );
      toast({ title: "Folder created", status: "success" });
    } else {
      const created = await bdFileRepository.create(
        createTextFile(projectId, parentId, name, parentPathOfFolder(parentId)),
      );
      setSelectedKey(`file:${created.id}`);
      toast({ title: "File created", status: "success" });
    }
    setCreatePrompt(null);
    setPromptValue("");
  };

  const submitRename = async () => {
    if (!renameTarget) return;
    const name = promptValue.trim();
    if (!name) return;
    if (renameTarget.type === "folder") {
      const folder = renameTarget.folder;
      const parentId = folder.parentId ?? null;
      if (name === folder.name) {
        setRenameTarget(null);
        return;
      }
      if (nameTaken(siblingNames(parentId, folder.id), name)) {
        toast({ title: "A file or folder with that name exists", status: "error" });
        return;
      }
      const next = applyRenameFolder(
        folderList,
        fileList,
        folder.id,
        name,
        parentPathOfFolder(parentId),
      );
      const changedFolders = next.folders.filter((f, i) => f !== folderList[i]);
      const changedFiles = next.files.filter((f, i) => f !== fileList[i]);
      if (changedFolders.length) await bdFolderRepository.bulkPut(changedFolders);
      if (changedFiles.length) await bdFileRepository.bulkPut(changedFiles);
      toast({ title: "Folder renamed", status: "success" });
    } else {
      const file = renameTarget.file;
      const parentId = file.folderId ?? null;
      if (name === file.name) {
        setRenameTarget(null);
        return;
      }
      if (nameTaken(siblingNames(parentId, file.id), name)) {
        toast({ title: "A file or folder with that name exists", status: "error" });
        return;
      }
      await bdFileRepository.update(
        file.id,
        applyRenameFile(file, name, parentPathOfFolder(parentId)),
      );
      toast({ title: "File renamed", status: "success" });
    }
    setRenameTarget(null);
    setPromptValue("");
  };

  const readUpload = (
    file: File,
  ): Promise<{
    content?: { data: string; encoding: BDProjectFileEncoding };
    blob?: Blob;
  }> =>
    new Promise((resolve) => {
      const kind = detectKind(file.name);
      if (isTextKind(kind)) {
        const reader = new FileReader();
        reader.onload = () =>
          resolve({
            content: {
              data: String(reader.result ?? ""),
              encoding: BDProjectFileEncoding.utf8,
            },
          });
        reader.onerror = () => resolve({});
        reader.readAsText(file);
      } else {
        resolve({ blob: file });
      }
    });

  const handleUpload = async (fileListToUpload: FileList | null) => {
    if (!fileListToUpload) return;
    for (const file of Array.from(fileListToUpload)) {
      const { content, blob } = await readUpload(file);
      await bdFileRepository.create(
        createUploadedFile(
          projectId,
          currentFolderId,
          file.name,
          parentPathOfFolder(currentFolderId),
          file.size,
          content,
          blob,
        ),
      );
    }
    toast({ title: "Upload complete", status: "success" });
  };

  const handleDeleteFile = async () => {
    if (!deletingFile) return;
    await bdFileRepository.delete(deletingFile.id);
    setDeletingFile(null);
    toast({ title: "File deleted", status: "success" });
  };

  const handleDeleteFolder = async () => {
    if (!deletingFolder) return;
    await bdFolderRepository.delete(deletingFolder.id);
    if (currentFolderId && currentFolderId === deletingFolder.id) {
      goToFolder(null);
    }
    setDeletingFolder(null);
    toast({ title: "Folder deleted", status: "success" });
  };

  const handleDownload = (file: BDProjectFile) => {
    if (file.blob) downloadBlob(file.name, file.blob);
    else downloadText(file.name, file.content?.data ?? "");
  };

  const buildMenuActions = (target: MenuTarget): BDContextMenuAction[] => {
    if (target.type === "file") {
      const file = target.file;
      return [
        {
          id: "open",
          label: "Open in editor",
          icon: FileCode,
          onClick: () => router.push(editorHref(file.id)),
        },
        { id: "rename", label: "Rename", icon: Pencil, onClick: () => openRenameFile(file) },
        {
          id: "download",
          label: "Download",
          icon: Download,
          onClick: () => handleDownload(file),
        },
        {
          id: "delete",
          label: "Delete",
          icon: Trash2,
          danger: true,
          onClick: () => setDeletingFile(file),
        },
      ];
    }
    if (target.type === "folder") {
      const folder = target.folder;
      return [
        { id: "open", label: "Open", icon: FolderOpen, onClick: () => goToFolder(folder.id) },
        {
          id: "new-file",
          label: "New file",
          icon: FilePlus2,
          onClick: () => openCreate("file", folder.id),
        },
        {
          id: "new-folder",
          label: "New subfolder",
          icon: FolderPlus,
          onClick: () => openCreate("folder", folder.id),
        },
        { id: "rename", label: "Rename", icon: Pencil, onClick: () => openRenameFolder(folder) },
        {
          id: "delete",
          label: "Delete",
          icon: Trash2,
          danger: true,
          onClick: () => setDeletingFolder(folder),
        },
      ];
    }
    return [
      {
        id: "new-folder",
        label: "New folder",
        icon: FolderPlus,
        onClick: () => openCreate("folder", currentFolderId),
      },
      {
        id: "new-file",
        label: "New file",
        icon: FilePlus2,
        onClick: () => openCreate("file", currentFolderId),
      },
      {
        id: "upload",
        label: "Upload files",
        icon: Upload,
        onClick: () => uploadRef.current?.click(),
      },
    ];
  };

  const openMenu = (
    event: React.MouseEvent,
    target: MenuTarget,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setMenu({ x: event.clientX, y: event.clientY, target });
  };

  const itemContextProps = (target: MenuTarget) => ({
    onContextMenu: (event: React.MouseEvent) => openMenu(event, target),
  });

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <BDPageHeader
        icon={FolderTree}
        title="File Management"
        description="A virtual project file system — organize folders, upload files, and open files in the dedicated editor."
        actions={
          <>
            <BDButton
              variant="secondary"
              icon={FolderPlus}
              onClick={() => openCreate("folder", currentFolderId)}
            >
              New folder
            </BDButton>
            <BDButton
              variant="secondary"
              icon={FilePlus2}
              onClick={() => openCreate("file", currentFolderId)}
            >
              New file
            </BDButton>
            <BDButton icon={Upload} onClick={() => uploadRef.current?.click()}>
              Upload
            </BDButton>
            <input
              ref={uploadRef}
              type="file"
              multiple
              className="hidden"
              onChange={(event) => {
                void handleUpload(event.target.files);
                event.target.value = "";
              }}
            />
          </>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1 text-sm">
          <button
            type="button"
            className={cn(
              "truncate rounded-md px-2 py-1 font-medium hover:bg-slate-100",
              currentFolderId ? "text-slate-500" : "text-slate-800",
            )}
            onClick={() => goToFolder(null)}
          >
            Files
          </button>
          {breadcrumb.map((folder) => (
            <span key={folder.id} className="flex min-w-0 items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />
              <button
                type="button"
                className={cn(
                  "truncate rounded-md px-2 py-1 font-medium hover:bg-slate-100",
                  folder.id === currentFolderId
                    ? "text-slate-800"
                    : "text-slate-500",
                )}
                onClick={() => goToFolder(folder.id)}
              >
                {folder.name}
              </button>
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search this folder…"
              className="w-56 rounded-lg border border-slate-200 py-1.5 pl-8 pr-3 text-sm outline-none focus:border-blue-400"
            />
          </div>
          <div className="flex items-center rounded-lg border border-slate-200 p-0.5">
            <button
              type="button"
              aria-label="Grid view"
              onClick={() => setViewMode("grid")}
              className={cn(
                "rounded-md p-1.5 transition-colors",
                view === "grid"
                  ? "bg-blue-50 text-blue-600"
                  : "text-slate-400 hover:text-slate-600",
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="List view"
              onClick={() => setViewMode("list")}
              className={cn(
                "rounded-md p-1.5 transition-colors",
                view === "list"
                  ? "bg-blue-50 text-blue-600"
                  : "text-slate-400 hover:text-slate-600",
              )}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div
        className="min-h-0 flex-1 overflow-auto rounded-xl border border-slate-200 bg-white p-4"
        onContextMenu={(event) => openMenu(event, { type: "empty" })}
      >
        {isEmpty ? (
          <BDEmptyState
            icon={FolderTree}
            title={query.trim() ? "No matching files" : "This folder is empty"}
            description={
              query.trim()
                ? "Try a different search term."
                : "Create a folder or file, or upload from your device."
            }
            className="h-full border-0"
          />
        ) : view === "grid" ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
            {childFolders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                {...itemContextProps({ type: "folder", folder })}
                onClick={() => setSelectedKey(`folder:${folder.id}`)}
                onDoubleClick={() => goToFolder(folder.id)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-colors",
                  selectedKey === `folder:${folder.id}`
                    ? "border-blue-300 bg-blue-50"
                    : "border-slate-200 hover:border-blue-200 hover:bg-slate-50",
                )}
              >
                <Folder className="h-10 w-10 text-blue-500" />
                <span className="w-full truncate text-sm font-medium text-slate-700">
                  {folder.name}
                </span>
              </button>
            ))}
            {childFiles.map((file) => {
              const Icon = fileIcon(file.kind);
              return (
                <button
                  key={file.id}
                  type="button"
                  {...itemContextProps({ type: "file", file })}
                  onClick={() => router.push(editorHref(file.id))}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-colors",
                    selectedKey === `file:${file.id}`
                      ? "border-blue-300 bg-blue-50"
                      : "border-slate-200 hover:border-blue-200 hover:bg-slate-50",
                  )}
                >
                  <Icon className="h-10 w-10 text-slate-400" />
                  <span className="w-full truncate text-sm font-medium text-slate-700">
                    {file.name}
                  </span>
                  <span className="text-xs text-slate-400">
                    {formatSize(file.size)}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Kind</th>
                <th className="px-3 py-2 font-medium">Size</th>
                <th className="px-3 py-2 font-medium">Modified</th>
              </tr>
            </thead>
            <tbody>
              {childFolders.map((folder) => (
                <tr
                  key={folder.id}
                  {...itemContextProps({ type: "folder", folder })}
                  onClick={() => setSelectedKey(`folder:${folder.id}`)}
                  onDoubleClick={() => goToFolder(folder.id)}
                  className={cn(
                    "cursor-default border-b border-slate-50 last:border-0",
                    selectedKey === `folder:${folder.id}`
                      ? "bg-blue-50"
                      : "hover:bg-slate-50",
                  )}
                >
                  <td className="flex items-center gap-2 px-3 py-2 font-medium text-slate-700">
                    <Folder className="h-4 w-4 text-blue-500" />
                    {folder.name}
                  </td>
                  <td className="px-3 py-2 text-slate-400">folder</td>
                  <td className="px-3 py-2 text-slate-400">—</td>
                  <td className="px-3 py-2 text-slate-400">
                    {formatDate(folder.updatedAt)}
                  </td>
                </tr>
              ))}
              {childFiles.map((file) => {
                const Icon = fileIcon(file.kind);
                return (
                  <tr
                    key={file.id}
                    {...itemContextProps({ type: "file", file })}
                    onClick={() => router.push(editorHref(file.id))}
                    className={cn(
                      "cursor-default border-b border-slate-50 last:border-0",
                      selectedKey === `file:${file.id}`
                        ? "bg-blue-50"
                        : "hover:bg-slate-50",
                    )}
                  >
                    <td className="flex items-center gap-2 px-3 py-2 font-medium text-slate-700">
                      <Icon className="h-4 w-4 text-slate-400" />
                      {file.name}
                    </td>
                    <td className="px-3 py-2 text-slate-400">{file.kind}</td>
                    <td className="px-3 py-2 text-slate-400">
                      {formatSize(file.size)}
                    </td>
                    <td className="px-3 py-2 text-slate-400">
                      {formatDate(file.updatedAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {menu && (
        <BDContextMenu
          x={menu.x}
          y={menu.y}
          actions={buildMenuActions(menu.target)}
          onClose={() => setMenu(null)}
        />
      )}

      <BDModal
        open={createPrompt !== null}
        onClose={() => setCreatePrompt(null)}
        title={createPrompt?.kind === "folder" ? "New folder" : "New file"}
        description={currentFolder ? `In ${currentFolder.path}` : "In project root"}
        size="sm"
        footer={
          <>
            <BDButton variant="ghost" onClick={() => setCreatePrompt(null)}>
              Cancel
            </BDButton>
            <BDButton icon={Plus} onClick={submitCreate}>
              Create
            </BDButton>
          </>
        }
      >
        <input
          autoFocus
          value={promptValue}
          onChange={(event) => setPromptValue(event.target.value)}
          placeholder={createPrompt?.kind === "folder" ? "Folder name" : "filename.md"}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
          onKeyDown={(event) => {
            if (event.key === "Enter") void submitCreate();
          }}
        />
      </BDModal>

      <BDModal
        open={renameTarget !== null}
        onClose={() => setRenameTarget(null)}
        title={renameTarget?.type === "folder" ? "Rename folder" : "Rename file"}
        size="sm"
        footer={
          <>
            <BDButton variant="ghost" onClick={() => setRenameTarget(null)}>
              Cancel
            </BDButton>
            <BDButton onClick={submitRename}>Rename</BDButton>
          </>
        }
      >
        <input
          autoFocus
          value={promptValue}
          onChange={(event) => setPromptValue(event.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
          onKeyDown={(event) => {
            if (event.key === "Enter") void submitRename();
          }}
        />
      </BDModal>

      <BDConfirmDialog
        open={!!deletingFile}
        title={`Delete ${deletingFile?.name ?? "file"}?`}
        confirmLabel="Delete file"
        onConfirm={handleDeleteFile}
        onCancel={() => setDeletingFile(null)}
      />

      <BDConfirmDialog
        open={!!deletingFolder}
        title={`Delete ${deletingFolder?.name ?? "folder"}?`}
        description="All nested folders and files will be removed."
        confirmLabel="Delete folder"
        onConfirm={handleDeleteFolder}
        onCancel={() => setDeletingFolder(null)}
      />
    </div>
  );
}

export default BDFileManagerComponent;
