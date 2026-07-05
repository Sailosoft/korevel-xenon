// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — Handle Registry
// In-memory registry for FileSystemDirectoryHandle instances that persist
// across client-side navigation (landing → studio) without going through
// IndexedDB serialization, which can lose or alter handle identity.
// ───────────────────────────────────────────────────────────────────────────────

const handleRegistry = new Map<string, FileSystemDirectoryHandle>();

/**
 * Store a directory handle for a project in the in-memory registry.
 * This ensures the exact handle from `directoryOpen()` is used when
 * the studio page loads, bypassing IndexedDB structured-clone issues.
 */
export function registerHandle(
  projectId: string,
  handle: FileSystemDirectoryHandle,
): void {
  handleRegistry.set(projectId, handle);
}

/**
 * Retrieve a previously registered directory handle.
 * Returns `undefined` if no handle was registered (e.g., page was hard-refreshed),
 * in which case the caller should fall back to the Dexie-cached handle.
 */
export function getHandle(
  projectId: string,
): FileSystemDirectoryHandle | undefined {
  return handleRegistry.get(projectId);
}

/**
 * Remove a handle from the registry once the studio has consumed it.
 */
export function removeHandle(projectId: string): void {
  handleRegistry.delete(projectId);
}

/**
 * Check if a handle exists in the registry.
 */
export function hasHandle(projectId: string): boolean {
  return handleRegistry.has(projectId);
}
