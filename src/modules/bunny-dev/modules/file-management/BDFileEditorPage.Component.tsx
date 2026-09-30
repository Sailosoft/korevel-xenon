"use client";

// BDFileEditorPage.Component — the dedicated file editor page.
//
// Opened from the file manager's "Open in editor" action. Owns the editing
// experience (Save / Download / Delete) and a Back action that returns to the
// file manager with the source folder and view restored.

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, FileWarning } from "lucide-react";
import type { BDProjectFile } from "../../BDDomain.Types";
import { useBDProjectContext } from "../core/BDProject.Context";
import { useBDFiles } from "./BDFile.Hooks";
import { bdFileRepository } from "./BDFile.Repository";
import BDFileEditorComponent from "./BDFileEditor.Component";
import BDButton from "../../components/BDButton";
import BDEmptyState from "../../components/BDEmptyState";
import { useBDToast } from "../../components/BDToast";
import { downloadBlob, downloadText } from "../../BDDownload";

export interface BDFileEditorPageComponentProps {
  fileId: string;
}

export function BDFileEditorPageComponent({
  fileId,
}: BDFileEditorPageComponentProps) {
  const { projectId } = useBDProjectContext();
  const { toast } = useBDToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const files = useBDFiles(projectId);
  const file = (files ?? []).find((f) => f.id === fileId);

  const paramsFolderId = searchParams.get("folder");
  const view = searchParams.get("view") === "list" ? "list" : "grid";

  const baseFilesPath = `/modules/bunny-dev/projects/${projectId}/files`;
  const backFolderId = file?.folderId ?? paramsFolderId ?? null;

  const backHref = useMemo(() => {
    const params = new URLSearchParams();
    if (backFolderId) params.set("folder", backFolderId);
    if (view === "list") params.set("view", "list");
    const qs = params.toString();
    return qs ? `${baseFilesPath}?${qs}` : baseFilesPath;
  }, [baseFilesPath, backFolderId, view]);

  const handleSave = async (next: BDProjectFile) => {
    await bdFileRepository.update(next.id, next);
    toast({ title: "File saved", status: "success" });
  };

  const handleDownload = (target: BDProjectFile) => {
    if (target.blob) downloadBlob(target.name, target.blob);
    else downloadText(target.name, target.content?.data ?? "");
  };

  const handleDelete = async (target: BDProjectFile) => {
    await bdFileRepository.delete(target.id);
    toast({ title: "File deleted", status: "success" });
    router.push(backHref);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <BDButton variant="ghost" size="sm" icon={ArrowLeft} onClick={() => router.push(backHref)}>
            File management
          </BDButton>
          <span className="truncate text-sm text-slate-400">
            {file?.path ?? "Editor"}
          </span>
        </div>
      </div>

      {file ? (
        <BDFileEditorComponent
          file={file}
          onSave={handleSave}
          onDelete={handleDelete}
          onDownload={handleDownload}
        />
      ) : files === undefined ? (
        <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
          Loading…
        </div>
      ) : (
        <BDEmptyState
          icon={FileWarning}
          title="File not found"
          description="This file may have been deleted or moved."
          action={
            <BDButton icon={ArrowLeft} onClick={() => router.push(backHref)}>
              Back to file management
            </BDButton>
          }
        />
      )}
    </div>
  );
}

export default BDFileEditorPageComponent;
