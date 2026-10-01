"use client";

// BDFile.Manager.Component — Google Drive-style full-page file manager.
//
// Lists only the open folder's contents (grid or list), keeps the open folder
// in the URL (?folder=<id>&view=grid|list), and opens files in the dedicated
// editor route. Media files preview in a modal viewer. A selection mode adds
// bulk move / copy / download / delete, and password protection gates the
// view / edit / download actions until the file is unlocked for the session.

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Check,
  ChevronRight,
  Copy,
  Download,
  Eye,
  FileArchive,
  FileCode,
  FileImage,
  FileJson,
  FileMusic,
  FilePlus2,
  FileSpreadsheet,
  FileText,
  FileType,
  FileVideoCamera,
  Folder,
  FolderInput,
  FolderOpen,
  FolderPlus,
  FolderTree,
  KeyRound,
  LayoutGrid,
  List,
  Lock,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  ShieldOff,
  Square,
  SquareCheck,
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
  collectDescendantFolderIds,
  collectFilesInFolders,
  createFolder,
  createTextFile,
  createUploadedFile,
  formatSize,
  hashPassword,
  isMediaKind,
  isPasswordProtected,
  isPdfFile,
  isTextUpload,
  makeSalt,
  nameTaken,
  planCopy,
  planMove,
  topLevelFolderIds,
  verifyPassword,
  type BDCopyTarget,
} from "./BDFile.Types";
import {
  isFileLocked,
  markFileUnlocked,
  forgetFileUnlocked,
} from "./BDFile.Lock";
import BDPageHeader from "../../components/BDPageHeader";
import BDButton from "../../components/BDButton";
import BDModal from "../../components/BDModal";
import BDEmptyState from "../../components/BDEmptyState";
import BDConfirmDialog from "../../components/BDConfirmDialog";
import BDContextMenu, {
  type BDContextMenuAction,
} from "../../components/BDContextMenu";
import BDFileViewerModal from "./BDFileViewerModal.Component";
import BDFileTargetFolderModal from "./BDFileTargetFolderModal.Component";
import BDFilePasswordDialog, {
  type BDFilePasswordMode,
} from "./BDFilePasswordDialog.Component";
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

type PasswordDialogState = {
  mode: BDFilePasswordMode;
  file: BDProjectFile;
  next?: "open" | "preview" | "download";
} | null;

const FILE_PREFIX = "file:";
const FOLDER_PREFIX = "folder:";

function fileIcon(file: BDProjectFile) {
  if (isPdfFile(file)) return FileType;
  switch (file.kind) {
    case BDProjectFileKind.code:
      return FileCode;
    case BDProjectFileKind.json:
      return FileJson;
    case BDProjectFileKind.spreadsheet:
      return FileSpreadsheet;
    case BDProjectFileKind.image:
      return FileImage;
    case BDProjectFileKind.video:
      return FileVideoCamera;
    case BDProjectFileKind.audio:
      return FileMusic;
    case BDProjectFileKind.archive:
      return FileArchive;
    default:
      return FileText;
  }
}

