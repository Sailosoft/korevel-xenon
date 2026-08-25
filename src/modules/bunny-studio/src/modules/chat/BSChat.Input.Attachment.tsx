// BSChat.Input.Attachment — Attachment logic + UI for the chat input.
//
// Separated from BSChat.Input.Hooks.ts (logic) and BSChat.Input.tsx (UI) so
// the main input stays a thin orchestrator. Provides:
//  - Attachment types + file helpers (image base64 URL, text file upload).
//  - useBSChatInputAttachments — owns the image/file state + handlers.
//  - BSChatInputAttachmentChips   — renders the attachment chips row.
//  - BSChatInputAttachmentButtons — renders the upload buttons + hidden inputs.

"use client";

import React, { useRef, useState } from "react";
import {
  ImagePlus,
  Paperclip,
  FileText,
  X,
  Loader2,
} from "lucide-react";
import { v7 as uuidv7 } from "uuid";
import type {
  BSChatAttachments,
  BSChatFileAttachment,
  BSChatImageAttachment,
} from "./BSChat.Types";

// ─── Types ─────────────────────────────────────────────────────────────

/** A single attached image in the input (base64 data URL, shown as thumbnail) */
export type BSChatInputImage = BSChatImageAttachment;

/** A single attached text file in the input (content is appended to prompt) */
export type BSChatInputFile = BSChatFileAttachment & {
  size: number;
};

/** Attachments collected in the input, passed to onSend on submit */
export interface BSChatInputAttachments extends BSChatAttachments {
  images: BSChatInputImage[];
  files: BSChatInputFile[];
}

// ─── Text file upload (feature: append file content to prompt) ────────

/** File extensions accepted by the text file upload */
export const TEXT_FILE_EXTENSIONS = [
  "md",
  "markdown",
  "mdx",
  "txt",
  "text",
  "js",
  "jsx",
  "ts",
  "tsx",
  "css",
  "scss",
  "sass",
  "less",
  "html",
  "htm",
  "xml",
  "json",
  "jsonc",
  "yaml",
  "yml",
  "toml",
  "ini",
  "env",
  "csv",
  "tsv",
  "py",
  "java",
  "c",
  "h",
  "cpp",
  "hpp",
  "cs",
  "go",
  "rs",
  "rb",
  "php",
  "sh",
  "bash",
  "zsh",
  "sql",
  "graphql",
  "prisma",
  "vue",
  "svelte",
  "astro",
  "conf",
  "cfg",
  "log",
] as const;

/** Extension-less filenames that are treated as text */
const TEXT_FILE_NAMES = [
  "dockerfile",
  "makefile",
  "gemfile",
  "procfile",
  ".gitignore",
  ".env",
  ".env.example",
  ".editorconfig",
  ".prettierrc",
  ".eslintrc",
];

/** Whether a dropped/picked file is allowed as a text attachment */
export function isAllowedTextFile(file: File): boolean {
  if (file.type && file.type.startsWith("text/")) return true;
  const name = file.name.toLowerCase();
  if (TEXT_FILE_NAMES.includes(name)) return true;
  const ext = name.includes(".") ? name.split(".").pop() ?? "" : name;
  return (TEXT_FILE_EXTENSIONS as readonly string[]).includes(ext);
}

// ─── Attachment helpers (image resize, text read) ──────────────────────

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () =>
      reject(reader.error ?? new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () =>
      reject(reader.error ?? new Error("Could not read file."));
    reader.readAsText(file);
  });
}

/**
 * Read an image and downscale it so the base64 payload stays small enough for
 * the multimodal chat request (feature: attach image).
 */
async function fileToResizedDataUrl(
  file: File,
  maxDim = 1024,
): Promise<string> {
  const dataUrl = await fileToDataUrl(file);
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Could not read image."));
    img.src = dataUrl;
  });
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

// ─── Hook ──────────────────────────────────────────────────────────────

export interface BSChatInputAttachmentsReturn {
  images: BSChatInputImage[];
  files: BSChatInputFile[];
  /** Add image files (uploaded or dropped) — base64 data URL included in chat */
  addImageFiles: (fileList: FileList | File[]) => void;
  /** Add text files (uploaded or dropped) — content is appended to the prompt */
  addTextFiles: (fileList: FileList | File[]) => void;
  removeImage: (id: string) => void;
  removeFile: (id: string) => void;
  clearAttachments: () => void;
  /** True when any image or text file is attached */
  hasAttachments: boolean;
}

/**
 * Owns the chat input attachments (base64 image URLs + text files). This keeps
 * the attachment state/processing isolated from the rest of the input logic.
 */
