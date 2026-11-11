// BDSpec.Pending.ts — short-lived handoff of AI patch operations from the
// group page to the document detail page. Uses sessionStorage so the payload
// survives the client-side navigation (and a reload in the same tab) without
// touching Dexie.

import type { BDSpecPatchOp } from "./BDSpec.Patch";

export interface BDSpecPendingPatches {
  specId: string;
  patches: BDSpecPatchOp[];
  source: "generate" | "refine";
  createdAt: number;
}

const KEY_PREFIX = "bunnydev:spec-pending:";
const MAX_AGE_MS = 15 * 60 * 1000;

function keyFor(specId: string): string {
  return `${KEY_PREFIX}${specId}`;
}

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function setBDSpecPendingPatches(
  payload: Omit<BDSpecPendingPatches, "createdAt">,
): void {
  const storage = getStorage();
  if (!storage) {
    throw new Error("This browser does not allow session storage.");
  }
  try {
    storage.setItem(
      keyFor(payload.specId),
      JSON.stringify({ ...payload, createdAt: Date.now() }),
    );
  } catch {
    throw new Error(
      "The AI changes could not be staged in this browser. Please retry.",
    );
  }
}

/** Read and remove the pending payload for a document (null when absent). */
export function takeBDSpecPendingPatches(
  specId: string,
): BDSpecPendingPatches | null {
  const storage = getStorage();
  if (!storage) return null;
  const key = keyFor(specId);
  let raw: string | null;
  try {
    raw = storage.getItem(key);
    storage.removeItem(key);
  } catch {
    return null;
  }
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<BDSpecPendingPatches>;
    if (
      parsed.specId !== specId ||
      !Array.isArray(parsed.patches) ||
      parsed.patches.length === 0 ||
      (parsed.source !== "generate" && parsed.source !== "refine")
    ) {
      return null;
    }
    if (
      typeof parsed.createdAt === "number" &&
      Date.now() - parsed.createdAt > MAX_AGE_MS
    ) {
      return null;
    }
    return {
      specId,
      patches: parsed.patches,
      source: parsed.source,
      createdAt: parsed.createdAt ?? Date.now(),
    };
  } catch {
    return null;
  }
}
