// ───────────────────────────────────────────────────────────────────────────────
// Render Module — Render Engine
//
// Central facade that coordinates rendering through the adapter registry.
// Provides convenience methods for both React and HTML rendering paths.
// ───────────────────────────────────────────────────────────────────────────────

import { renderRegistry } from "./RenderModule.Registry";
import type {
  RenderFormat,
  RenderOptions,
  RenderHtmlResult,
  RenderEngineHtmlResult,
} from "./RenderModule.Types";

/**
 * RenderEngine — the primary entry point for all rendering operations.
 *
 * The engine resolves the correct adapter from the registry and delegates
 * to it. This keeps calling code agnostic of adapter internals.
 *
 * Usage:
 * ```ts
 * import { RenderEngine } from "./RenderModule.Engine";
 *
 * // HTML export
 * const result = RenderEngine.renderHtml({ format: "markdown", content: "# Hello" });
 * console.log(result.html.html);
 * ```
 */
export class RenderEngine {
  /**
   * Render content to an HTML fragment using the registered adapter.
   *
   * @param format - The target render format
   * @param content - Raw content string
   * @param options - Optional rendering options
   * @returns The HTML result with adapter metadata
   * @throws {Error} If no adapter is registered for the given format
   */
  static renderHtml(
    format: RenderFormat,
    content: string,
    options?: RenderOptions,
  ): RenderEngineHtmlResult {
    const adapter = renderRegistry.get(format);

    if (!adapter) {
      throw new Error(
        `[RenderEngine] No adapter registered for format "${format}". ` +
          `Available formats: ${renderRegistry.getFormats().join(", ") || "none"}`,
      );
    }

    const html = adapter.renderHtml(content, options);
    return { html, adapter };
  }

  /**
   * Check if a render adapter exists for the given format.
   */
  static supports(format: RenderFormat): boolean {
    return renderRegistry.has(format);
  }

  /**
   * Get a human-readable display name for a format.
   */
  static getDisplayName(format: RenderFormat): string {
    const adapter = renderRegistry.get(format);
    return adapter?.displayName ?? format;
  }

  /**
   * Get a description for a format.
   */
  static getDescription(format: RenderFormat): string {
    const adapter = renderRegistry.get(format);
    return adapter?.description ?? "";
  }

  /**
   * List all currently registered format identifiers.
   */
  static getAvailableFormats(): RenderFormat[] {
    return renderRegistry.getFormats();
  }

  /**
   * List all currently registered adapters.
   */
  static getRegisteredAdapters() {
    return renderRegistry.getAll();
  }

  /**
   * Convenience: render multiple content blocks and return their HTML results.
   */
  static renderAll(
    items: Array<{ format: RenderFormat; content: string; options?: RenderOptions }>,
  ): RenderEngineHtmlResult[] {
    return items.map((item) =>
      RenderEngine.renderHtml(item.format, item.content, item.options),
    );
  }
}
