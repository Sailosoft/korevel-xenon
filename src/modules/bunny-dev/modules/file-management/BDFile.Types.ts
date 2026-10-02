// BDFile.Types.ts — virtual file system helpers: kind detection, language
// mapping, path building, and record factories.

import CryptoJS from "crypto-js";
import { v7 as uuidv7 } from "uuid";
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
  mime?: string,
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
    mime: mime || undefined,
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

// ── Kind helpers ────────────────────────────────────────────────────────────

export function isPdfFile(file: Pick<BDProjectFile, "name" | "mime">): boolean {
  return file.mime === "application/pdf" || extensionOf(file.name) === "pdf";
}

export function isMediaKind(kind: BDProjectFileKind): boolean {
  return kind === Kind.image || kind === Kind.video || kind === Kind.audio;
}

const BINARY_DOCUMENT_EXTENSIONS = new Set(["doc", "docx", "rtf", "odt"]);

/**
 * Decide whether an uploaded file should be read as UTF-8 text or kept as a
 * binary blob. The extension decides first (so code files keep working even
 * though browsers report `.ts` as `video/mp2t`); MIME only downgrades files
 * whose extension is unknown or maps to the text-ish `document` kind.
 */
export function isTextUpload(name: string, mime?: string): boolean {
  const kind = detectKind(name);
  if (!isTextKind(kind)) return false;
  if (isPdfFile({ name, mime })) return false;
  if (BINARY_DOCUMENT_EXTENSIONS.has(extensionOf(name))) return false;
  if (
    kind === Kind.other &&
    mime &&
    !mime.startsWith("text/") &&
    !/(json|xml|yaml|javascript|x-sh)/i.test(mime)
  ) {
    return false;
  }
  return true;
}

// ── Password gate helpers ───────────────────────────────────────────────────
//
// Salted SHA-256 comparison only. This gates the UI; it is NOT encryption and
// the file contents remain readable from IndexedDB devtools. Treat it as
// obfuscation (same caveat as BSCrypto.Library.ts), never as a security boundary.

export function isPasswordProtected(file: BDProjectFile): boolean {
  return !!file.passwordProtected && !!file.passwordHash;
}

