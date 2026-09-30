// BDFile.Types.ts — virtual file system helpers: kind detection, language
// mapping, path building, and record factories.

import type {
  BDProjectFile,
  BDProjectFileKind,
  BDProjectFolder,
} from "./BDFile.Domain";
import {
  BDProjectFileEncoding,
  BDProjectFileKind as Kind,
  BDProjectFileStatus as Status,
} from "./BDFile.Domain";

export const BD_CODE_LANGUAGES = [
  "javascript",
  "typescript",
  "json",
  "yaml",
  "css",
  "text",
] as const;

export type BDCodeLanguage = (typeof BD_CODE_LANGUAGES)[number];

const EXTENSION_KIND: Record<string, BDProjectFileKind> = {
  ts: Kind.code,
  tsx: Kind.code,
  js: Kind.code,
  jsx: Kind.code,
  php: Kind.code,
  py: Kind.code,
  rb: Kind.code,
  go: Kind.code,
  rs: Kind.code,
  java: Kind.code,
  cs: Kind.code,
  html: Kind.code,
  css: Kind.code,
  scss: Kind.code,
  sql: Kind.code,
  md: Kind.markdown,
  mdx: Kind.markdown,
  json: Kind.json,
  yml: Kind.other,
  yaml: Kind.other,
  txt: Kind.document,
  csv: Kind.spreadsheet,
  xls: Kind.spreadsheet,
  xlsx: Kind.spreadsheet,
  doc: Kind.document,
  docx: Kind.document,
  pdf: Kind.document,
  png: Kind.image,
  jpg: Kind.image,
  jpeg: Kind.image,
  gif: Kind.image,
  svg: Kind.image,
  webp: Kind.image,
  mp4: Kind.video,
  mov: Kind.video,
  webm: Kind.video,
  mp3: Kind.audio,
  wav: Kind.audio,
  ogg: Kind.audio,
  zip: Kind.archive,
  rar: Kind.archive,
  gz: Kind.archive,
  tar: Kind.archive,
};

export function extensionOf(name: string): string {
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index + 1).toLowerCase() : "";
}

export function detectKind(name: string): BDProjectFileKind {
  return EXTENSION_KIND[extensionOf(name)] ?? Kind.other;
}

const TEXT_KINDS: BDProjectFileKind[] = [
  Kind.code,
  Kind.markdown,
  Kind.json,
  Kind.document,
  Kind.other,
];

export function isTextKind(kind: BDProjectFileKind): boolean {
  return TEXT_KINDS.includes(kind);
}

export function languageFor(name: string): BDCodeLanguage {
  const ext = extensionOf(name);
  switch (ext) {
    case "ts":
    case "tsx":
      return "typescript";
    case "js":
    case "jsx":
      return "javascript";
    case "json":
      return "json";
    case "yml":
    case "yaml":
      return "yaml";
    case "css":
    case "scss":
      return "css";
    default:
      return "text";
  }
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function buildPath(parentPath: string, name: string): string {
  const base = parentPath && parentPath !== "/" ? parentPath.replace(/\/$/, "") : "";
  return `${base}/${name}`;
}

/** Ancestor chain for a folder, ordered root → the folder itself. */
export function breadcrumbOf(
  folderId: string | null,
  folders: BDProjectFolder[],
): BDProjectFolder[] {
  if (!folderId) return [];
  const chain: BDProjectFolder[] = [];
  const seen = new Set<string>();
  let current = folders.find((folder) => folder.id === folderId);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    chain.unshift(current);
    current = current.parentId
      ? folders.find((folder) => folder.id === current?.parentId)
      : undefined;
  }
  return chain;
}

/** Rewrite a path that equals or lives under `oldPrefix`. */
export function replacePathPrefix(
  path: string,
  oldPrefix: string,
  newPrefix: string,
): string {
  const from = oldPrefix.replace(/\/$/, "");
  const to = newPrefix.replace(/\/$/, "");
  if (path === from) return to;
  if (from && path.startsWith(`${from}/`)) return `${to}${path.slice(from.length)}`;
  return path;
}

/** Case-insensitive duplicate-name check for a sibling list. */
export function nameTaken(names: string[], name: string): boolean {
  const target = name.trim().toLowerCase();
  return names.some((existing) => existing.toLowerCase() === target);
}

/** Build the patch that renames a file in place under the same parent. */
export function applyRenameFile(
  file: BDProjectFile,
  nextName: string,
  parentPath: string,
): Partial<BDProjectFile> {
  const name = nextName.trim();
  const patch: Partial<BDProjectFile> = {
    name,
    extension: extensionOf(name),
    kind: detectKind(name),
    path: buildPath(parentPath, name),
  };
  if (file.content) {
    patch.content = {
      ...file.content,
      language: languageFor(name),
      updatedAt: new Date().toISOString(),
    };
  }
  return patch;
}

/** Rewrite a folder and every descendant folder/file path during a rename. */
export function applyRenameFolder(
  folders: BDProjectFolder[],
  files: BDProjectFile[],
  folderId: string,
  nextName: string,
  parentPath: string,
): { folders: BDProjectFolder[]; files: BDProjectFile[] } {
  const target = folders.find((folder) => folder.id === folderId);
  if (!target) return { folders, files };
  const name = nextName.trim();
  const oldPrefix = target.path;
  const newPrefix = buildPath(parentPath, name);
  return {
    folders: folders.map((folder) => {
      if (folder.id === folderId) {
        return { ...folder, name, path: newPrefix };
      }
      const path = replacePathPrefix(folder.path, oldPrefix, newPrefix);
      return path === folder.path ? folder : { ...folder, path };
    }),
    files: files.map((file) => {
      const path = replacePathPrefix(file.path, oldPrefix, newPrefix);
      return path === file.path ? file : { ...file, path };
    }),
  };
}

export function createFolder(
  projectId: string,
  parentId: string | null,
  name: string,
  parentPath: string,
  position = 0,
): Omit<BDProjectFolder, "id"> {
  return {
    projectId,
    parentId: parentId ?? undefined,
    name,
    path: buildPath(parentPath, name),
    position,
  };
}

export function createTextFile(
  projectId: string,
  folderId: string | null,
  name: string,
  parentPath: string,
): Omit<BDProjectFile, "id"> {
  const now = new Date().toISOString();
  const kind = detectKind(name);
  return {
    projectId,
    folderId: folderId ?? undefined,
    name,
    path: buildPath(parentPath, name),
    extension: extensionOf(name),
    kind,
    status: Status.draft,
    size: 0,
    content: {
      encoding: BDProjectFileEncoding.utf8,
      data: "",
      language: languageFor(name),
      updatedAt: now,
    },
    revision: 1,
    binary: false,
  };
}

export function createUploadedFile(
  projectId: string,
  folderId: string | null,
  name: string,
  parentPath: string,
  size: number,
  content?: { data: string; encoding: BDProjectFileEncoding },
  blob?: Blob,
): Omit<BDProjectFile, "id"> {
  const now = new Date().toISOString();
  const kind = detectKind(name);
  return {
    projectId,
    folderId: folderId ?? undefined,
    name,
    path: buildPath(parentPath, name),
    extension: extensionOf(name),
    kind,
    status: Status.saved,
    size,
    content: content
      ? {
          encoding: content.encoding,
          data: content.data,
          language: languageFor(name),
          updatedAt: now,
        }
      : undefined,
    blob,
    revision: 1,
    binary: !!blob,
  };
}
