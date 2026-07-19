// ───────────────────────────────────────────────────────────────────────────────
// Render Module — Per-Module Extension Utilities
//
// Provides a clean integration pattern for other modules to:
//   1. Register their own render adapters scoped to their module
//   2. Get a filtered list of their registered options
//   3. Cleanly unregister when the module is disposed
//
// Usage (in another module, e.g. lemon-coder):
// ```ts
// import { createModuleRenderer } from "@/src/modules/render/src/RenderModule.Extend";
// import type { RenderAdapter } from "@/src/modules/render/src/RenderModule.Types";
//
// const myRenderer = createModuleRenderer("lemon-coder");
//
// // Register a custom adapter for this module's specific needs
// const myAdapter: RenderAdapter = {
//   format: "myCustomFormat",
//   displayName: "My Custom Format",
//   description: "Renders content in my custom format",
//   renderHtml(content) {
//     return { raw: content, html: `<div>${content}</div>`, format: "myCustomFormat" };
//   },
// };
//
// myRenderer.register(myAdapter);
//
// // Later, get all options scoped to this module
// const myOptions = myRenderer.getOptions();
// // [{ format: "myCustomFormat", displayName: "My Custom Format", ... }]
//
// // Clean up when module unmounts
// myRenderer.dispose();
// ```
// ───────────────────────────────────────────────────────────────────────────────

import { renderRegistry } from "./RenderModule.Registry";
import type { RenderAdapter, RenderFormat } from "./RenderModule.Types";

/**
 * Create a scoped renderer instance for a specific module.
 *
 * Each module gets its own `ModuleRenderer` that:
 * - Registers adapters tagged with the module name
 * - Provides filtered access to only that module's formats
 * - Supports batch dispose when the module is torn down
 */
export function createModuleRenderer(moduleName: string): ModuleRenderer {
  return new ModuleRenderer(moduleName);
}

/**
 * Scoped renderer for a single module.
 *
 * Supports registration, listing, and disposal of adapters
 * that belong to a specific module.
 */
export class ModuleRenderer {
  /** The module name these adapters belong to */
  readonly moduleName: string;

  /** Tracks formats registered by this module for cleanup */
  private readonly _ownedFormats = new Set<RenderFormat>();

  constructor(moduleName: string) {
    if (!moduleName || moduleName.trim().length === 0) {
      throw new Error("[ModuleRenderer] moduleName is required");
    }
    this.moduleName = moduleName.trim();
  }

  /**
   * Register a render adapter owned by this module.
   * The adapter will be tagged with the module name so that
   * `useRenderOptions("moduleName")` can filter by it.
   *
   * @param adapter - The adapter to register
   */
  register(adapter: RenderAdapter): void {
    renderRegistry.register(adapter, this.moduleName);
    this._ownedFormats.add(adapter.format);
  }

  /**
   * Register multiple adapters at once.
   *
   * @param adapters - Array of adapters to register
   */
  registerAll(adapters: RenderAdapter[]): void {
    for (const adapter of adapters) {
      this.register(adapter);
    }
  }

  /**
   * Unregister a specific adapter by format.
   *
   * @param format - The format to unregister
   * @returns true if the adapter was removed
   */
  unregister(format: RenderFormat): boolean {
    const removed = renderRegistry.unregister(format);
    if (removed) {
      this._ownedFormats.delete(format);
    }
    return removed;
  }

  /**
   * Check if this module has a registered adapter for the given format.
   */
  has(format: RenderFormat): boolean {
    return this._ownedFormats.has(format);
  }

  /**
   * Get all formats registered by this module.
   */
  getFormats(): RenderFormat[] {
    return Array.from(this._ownedFormats);
  }

  /**
   * Get the adapter for a format registered by this module.
   * Returns undefined if the format is not owned by this module.
   */
  get(format: RenderFormat): RenderAdapter | undefined {
    if (!this._ownedFormats.has(format)) return undefined;
    return renderRegistry.get(format);
  }

  /**
   * Get all adapters registered by this module.
   */
  getAll(): RenderAdapter[] {
    const result: RenderAdapter[] = [];
    for (const format of this._ownedFormats) {
      const adapter = renderRegistry.get(format);
      if (adapter) result.push(adapter);
    }
    return result;
  }

  /**
   * Get the number of adapters registered by this module.
   */
  get size(): number {
    return this._ownedFormats.size;
  }

  /**
   * Unregister all adapters owned by this module.
   * Call this when the module is unmounted/disposed.
   */
  dispose(): void {
    for (const format of this._ownedFormats) {
      renderRegistry.unregister(format);
    }
    this._ownedFormats.clear();
  }
}