export function useBSChatInputAttachments(): BSChatInputAttachmentsReturn {
  const [images, setImages] = useState<BSChatInputImage[]>([]);
  const [files, setFiles] = useState<BSChatInputFile[]>([]);

  // Read an attached image and resize it so the base64 URL stays small enough
  // for the multimodal chat request.
  const processImageFile = (file: File) => {
    const id = uuidv7();
    setImages((prev) => [...prev, { id, name: file.name, dataUrl: "" }]);
    void (async () => {
      try {
        const dataUrl = await fileToResizedDataUrl(file, 1024);
        setImages((prev) =>
          prev.map((i) => (i.id === id ? { ...i, dataUrl } : i)),
        );
      } catch {
        // Unreadable image — drop the pending chip.
        setImages((prev) => prev.filter((i) => i.id !== id));
      }
    })();
  };

  const addImageFiles = (fileList: FileList | File[]) => {
    const arr = Array.from(fileList).filter((f) =>
      f.type.startsWith("image/"),
    );
    if (arr.length === 0) return;
    arr.forEach(processImageFile);
  };

  const processTextFile = (file: File) => {
    const id = uuidv7();
    void readFileAsText(file)
      .then((content) => {
        setFiles((prev) => [
          ...prev,
          { id, name: file.name, content, size: file.size },
        ]);
      })
      .catch(() => {
        /* ignore unreadable files */
      });
  };

  const addTextFiles = (fileList: FileList | File[]) => {
    const arr = Array.from(fileList).filter(isAllowedTextFile);
    if (arr.length === 0) return;
    arr.forEach(processTextFile);
  };

  const removeImage = (id: string) =>
    setImages((prev) => prev.filter((i) => i.id !== id));

  const removeFile = (id: string) =>
    setFiles((prev) => prev.filter((f) => f.id !== id));

  const clearAttachments = () => {
    setImages([]);
    setFiles([]);
  };

  return {
    images,
    files,
    addImageFiles,
    addTextFiles,
    removeImage,
    removeFile,
    clearAttachments,
    hasAttachments: images.length > 0 || files.length > 0,
  };
}

// ─── Chips row ─────────────────────────────────────────────────────────

export interface BSChatInputAttachmentChipsProps {
  images: BSChatInputImage[];
  files: BSChatInputFile[];
  onRemoveImage: (id: string) => void;
  onRemoveFile: (id: string) => void;
}

/** Renders the attached image thumbnails + text file chips above the footer. */
export function BSChatInputAttachmentChips({
  images,
  files,
  onRemoveImage,
  onRemoveFile,
}: BSChatInputAttachmentChipsProps) {
  if (images.length === 0 && files.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 px-3 pb-1">
      {images.map((img) => (
        <div
          key={img.id}
          title={img.name}
          className="flex items-center gap-2 bg-gray-100 rounded-xl p-1 pr-1.5 border border-gray-200"
        >
          <div className="w-9 h-9 rounded-lg overflow-hidden bg-white border border-gray-200 flex items-center justify-center shrink-0">
            {img.dataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={img.dataUrl}
                alt={img.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
            )}
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-medium text-gray-700 truncate max-w-[130px]">
              {img.name}
            </div>
            <div className="text-[10px] text-gray-400">
              sent to chat as image
            </div>
          </div>
          <button
            onClick={() => onRemoveImage(img.id)}
            title="Remove image"
            className="flex items-center justify-center w-5 h-5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}

      {files.map((f) => (
        <div
          key={f.id}
          className="flex items-center gap-2 bg-gray-100 rounded-xl py-1 pl-1.5 pr-1 border border-gray-200"
        >
          <FileText className="w-4 h-4 text-blue-500 shrink-0" />
          <div className="min-w-0">
            <div className="text-[11px] font-medium text-gray-700 truncate max-w-[130px]">
              {f.name}
            </div>
            <div className="text-[10px] text-gray-400">
              {(f.size / 1024).toFixed(1)} KB · appended to prompt
            </div>
          </div>
          <button
            onClick={() => onRemoveFile(f.id)}
            title="Remove file"
            className="flex items-center justify-center w-5 h-5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Upload buttons ────────────────────────────────────────────────────

export interface BSChatInputAttachmentButtonsProps {
  disabled?: boolean;
  onAddImages: (fileList: FileList | File[]) => void;
  onAddTextFiles: (fileList: FileList | File[]) => void;
}

/** Renders the image + text file upload buttons (and their hidden inputs). */
export function BSChatInputAttachmentButtons({
  disabled = false,
  onAddImages,
  onAddTextFiles,
}: BSChatInputAttachmentButtonsProps) {
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="flex items-center gap-1 shrink-0">
      <button
        onClick={() => imageInputRef.current?.click()}
        disabled={disabled}
        title="Upload image"
        aria-label="Upload image"
        className="flex items-center justify-center w-9 h-9 sm:w-8 sm:h-8 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition disabled:opacity-40 disabled:pointer-events-none"
      >
        <ImagePlus className="w-4 h-4" />
      </button>
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled}
        title="Upload text file (md, txt, js, ts, css, html…)"
        aria-label="Upload text file"
        className="flex items-center justify-center w-9 h-9 sm:w-8 sm:h-8 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition disabled:opacity-40 disabled:pointer-events-none"
      >
        <Paperclip className="w-4 h-4" />
      </button>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) onAddImages(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) onAddTextFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export default BSChatInputAttachmentButtons;
