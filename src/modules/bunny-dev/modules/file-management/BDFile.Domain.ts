// BDFile.Domain.ts — Project File Management domain model (virtual file
// system: folders, files, content, versions).

import type { BDAppColor, BDEntity } from "../core/BDShared.Types";

export const BDProjectFileKind = {
  file: "file",
  image: "image",
  video: "video",
  audio: "audio",
  archive: "archive",
  document: "document",
  spreadsheet: "spreadsheet",
  presentation: "presentation",
  code: "code",
  markdown: "markdown",
  json: "json",
  binary: "binary",
  symlink: "symlink",
  other: "other",
} as const;
export type BDProjectFileKind = (typeof BDProjectFileKind)[keyof typeof BDProjectFileKind];

export const BDProjectFileEncoding = {
  utf8: "utf8",
  base64: "base64",
  hex: "hex",
  binary: "binary",
} as const;
export type BDProjectFileEncoding = (typeof BDProjectFileEncoding)[keyof typeof BDProjectFileEncoding];

export const BDProjectFileStatus = {
  draft: "draft",
  saved: "saved",
  modified: "modified",
  deleted: "deleted",
  archived: "archived",
} as const;
export type BDProjectFileStatus = (typeof BDProjectFileStatus)[keyof typeof BDProjectFileStatus];

export interface BDProjectFolder extends BDEntity {
  projectId: string;
  parentId?: string;
  name: string;
  path: string;
  description?: string;
  icon?: string;
  color?: BDAppColor;
  position: number;
  hidden?: boolean;
  locked?: boolean;
  virtual?: boolean;
  collapsed?: boolean;
}

export interface BDProjectFileContent {
  encoding: BDProjectFileEncoding;
  data: string;
  language?: string;
  lines?: number;
  checksum?: string;
  updatedAt: string;
}

export interface BDProjectFileVersion extends BDEntity {
  fileId: string;
  revision: number;
  message?: string;
  content: BDProjectFileContent;
  authorId?: string;
}

export interface BDProjectFile extends BDEntity {
  projectId: string;
  folderId?: string;
  name: string;
  path: string;
  extension?: string;
  kind: BDProjectFileKind;
  status: BDProjectFileStatus;
  description?: string;
  mime?: string;
  size: number;
  content?: BDProjectFileContent;
  /** Binary payload for uploaded files (Blob is structured-cloneable). */
  blob?: Blob;
  revision: number;
  binary?: boolean;
  readonly?: boolean;
  hidden?: boolean;
  locked?: boolean;
  virtual?: boolean;
  authorId?: string;
  updatedById?: string;
  accessedAt?: string;
  archivedAt?: string;
  /** Whether a password gate is applied to view/edit/download. */
  passwordProtected?: boolean;
  /** Salted SHA-256 hash of the gate password (obfuscation, not encryption). */
  passwordHash?: string;
  /** Per-file salt mixed into `passwordHash`. */
  passwordSalt?: string;
}
