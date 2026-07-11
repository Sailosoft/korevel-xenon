// ───────────────────────────────────────────────────────────────────────────────
// Render Module — Adapter Registry
//
// Singleton registry that stores and resolves render adapters dynamically.
// Allows external code to register new adapters at runtime.
// ───────────────────────────────────────────────────────────────────────────────

import type {
  RenderAdapter,
  RenderFormat,
  RenderRegistryEntry,
} from "./RenderModule.Types";

/**
 * Singleton registry for render adapters.
 *
 * Usage:
 * ```ts
 * import { renderRegistry } from "./RenderModule.Registry";
 * import { myCustomAdapter } from "./adapters/MyCustomAdapter";
 *
 * renderRegistry.register(myCustomAdapter);
 * const adapter = renderRegistry.get("myFormat");
 * ```
 */
class RenderRegistry {
  /** Internal map: format → registry entry */
  private readonly _adapters = new Map<RenderFormat, RenderRegistryEntry>();

  /**
   * Register a new render adapter.
   * If an adapter for the same format already exists it will be overwritten
   * (last-registered wins), and a warning is emitted in development.
   */
  register(adapter: RenderAdapter): void {
    if (process.env.NODE_ENV === "development") {
      const existing = this._adapters.get(adapter.format);
      if (existing) {
        console.warn(
          `[RenderRegistry] Overwriting existing adapter for format "${adapter.format}". ` +
            `Previous: "${existing.adapter.displayName ?? existing.adapter.format}".`,
        );
      }
    }

    this._adapters.set(adapter.format, {
      adapter,
      registeredAt: Date.now(),
    });
  }

  /**
   * Register multiple adapters at once.
   */
  registerAll(adapters: RenderAdapter[]): void {
    for (const adapter of adapters) {
      this.register(adapter);
    }
  }

  /**
   * Retrieve the adapter for a given format.
   * Returns `undefined` if no adapter is registered for that format.
   */
  get(format: RenderFormat): RenderAdapter | undefined {
    return this._adapters.get(format)?.adapter;
  }

  /**
   * Check whether an adapter exists for the given format.
   */
  has(format: RenderFormat): boolean {
    return this._adapters.has(format);
  }

  /**
   * Remove a registered adapter by format.
   * Returns `true` if the adapter was removed, `false` if not found.
   */
  unregister(format: RenderFormat): boolean {
    return this._adapters.delete(format);
  }

  /**
   * Get all currently registered adapters.
   */
  getAll(): RenderAdapter[] {
    const result: RenderAdapter[] = [];
    for (const entry of this._adapters.values()) {
      result.push(entry.adapter);
    }
    return result;
  }

  /**
   * Get a list of all registered format identifiers.
   */
  getFormats(): RenderFormat[] {
    return Array.from(this._adapters.keys());
  }

  /**
   * Remove all registered adapters.
   */
  clear(): void {
    this._adapters.clear();
  }

  /**
   * Get the number of registered adapters.
   */
  get size(): number {
    return this._adapters.size;
  }
}

/** Singleton instance */
export const renderRegistry = new RenderRegistry();
