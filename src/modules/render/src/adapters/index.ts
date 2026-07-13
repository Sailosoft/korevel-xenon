// ───────────────────────────────────────────────────────────────────────────────
// Render Module — Adapters Barrel Export
// ───────────────────────────────────────────────────────────────────────────────

export { markdownAdapter } from "./RenderAdapter.Markdown";
export { mermaidAdapter } from "./RenderAdapter.Mermaid";
export { mindmapAdapter } from "./RenderAdapter.Mindmap";
export { csvAdapter } from "./RenderAdapter.Csv";
export { htmlAdapter } from "./RenderAdapter.Html";
export { tailwindAdapter } from "./RenderAdapter.Tailwind";
export { plainTextAdapter } from "./RenderAdapter.PlainText";
export { jsonAdapter } from "./RenderAdapter.Json";

import { renderRegistry } from "../RenderModule.Registry";
import { markdownAdapter } from "./RenderAdapter.Markdown";
import { mermaidAdapter } from "./RenderAdapter.Mermaid";
import { mindmapAdapter } from "./RenderAdapter.Mindmap";
import { csvAdapter } from "./RenderAdapter.Csv";
import { htmlAdapter } from "./RenderAdapter.Html";
import { tailwindAdapter } from "./RenderAdapter.Tailwind";
import { plainTextAdapter } from "./RenderAdapter.PlainText";
import { jsonAdapter } from "./RenderAdapter.Json";

/**
 * Register all built-in adapters with the render registry.
 * Call this once at application startup.
 */
export function registerBuiltinAdapters(): void {
  renderRegistry.registerAll([
    markdownAdapter,
    mermaidAdapter,
    mindmapAdapter,
    csvAdapter,
    htmlAdapter,
    tailwindAdapter,
    plainTextAdapter,
    jsonAdapter,
  ]);
}
