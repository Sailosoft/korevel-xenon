"use client";

// BDFile.Lock.ts — in-memory session unlock state for password-protected files.
//
// Unlocks live for the browser session only and are never persisted: a locked
// file can be viewed/edited/downloaded after its password is entered once, and
// a reload re-locks it. Hijacking this set from devtools is possible, which
// matches the "obfuscation, not security" caveat on the password hash.

import { useSyncExternalStore } from "react";
import type { BDProjectFile } from "./BDFile.Domain";

const unlockedFileIds = new Set<string>();
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isFileUnlocked(id: string | null | undefined): boolean {
  return !!id && unlockedFileIds.has(id);
}

export function markFileUnlocked(id: string): void {
  if (unlockedFileIds.has(id)) return;
  unlockedFileIds.add(id);
  emit();
}

export function forgetFileUnlocked(id: string): void {
  if (unlockedFileIds.delete(id)) emit();
}

/** A file is locked when it carries a password hash and is not yet unlocked. */
export function isFileLocked(
  file: Pick<BDProjectFile, "id" | "passwordProtected" | "passwordHash"> | null | undefined,
): boolean {
  return !!file && !!file.passwordProtected && !!file.passwordHash && !isFileUnlocked(file.id);
}

/** Reactive session-unlock flag for a single file id. */
export function useFileUnlocked(id: string | null | undefined): boolean {
  return useSyncExternalStore(
    subscribe,
    () => isFileUnlocked(id),
    () => false,
  );
}
