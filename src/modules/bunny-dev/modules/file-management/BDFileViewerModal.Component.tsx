"use client";

// BDFileViewerModal — full-size read-only preview for uploaded files.
//
// Picks a renderer by kind: inline <img>/<video>/<audio>, an <iframe> for PDFs
// and binary documents, a markdown view, or a read-only code editor for text.
// The object URL is created on open and revoked on close / file change.

import { useEffect, useMemo } from "react";
import { Download, FileWarning } from "lucide-react";
import type { BDProjectFile } from "../../BDDomain.Types";
import { BDProjectFileKind } from "../../BDDomain.Types";
import { formatSize, isPdfFile, isTextKind, languageFor } from "./BDFile.Types";
import BDModal from "../../components/BDModal";
import BDButton from "../../components/BDButton";
import BDMarkdownView from "../../components/BDMarkdownView";
import BDCodeEditor from "../../components/BDCodeEditor";

export interface BDFileViewerModalProps {
  file: BDProjectFile | null;
  onClose: () => void;
  onDownload: (file: BDProjectFile) => void;
}

export function BDFileViewerModal({
  file,
  onClose,
  onDownload,
}: BDFileViewerModalProps) {
  const objectUrl = useMemo(
    () => (file?.blob ? URL.createObjectURL(file.blob) : ""),
    [file],
  );

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  if (!file) return null;

  const isPdf = isPdfFile(file);
  const isImage = file.kind === BDProjectFileKind.image;
  const isVideo = file.kind === BDProjectFileKind.video;
  const isAudio = file.kind === BDProjectFileKind.audio;
  const isMarkdown = file.kind === BDProjectFileKind.markdown;
  const textData = file.content?.data ?? "";

  let body: React.ReactNode;
  if (isImage && objectUrl) {
    body = (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={objectUrl}
        alt={file.name}
        className="mx-auto max-h-full max-w-full rounded-lg object-contain"
      />
    );
  } else if (isVideo && objectUrl) {
    body = (
      <video
        src={objectUrl}
        controls
        className="mx-auto max-h-full max-w-full rounded-lg"
      />
    );
  } else if (isAudio && objectUrl) {
    body = (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <audio src={objectUrl} controls className="w-full max-w-xl" />
      </div>
    );
  } else if (isPdf && objectUrl) {
    body = (
      <iframe
        src={objectUrl}
        title={file.name}
        className="h-full min-h-[70vh] w-full rounded-lg border border-slate-200"
      />
    );
  } else if (isMarkdown) {
    body = (
      <div className="mx-auto max-w-3xl rounded-lg border border-slate-200 p-6">
        <BDMarkdownView content={textData} />
      </div>
    );
  } else if (isTextKind(file.kind) && file.content) {
    body = (
      <BDCodeEditor
        value={textData}
        language={languageFor(file.name)}
        readOnly
        height="70vh"
      />
    );
  } else {
    body = (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
        <FileWarning className="h-8 w-8" />
        <p className="text-sm">No inline preview for {file.kind} files.</p>
        <BDButton
          size="sm"
          variant="secondary"
          icon={Download}
          onClick={() => onDownload(file)}
        >
          Download file
        </BDButton>
      </div>
    );
  }

  return (
    <BDModal
      open
      onClose={onClose}
      title={file.name}
      description={`${file.kind} · ${formatSize(file.size)}`}
      size="full"
      bodyScroll={false}
      footer={
        <BDButton
          size="sm"
          variant="secondary"
          icon={Download}
          onClick={() => onDownload(file)}
        >
          Download
        </BDButton>
      }
    >
      <div className="flex h-full min-h-0 items-center justify-center">{body}</div>
    </BDModal>
  );
}

export default BDFileViewerModal;
