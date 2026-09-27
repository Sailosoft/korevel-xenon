"use client";

import { useRef, useState } from "react";
import {
  FolderTree,
  FolderPlus,
  FilePlus2,
  Upload,
  Search,
} from "lucide-react";
import type { BDProjectFile, BDProjectFolder } from "../../BDDomain.Types";
import { BDProjectFileEncoding } from "../../BDDomain.Types";
import { useBDProjectContext } from "../core/BDProject.Context";
import { useBDFiles, useBDFolders } from "./BDFile.Hooks";
import { bdFileRepository, bdFolderRepository } from "./BDFile.Repository";
import {
  createFolder,
  createTextFile,
  createUploadedFile,
  detectKind,
  isTextKind,
} from "./BDFile.Types";
import BDFileTreeComponent from "./BDFileTree.Component";
import BDFileEditorComponent from "./BDFileEditor.Component";
import BDPageHeader from "../../components/BDPageHeader";
import BDButton from "../../components/BDButton";
import BDModal from "../../components/BDModal";
import BDEmptyState from "../../components/BDEmptyState";
import BDConfirmDialog from "../../components/BDConfirmDialog";
import { useBDToast } from "../../components/BDToast";
import { downloadBlob, downloadText } from "../../BDDownload";

type PromptState =
  | { kind: "folder"; parentId: string | null }
  | { kind: "file"; folderId: string | null }
  | null;

export function BDFileBuilderComponent() {
  const { projectId } = useBDProjectContext();
  const { toast } = useBDToast();
  const folders = useBDFolders(projectId);
  const files = useBDFiles(projectId);
  const uploadRef = useRef<HTMLInputElement>(null);

  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [prompt, setPrompt] = useState<PromptState>(null);
  const [promptValue, setPromptValue] = useState("");
  const [deletingFile, setDeletingFile] = useState<BDProjectFile | null>(null);
  const [deletingFolder, setDeletingFolder] = useState<BDProjectFolder | null>(
    null,
  );
  const [query, setQuery] = useState("");

  const selectedFile = (files ?? []).find((f) => f.id === selectedId);
  const filteredFiles = query.trim()
    ? (files ?? []).filter((f) =>
        f.name.toLowerCase().includes(query.toLowerCase()),
      )
    : files ?? [];

  const parentPathOfFolder = (folderId: string | null) =>
    (folders ?? []).find((f) => f.id === folderId)?.path ?? "/";

  const submitPrompt = async () => {
    const name = promptValue.trim();
    if (!name || !prompt) return;
    if (prompt.kind === "folder") {
      await bdFolderRepository.create(
        createFolder(
          projectId,
          prompt.parentId,
          name,
          parentPathOfFolder(prompt.parentId),
        ),
      );
      toast({ title: "Folder created", status: "success" });
    } else {
      const created = await bdFileRepository.create(
        createTextFile(
          projectId,
          prompt.folderId,
          name,
          parentPathOfFolder(prompt.folderId),
        ),
      );
      setSelectedId(created.id);
      toast({ title: "File created", status: "success" });
    }
    setPrompt(null);
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

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList) return;
    for (const file of Array.from(fileList)) {
      const { content, blob } = await readUpload(file);
      await bdFileRepository.create(
        createUploadedFile(
          projectId,
          null,
          file.name,
          "/",
          file.size,
          content,
          blob,
        ),
      );
    }
    toast({ title: "Upload complete", status: "success" });
  };

  const handleSave = async (file: BDProjectFile) => {
    await bdFileRepository.update(file.id, file);
    toast({ title: "File saved", status: "success" });
  };

  const handleDeleteFile = async () => {
    if (!deletingFile) return;
    await bdFileRepository.delete(deletingFile.id);
    if (selectedId === deletingFile.id) setSelectedId(undefined);
    setDeletingFile(null);
    toast({ title: "File deleted", status: "success" });
  };

  const handleDeleteFolder = async () => {
    if (!deletingFolder) return;
    await bdFolderRepository.delete(deletingFolder.id);
    setDeletingFolder(null);
    toast({ title: "Folder deleted", status: "success" });
  };

  const handleDownload = (file: BDProjectFile) => {
    if (file.blob) downloadBlob(file.name, file.blob);
    else downloadText(file.name, file.content?.data ?? "");
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
      <BDPageHeader
        icon={FolderTree}
        title="File Management"
        description="A virtual project file system stored in Dexie — create folders, upload files, edit text, download, and delete."
        actions={
          <>
            <BDButton
              variant="secondary"
              icon={FolderPlus}
              onClick={() => setPrompt({ kind: "folder", parentId: null })}
            >
              New folder
            </BDButton>
            <BDButton
              variant="secondary"
              icon={FilePlus2}
              onClick={() => setPrompt({ kind: "file", folderId: null })}
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
              onChange={(e) => {
                void handleUpload(e.target.files);
                e.target.value = "";
              }}
            />
          </>
        }
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[20rem_1fr]">
        <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search files…"
              className="w-full rounded-lg border border-slate-200 py-1.5 pl-8 pr-3 text-sm outline-none focus:border-blue-400"
            />
          </div>
          {(folders && folders.length > 0) || (files && files.length > 0) ? (
            <BDFileTreeComponent
              folders={folders ?? []}
              files={filteredFiles}
              selectedFileId={selectedId}
              onSelectFile={(file) => setSelectedId(file.id)}
              onAddFolder={(parentId) => setPrompt({ kind: "folder", parentId })}
              onAddFile={(folderId) => setPrompt({ kind: "file", folderId })}
              onDeleteFolder={(folder) => setDeletingFolder(folder)}
              onDeleteFile={(file) => setDeletingFile(file)}
            />
          ) : (
            <p className="p-3 text-xs text-slate-400">
              No files yet. Create or upload one.
            </p>
          )}
        </div>

        <div className="flex min-h-0 flex-col">
          {selectedFile ? (
            <BDFileEditorComponent
              file={selectedFile}
              onSave={handleSave}
              onDelete={setDeletingFile}
              onDownload={handleDownload}
            />
          ) : (
            <BDEmptyState
              icon={FolderTree}
              title="Select a file"
              description="Pick a file from the tree to view or edit it."
            />
          )}
        </div>
      </div>

      <BDModal
        open={prompt !== null}
        onClose={() => setPrompt(null)}
        title={
          prompt?.kind === "folder" ? "New folder" : "New file"
        }
        size="sm"
        footer={
          <>
            <BDButton variant="ghost" onClick={() => setPrompt(null)}>
              Cancel
            </BDButton>
            <BDButton onClick={submitPrompt}>Create</BDButton>
          </>
        }
      >
        <input
          autoFocus
          value={promptValue}
          onChange={(e) => setPromptValue(e.target.value)}
          placeholder={
            prompt?.kind === "folder" ? "Folder name" : "filename.md"
          }
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
          onKeyDown={(e) => {
            if (e.key === "Enter") void submitPrompt();
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

export default BDFileBuilderComponent;