export function makeSalt(): string {
  const bytes = new Uint8Array(16);
  const webCrypto = globalThis.crypto;
  if (webCrypto && typeof webCrypto.getRandomValues === "function") {
    webCrypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function hashPassword(password: string, salt: string): string {
  return CryptoJS.SHA256(`${salt}${password}`).toString();
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function verifyPassword(file: BDProjectFile, password: string): boolean {
  if (!isPasswordProtected(file)) return false;
  const candidate = hashPassword(password, file.passwordSalt ?? "");
  return timingSafeEqual(candidate, file.passwordHash ?? "");
}

// ── Naming helpers ──────────────────────────────────────────────────────────

/** Insert a `(copy)` marker before the extension. */
export function copyName(name: string): string {
  const dot = name.lastIndexOf(".");
  const hasExt = dot > 0;
  const base = hasExt ? name.slice(0, dot) : name;
  const ext = hasExt ? name.slice(dot) : "";
  return `${base} (copy)${ext}`;
}

/** Deduplicate a proposed name, escalating `(copy)` to `(copy 2)`, `(copy 3)`… */
export function uniqueName(existing: string[], name: string): string {
  const taken = (candidate: string) =>
    existing.some((value) => value.toLowerCase() === candidate.toLowerCase());
  if (!taken(name)) return name;
  const dot = name.lastIndexOf(".");
  const hasExt = dot > 0;
  const base = hasExt ? name.slice(0, dot) : name;
  const ext = hasExt ? name.slice(dot) : "";
  const stem = base.replace(/ \(copy(?: \d+)?\)$/i, "");
  let index = 2;
  while (taken(`${stem} (copy ${index})${ext}`)) index += 1;
  return `${stem} (copy ${index})${ext}`;
}

// ── Folder tree helpers ─────────────────────────────────────────────────────

/** Every descendant folder id below `folderId` (exclusive). */
export function collectDescendantFolderIds(
  folderId: string,
  folders: BDProjectFolder[],
): Set<string> {
  const result = new Set<string>();
  const queue: string[] = [folderId];
  while (queue.length) {
    const current = queue.shift() as string;
    for (const child of folders) {
      if ((child.parentId ?? null) === current && !result.has(child.id)) {
        result.add(child.id);
        queue.push(child.id);
      }
    }
  }
  return result;
}

/** True when `folderId` is `ancestorId` or lives anywhere beneath it. */
export function isFolderWithin(
  folderId: string,
  ancestorId: string,
  folders: BDProjectFolder[],
): boolean {
  if (folderId === ancestorId) return true;
  const seen = new Set<string>();
  let current = folders.find((folder) => folder.id === folderId);
  while (current?.parentId && !seen.has(current.id)) {
    seen.add(current.id);
    if (current.parentId === ancestorId) return true;
    current = folders.find((folder) => folder.id === current?.parentId);
  }
  return false;
}

/** Drop folder ids that are descendants of another selected folder. */
export function topLevelFolderIds(
  folderIds: string[],
  folders: BDProjectFolder[],
): string[] {
  return folderIds.filter(
    (id) =>
      !folderIds.some(
        (other) => other !== id && isFolderWithin(id, other, folders),
      ),
  );
}

/** Every file contained in the given folders, descendants included. */
export function collectFilesInFolders(
  folderIds: string[],
  folders: BDProjectFolder[],
  files: BDProjectFile[],
): BDProjectFile[] {
  const scope = new Set<string>(folderIds);
  for (const id of folderIds) {
    for (const descendant of collectDescendantFolderIds(id, folders)) {
      scope.add(descendant);
    }
  }
  return files.filter((file) => !!file.folderId && scope.has(file.folderId));
}

// ── Bulk move / copy plans ──────────────────────────────────────────────────

export interface BDMovePlanResult {
  folders: BDProjectFolder[];
  files: BDProjectFile[];
  error?: string;
}

export function planMove(
  selectedFolderIds: string[],
  selectedFileIds: string[],
  targetFolderId: string | null,
  folders: BDProjectFolder[],
  files: BDProjectFile[],
): BDMovePlanResult {
  const topFolders = topLevelFolderIds(selectedFolderIds, folders);
  if (
    targetFolderId &&
    topFolders.some((id) => isFolderWithin(targetFolderId, id, folders))
  ) {
    return {
      folders,
      files,
      error: "Cannot move a folder into itself or one of its subfolders.",
    };
  }

  const targetPath = targetFolderId
    ? folders.find((folder) => folder.id === targetFolderId)?.path ?? "/"
    : "/";
  const targetParentId = targetFolderId ?? undefined;

  const folderPaths = new Map<string, string>();
  for (const id of topFolders) {
    const source = folders.find((folder) => folder.id === id);
    if (!source) continue;
    const nextPath = buildPath(targetPath, source.name);
    folderPaths.set(id, nextPath);
    for (const descendantId of collectDescendantFolderIds(id, folders)) {
      const descendant = folders.find((folder) => folder.id === descendantId);
      if (!descendant) continue;
      folderPaths.set(
        descendantId,
        replacePathPrefix(descendant.path, source.path, nextPath),
      );
    }
  }

  const selectedFiles = new Set(selectedFileIds);
  const fileMoves = new Map<string, { folderId?: string; path: string }>();
  for (const file of files) {
    const insideMoved = !!file.folderId && folderPaths.has(file.folderId);
    let path = file.path;
    let folderId = file.folderId;
    for (const id of topFolders) {
      const source = folders.find((folder) => folder.id === id);
      const nextPath = folderPaths.get(id);
      if (!source || nextPath === undefined) continue;
      path = replacePathPrefix(path, source.path, nextPath);
    }
    if (selectedFiles.has(file.id) && !insideMoved) {
      path = buildPath(targetPath, file.name);
      folderId = targetParentId;
    }
    if (path !== file.path || folderId !== file.folderId) {
      fileMoves.set(file.id, { folderId, path });
    }
  }

  return {
    folders: folders.map((folder) => {
      const nextPath = folderPaths.get(folder.id);
      if (nextPath === undefined) return folder;
      if (topFolders.includes(folder.id)) {
        return { ...folder, path: nextPath, parentId: targetParentId };
      }
      return { ...folder, path: nextPath };
    }),
    files: files.map((file) => {
      const move = fileMoves.get(file.id);
      return move
        ? { ...file, path: move.path, folderId: move.folderId }
        : file;
    }),
  };
}

export type BDCopyTarget =
  | { mode: "same" }
  | { mode: "folder"; folderId: string | null };

export interface BDCopyPlanResult {
  folders: BDProjectFolder[];
  files: BDProjectFile[];
}

export function planCopy(
  selectedFolderIds: string[],
  selectedFileIds: string[],
  target: BDCopyTarget,
  folders: BDProjectFolder[],
  files: BDProjectFile[],
): BDCopyPlanResult {
  const now = new Date().toISOString();
  const newFolders: BDProjectFolder[] = [];
  const newFiles: BDProjectFile[] = [];

  const pathById = new Map<string, string>();
  for (const folder of folders) pathById.set(folder.id, folder.path);
  const pathFor = (parentId: string | null) =>
    parentId ? pathById.get(parentId) ?? "/" : "/";

  const namesByParent = new Map<string, string[]>();
  const namesFor = (parentId: string | null) => {
    const key = parentId ?? "__root__";
    let list = namesByParent.get(key);
    if (!list) {
      list = [
        ...folders
          .filter((folder) => (folder.parentId ?? null) === parentId)
          .map((folder) => folder.name),
        ...files
          .filter((file) => (file.folderId ?? null) === parentId)
          .map((file) => file.name),
      ];
      namesByParent.set(key, list);
    }
    return list;
  };
  const claim = (parentId: string | null, name: string) => {
    const list = namesFor(parentId);
    const unique = uniqueName(list, name);
    list.push(unique);
    return unique;
  };

  const copyFolder = (
    sourceId: string,
    newParentId: string | null,
    isRootCopy: boolean,
  ) => {
    const source = folders.find((folder) => folder.id === sourceId);
    if (!source) return;
    const name = claim(
      newParentId,
      isRootCopy ? copyName(source.name) : source.name,
    );
    const id = uuidv7();
    const path = buildPath(pathFor(newParentId), name);
    pathById.set(id, path);
    newFolders.push({
      ...source,
      id,
      parentId: newParentId ?? undefined,
      name,
      path,
      createdAt: now,
      updatedAt: now,
    });
    for (const child of folders.filter(
      (folder) => (folder.parentId ?? null) === sourceId,
    )) {
      copyFolder(child.id, id, false);
    }
    for (const childFile of files.filter(
      (file) => (file.folderId ?? null) === sourceId,
    )) {
      const fileName = claim(id, childFile.name);
      newFiles.push({
        ...childFile,
        id: uuidv7(),
        folderId: id,
        name: fileName,
        path: buildPath(pathById.get(id) ?? "/", fileName),
        createdAt: now,
        updatedAt: now,
      });
    }
  };

  const resolveTarget = (originalParentId: string | null) =>
    target.mode === "folder" ? target.folderId : originalParentId;

  for (const id of topLevelFolderIds(selectedFolderIds, folders)) {
    const source = folders.find((folder) => folder.id === id);
    if (!source) continue;
    copyFolder(id, resolveTarget(source.parentId ?? null), true);
  }
  for (const id of selectedFileIds) {
    const source = files.find((file) => file.id === id);
    if (!source) continue;
    const parentId = resolveTarget(source.folderId ?? null);
    const name = claim(parentId, copyName(source.name));
    newFiles.push({
      ...source,
      id: uuidv7(),
      folderId: parentId ?? undefined,
      name,
      path: buildPath(pathFor(parentId), name),
      createdAt: now,
      updatedAt: now,
    });
  }

  return {
    folders: [...folders, ...newFolders],
    files: [...files, ...newFiles],
  };
}
