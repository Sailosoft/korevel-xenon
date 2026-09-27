"use client";

import { useEffect, useMemo, useState } from "react";
import { Save, Download, Trash2, FileWarning } from "lucide-react";
import type { BDProjectFile } from "../../BDDomain.Types";
import { BDProjectFileEncoding, BDProjectFileKind } from "../../BDDomain.Types";
import { formatSize, isTextKind, languageFor } from "./BDFile.Types";
import BDCodeEditor from "../../components/BDCodeEditor";
import BDWysiwygEditor from "../../components/BDWysiwygEditor";
import BDButton from "../../components/BDButton";
import BDBadge from "../../components/BDBadge";

export interface BDFileEditorComponentProps {
  file: BDProjectFile;
  onSave: (file: BDProjectFile) => void;
  onDelete: (file: BDProjectFile) => void;
  onDownload: (file: BDProjectFile) => void;
}

export function BDFileEditorComponent({
  file,
  onSave,
  onDelete,
  onDownload,
}: BDFileEditorComponentProps) {
  const [data, setData] = useState(file.content?.data ?? "");

  // Reset local content when a different file is opened.
  const [prevId, setPrevId] = useState(file.id);
  if (file.id !== prevId) {
    setPrevId(file.id);
    setData(file.content?.data ?? "");
  }

  const objectUrl = useMemo(
    () => (file.blob ? URL.createObjectURL(file.blob) : ""),
    [file.blob],
  );

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  const isMarkdown = file.kind === BDProjectFileKind.markdown;
  const isImage = file.kind === BDProjectFileKind.image;
  const canEdit = isTextKind(file.kind);

  const handleSave = () => {
    onSave({
      ...file,
      content: {
        encoding: BDProjectFileEncoding.utf8,
        data,
        language: languageFor(file.name),
        updatedAt: new Date().toISOString(),
      },
      size: data.length,
      status: "saved",
      revision: file.revision + 1,
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-800">
            {file.name}
          </span>
          <BDBadge>{file.kind}</BDBadge>
          <span className="text-xs text-slate-400">{formatSize(file.size)}</span>
          <span className="text-xs text-slate-300">rev {file.revision}</span>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <BDButton size="sm" icon={Save} onClick={handleSave}>
              Save
            </BDButton>
          )}
          <BDButton
            size="sm"
            variant="secondary"
            icon={Download}
            onClick={() => onDownload(file)}
          >
            Download
          </BDButton>
          <BDButton
            size="sm"
            variant="danger"
            icon={Trash2}
            onClick={() => onDelete(file)}
          >
            Delete
          </BDButton>
        </div>
      </div>

      <div className="min-h-[320px] flex-1 rounded-xl border border-slate-200 bg-white p-3">
        {isMarkdown ? (
          <BDWysiwygEditor
            value={data}
            onChange={setData}
            placeholder="Write markdown…"
          />
        ) : isImage ? (
          objectUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={objectUrl}
              alt={file.name}
              className="mx-auto max-h-[60vh] rounded-lg"
            />
          ) : (
            <p className="p-6 text-center text-sm text-slate-400">
              No image data.
            </p>
          )
        ) : canEdit ? (
          <BDCodeEditor
            value={data}
            onChange={setData}
            language={languageFor(file.name)}
            height={420}
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400">
            <FileWarning className="h-6 w-6" />
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
        )}
      </div>
    </div>
  );
}

export default BDFileEditorComponent;