/** Media and PDFs open in the modal viewer; everything else opens in the editor. */
function opensInViewer(file: BDProjectFile): boolean {
  return isMediaKind(file.kind) || isPdfFile(file);
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

  // ── T2 selection ──────────────────────────────────────────────────────────
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [movingOpen, setMovingOpen] = useState(false);
  const [copyingOpen, setCopyingOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // ── T1 viewer + T3 password gate ─────────────────────────────────────────
  const [viewerFile, setViewerFile] = useState<BDProjectFile | null>(null);
  const [passwordDialog, setPasswordDialog] = useState<PasswordDialogState>(null);
  const [passwordError, setPasswordError] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);

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

  // ── Selection helpers ─────────────────────────────────────────────────────
  const selectionKey = (type: "folder" | "file", id: string) =>
    `${type}:${id}`;
  const isSelected = (type: "folder" | "file", id: string) =>
    selected.has(selectionKey(type, id));
  const toggleSelected = (type: "folder" | "file", id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      const key = selectionKey(type, id);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const selectedFolderIds = () =>
    [...selected]
      .filter((key) => key.startsWith(FOLDER_PREFIX))
      .map((key) => key.slice(FOLDER_PREFIX.length));
  const selectedFileIds = () =>
    [...selected]
      .filter((key) => key.startsWith(FILE_PREFIX))
      .map((key) => key.slice(FILE_PREFIX.length));

  const clearSelection = () => setSelected(new Set());
  const endSelection = () => {
    setSelected(new Set());
    setSelectionMode(false);
  };
  const toggleSelectionMode = () => {
    if (selectionMode) endSelection();
    else setSelectionMode(true);
  };

  // ── File actions ──────────────────────────────────────────────────────────
  const performDownload = (file: BDProjectFile) => {
    if (file.blob) downloadBlob(file.name, file.blob);
    else downloadText(file.name, file.content?.data ?? "");
  };

  const openPasswordDialog = (state: NonNullable<PasswordDialogState>) => {
    setPasswordError("");
    setPasswordDialog(state);
  };

  const openFile = (file: BDProjectFile) => {
    if (isFileLocked(file)) {
      openPasswordDialog({ mode: "unlock", file, next: "open" });
      return;
    }
    router.push(editorHref(file.id));
  };

  const previewFile = (file: BDProjectFile) => {
    if (isFileLocked(file)) {
      openPasswordDialog({ mode: "unlock", file, next: "preview" });
      return;
    }
    setViewerFile(file);
  };

  const defaultOpen = (file: BDProjectFile) =>
    opensInViewer(file) ? previewFile(file) : openFile(file);

  const handleDownload = (file: BDProjectFile) => {
    if (isFileLocked(file)) {
      openPasswordDialog({ mode: "unlock", file, next: "download" });
      return;
    }
    performDownload(file);
  };

  const submitPassword = async (password: string) => {
    const state = passwordDialog;
    if (!state) return;
    const fresh = fileList.find((f) => f.id === state.file.id) ?? state.file;
    setPasswordBusy(true);
    setPasswordError("");

    if (state.mode === "protect") {
      const salt = makeSalt();
      await bdFileRepository.update(fresh.id, {
        passwordProtected: true,
        passwordSalt: salt,
        passwordHash: hashPassword(password, salt),
      });
      markFileUnlocked(fresh.id);
      toast({ title: "File protected", status: "success" });
      setPasswordBusy(false);
      setPasswordDialog(null);
      return;
    }

    if (!verifyPassword(fresh, password)) {
      setPasswordError("Incorrect password.");
      setPasswordBusy(false);
      return;
    }

    if (state.mode === "remove") {
      await bdFileRepository.update(fresh.id, {
        passwordProtected: false,
        passwordHash: undefined,
        passwordSalt: undefined,
      });
      forgetFileUnlocked(fresh.id);
      toast({ title: "Password removed", status: "success" });
      setPasswordBusy(false);
      setPasswordDialog(null);
      return;
    }

    markFileUnlocked(fresh.id);
    setPasswordBusy(false);
    setPasswordDialog(null);
    if (state.next === "download") performDownload(fresh);
    else if (state.next === "open") router.push(editorHref(fresh.id));
    else previewFile(fresh);
  };

  // ── Create / rename ───────────────────────────────────────────────────────
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

  // ── Upload ────────────────────────────────────────────────────────────────
  const readUpload = (
    file: File,
  ): Promise<{
    content?: { data: string; encoding: BDProjectFileEncoding };
    blob?: Blob;
  }> =>
    new Promise((resolve) => {
      if (isTextUpload(file.name, file.type)) {
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
          file.type,
        ),
      );
    }
    toast({ title: "Upload complete", status: "success" });
  };

  // ── Single deletes ────────────────────────────────────────────────────────
  const handleDeleteFile = async () => {
    if (!deletingFile) return;
    forgetFileUnlocked(deletingFile.id);
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

  // ── Bulk actions ──────────────────────────────────────────────────────────
  const handleBulkMove = async (target: BDCopyTarget) => {
    setMovingOpen(false);
    const targetFolderId = target.mode === "folder" ? target.folderId : null;
    const plan = planMove(
      selectedFolderIds(),
      selectedFileIds(),
      targetFolderId,
      folderList,
      fileList,
    );
    if (plan.error) {
      toast({ title: plan.error, status: "error" });
      return;
    }
    const changedFolders = plan.folders.filter((f, i) => f !== folderList[i]);
    const changedFiles = plan.files.filter((f, i) => f !== fileList[i]);
    if (changedFolders.length) await bdFolderRepository.bulkPut(changedFolders);
    if (changedFiles.length) await bdFileRepository.bulkPut(changedFiles);
    toast({
      title: `Moved ${changedFolders.length + changedFiles.length} item(s)`,
      status: "success",
    });
    endSelection();
  };

  const handleBulkCopy = async (target: BDCopyTarget) => {
    setCopyingOpen(false);
    const originalFolderIds = new Set(folderList.map((f) => f.id));
    const originalFileIds = new Set(fileList.map((f) => f.id));
    const plan = planCopy(
      selectedFolderIds(),
      selectedFileIds(),
      target,
      folderList,
      fileList,
    );
    const addedFolders = plan.folders.filter((f) => !originalFolderIds.has(f.id));
    const addedFiles = plan.files.filter((f) => !originalFileIds.has(f.id));
    if (addedFolders.length) await bdFolderRepository.bulkPut(addedFolders);
    if (addedFiles.length) await bdFileRepository.bulkPut(addedFiles);
    toast({
      title: `Copied ${addedFolders.length + addedFiles.length} item(s)`,
      status: "success",
    });
    endSelection();
  };

  const handleBulkDownload = () => {
    const ids = new Set(selectedFileIds());
    for (const file of collectFilesInFolders(
      selectedFolderIds(),
      folderList,
      fileList,
    )) {
      ids.add(file.id);
    }
    const targets = fileList.filter((f) => ids.has(f.id));
    let skipped = 0;
    for (const file of targets) {
      if (isFileLocked(file)) {
        skipped += 1;
        continue;
      }
      performDownload(file);
    }
    if (skipped) {
      toast({
        title: `Downloaded ${targets.length - skipped} file(s); ${skipped} locked file(s) skipped.`,
        status: "error",
      });
    } else {
      toast({ title: `Downloaded ${targets.length} file(s)`, status: "success" });
    }
    endSelection();
  };

  const handleBulkDelete = async () => {
    const folderIds = topLevelFolderIds(selectedFolderIds(), folderList);
    const fileIds = selectedFileIds();
    for (const id of folderIds) await bdFolderRepository.delete(id);
    for (const id of fileIds) {
      forgetFileUnlocked(id);
      await bdFileRepository.delete(id);
    }
    if (currentFolderId && folderIds.includes(currentFolderId)) {
      goToFolder(null);
    }
    setBulkDeleting(false);
    toast({
      title: `Deleted ${folderIds.length + fileIds.length} item(s)`,
      status: "success",
    });
    endSelection();
  };

  // Folders that cannot be a move target (the selection and its descendants).
  const moveDisabledFolderIds = new Set<string>();
  for (const id of selectedFolderIds()) {
    moveDisabledFolderIds.add(id);
    for (const descendant of collectDescendantFolderIds(id, folderList)) {
      moveDisabledFolderIds.add(descendant);
    }
  }

  // ── Context menu ──────────────────────────────────────────────────────────
  const buildMenuActions = (target: MenuTarget): BDContextMenuAction[] => {
    if (target.type === "file") {
      const file = target.file;
      const locked = isFileLocked(file);
      const lockedHint = locked ? "Password required" : undefined;
      const actions: BDContextMenuAction[] = [
        {
          id: "preview",
          label: "Preview",
          icon: Eye,
          disabled: locked,
          tooltip: lockedHint,
          onClick: () => previewFile(file),
        },
        {
          id: "open",
          label: "Open in editor",
          icon: FileCode,
          disabled: locked,
          tooltip: lockedHint,
          onClick: () => openFile(file),
        },
      ];
      if (locked) {
        actions.push({
          id: "unlock",
          label: "Unlock with password",
          icon: KeyRound,
          onClick: () =>
            openPasswordDialog({ mode: "unlock", file, next: "preview" }),
        });
      }
      actions.push(
        {
          id: "rename",
          label: "Rename",
          icon: Pencil,
          onClick: () => openRenameFile(file),
        },
        {
          id: "download",
          label: "Download",
          icon: Download,
          disabled: locked,
          tooltip: lockedHint,
          onClick: () => handleDownload(file),
        },
      );
      if (isPasswordProtected(file)) {
        actions.push({
          id: "remove-password",
          label: "Remove password",
          icon: ShieldOff,
          onClick: () => openPasswordDialog({ mode: "remove", file }),
        });
      } else {
        actions.push({
          id: "protect",
          label: "Protect with password",
          icon: ShieldCheck,
          onClick: () => openPasswordDialog({ mode: "protect", file }),
        });
      }
      actions.push({
        id: "delete",
        label: "Delete",
        icon: Trash2,
        danger: true,
        onClick: () => setDeletingFile(file),
      });
      return actions;
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
              variant={selectionMode ? "primary" : "secondary"}
              icon={SquareCheck}
              onClick={toggleSelectionMode}
            >
              {selectionMode ? "Selecting" : "Select"}
            </BDButton>
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

      {selectionMode && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2">
          <span className="mr-1 text-sm font-medium text-blue-700">
            {selected.size} selected
          </span>
          <BDButton
            size="sm"
            variant="secondary"
            icon={FolderInput}
            disabled={selected.size === 0}
            onClick={() => setMovingOpen(true)}
          >
            Move
          </BDButton>
          <BDButton
            size="sm"
            variant="secondary"
            icon={Copy}
            disabled={selected.size === 0}
            onClick={() => setCopyingOpen(true)}
          >
            Copy
          </BDButton>
          <BDButton
            size="sm"
            variant="secondary"
            icon={Download}
            disabled={selected.size === 0}
            onClick={handleBulkDownload}
          >
            Download
          </BDButton>
          <BDButton
            size="sm"
            variant="danger"
            icon={Trash2}
            disabled={selected.size === 0}
            onClick={() => setBulkDeleting(true)}
          >
            Delete
          </BDButton>
          <BDButton size="sm" variant="ghost" onClick={clearSelection}>
            Clear
          </BDButton>
          <BDButton size="sm" variant="ghost" onClick={endSelection}>
            Done
          </BDButton>
        </div>
      )}

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
                onClick={() =>
                  selectionMode
                    ? toggleSelected("folder", folder.id)
                    : setSelectedKey(`folder:${folder.id}`)
                }
                onDoubleClick={() => !selectionMode && goToFolder(folder.id)}
                className={cn(
                  "relative flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-colors",
                  (selectionMode && isSelected("folder", folder.id)) ||
                    selectedKey === `folder:${folder.id}`
                    ? "border-blue-300 bg-blue-50"
                    : "border-slate-200 hover:border-blue-200 hover:bg-slate-50",
                )}
              >
                {selectionMode && (
                  <SelectionCheck
                    checked={isSelected("folder", folder.id)}
                    className="absolute left-2 top-2"
                  />
                )}
                <Folder className="h-10 w-10 text-blue-500" />
                <span className="w-full truncate text-sm font-medium text-slate-700">
                  {folder.name}
                </span>
              </button>
            ))}
            {childFiles.map((file) => {
              const Icon = fileIcon(file);
              return (
                <button
                  key={file.id}
                  type="button"
                  {...itemContextProps({ type: "file", file })}
                  onClick={() =>
                    selectionMode
                      ? toggleSelected("file", file.id)
                      : defaultOpen(file)
                  }
                  className={cn(
                    "relative flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-colors",
                    (selectionMode && isSelected("file", file.id)) ||
                      selectedKey === `file:${file.id}`
                      ? "border-blue-300 bg-blue-50"
                      : "border-slate-200 hover:border-blue-200 hover:bg-slate-50",
                  )}
                >
                  {selectionMode && (
                    <SelectionCheck
                      checked={isSelected("file", file.id)}
                      className="absolute left-2 top-2"
                    />
                  )}
                  <Icon className="h-10 w-10 text-slate-400" />
                  <span className="flex w-full items-center justify-center gap-1 text-sm font-medium text-slate-700">
                    {isPasswordProtected(file) && (
                      <Lock className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                    )}
                    <span className="truncate">{file.name}</span>
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
                {selectionMode && <th className="w-8 px-3 py-2" />}
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
                  onClick={() =>
                    selectionMode
                      ? toggleSelected("folder", folder.id)
                      : setSelectedKey(`folder:${folder.id}`)
                  }
                  onDoubleClick={() => !selectionMode && goToFolder(folder.id)}
                  className={cn(
                    "cursor-default border-b border-slate-50 last:border-0",
                    (selectionMode && isSelected("folder", folder.id)) ||
                      selectedKey === `folder:${folder.id}`
                      ? "bg-blue-50"
                      : "hover:bg-slate-50",
                  )}
                >
                  {selectionMode && (
                    <td className="px-3 py-2">
                      <SelectionCheck checked={isSelected("folder", folder.id)} />
                    </td>
                  )}
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
                const Icon = fileIcon(file);
                return (
                  <tr
                    key={file.id}
                    {...itemContextProps({ type: "file", file })}
                    onClick={() =>
                      selectionMode
                        ? toggleSelected("file", file.id)
                        : defaultOpen(file)
                    }
                    className={cn(
                      "cursor-default border-b border-slate-50 last:border-0",
                      (selectionMode && isSelected("file", file.id)) ||
                        selectedKey === `file:${file.id}`
                        ? "bg-blue-50"
                        : "hover:bg-slate-50",
                    )}
                  >
                    {selectionMode && (
                      <td className="px-3 py-2">
                        <SelectionCheck checked={isSelected("file", file.id)} />
                      </td>
                    )}
                    <td className="flex items-center gap-2 px-3 py-2 font-medium text-slate-700">
                      <Icon className="h-4 w-4 text-slate-400" />
                      {isPasswordProtected(file) && (
                        <Lock className="h-3.5 w-3.5 text-amber-500" />
                      )}
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

      <BDFileViewerModal
        file={viewerFile}
        onClose={() => setViewerFile(null)}
        onDownload={handleDownload}
      />

      <BDFileTargetFolderModal
        open={movingOpen}
        title="Move selection"
        description="Choose the destination folder."
        confirmLabel="Move here"
        folders={folderList}
        disabledFolderIds={moveDisabledFolderIds}
        onConfirm={handleBulkMove}
        onClose={() => setMovingOpen(false)}
      />

      <BDFileTargetFolderModal
        open={copyingOpen}
        title="Copy selection"
        description="Choose where to place the copies."
        confirmLabel="Copy here"
        folders={folderList}
        allowSameLocation
        onConfirm={handleBulkCopy}
        onClose={() => setCopyingOpen(false)}
      />

      <BDFilePasswordDialog
        open={passwordDialog !== null}
        mode={passwordDialog?.mode ?? "unlock"}
        fileName={passwordDialog?.file.name}
        error={passwordError}
        isLoading={passwordBusy}
        onSubmit={submitPassword}
        onClose={() => {
          setPasswordDialog(null);
          setPasswordError("");
        }}
      />

      <BDConfirmDialog
        open={bulkDeleting}
        title={`Delete ${selected.size} selected item(s)?`}
        description="Selected folders and all of their contents will be removed."
        confirmLabel="Delete selection"
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkDeleting(false)}
      />

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

function SelectionCheck({
  checked,
  className,
}: {
  checked: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-5 w-5 items-center justify-center rounded border transition-colors",
        checked
          ? "border-blue-500 bg-blue-500 text-white"
          : "border-slate-300 bg-white",
        className,
      )}
    >
      {checked ? (
        <Check className="h-3.5 w-3.5" />
      ) : (
        <Square className="h-3.5 w-3.5 text-transparent" />
      )}
    </span>
  );
}

export default BDFileManagerComponent;
