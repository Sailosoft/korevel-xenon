/**
 * BunnyHelixAdapter — Resolution of the `BunnyHelixAIAdapter` into a concrete
 * `HelixAIOption` (or `undefined` when no provider is selected).
 *
 * The adapter is deliberately resolved at submit time — never at render — so a
 * lazily-read provider/model (Dexie getter, hook ref, props) is always fresh.
 */

import type { HelixAIOption } from "@/src/modules/helix";
import type { BunnyHelixAIAdapter } from "./BunnyHelix.Interface";

/**
 * Resolve a `BunnyHelixAIAdapter` into a `HelixAIOption` tuple.
 *
 * @param adapter - Static tuple or (possibly async) resolver.
 * @returns The resolved `HelixAIOption`, or `undefined` when the adapter is a
 *          function that returned `undefined` (e.g. no settings persisted yet).
 * @throws A descriptive error when a resolver throws so the modal surfaces it.
 */
export async function resolveBunnyHelixAI(
  adapter: BunnyHelixAIAdapter,
): Promise<HelixAIOption | undefined> {
  if (typeof adapter === "function") {
    const resolved = await adapter();
    return resolved ?? undefined;
  }
  return adapter;
}
