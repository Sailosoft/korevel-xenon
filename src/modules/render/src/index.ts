// ───────────────────────────────────────────────────────────────────────────────
// Render Module — Barrel Exports
//
// A standalone, adapter-based rendering module for transforming content
// of various formats into React views and standalone HTML documents.
//
// # Architecture
//
//   RenderModule.Types       → Core types, RenderAdapter interface, RenderFormat
//   RenderModule.Registry    → Singleton registry for dynamic adapter registration
//   RenderModule.Engine      → Central facade coordinating adapters
//   RenderModule.HtmlExport  → Standalone HTML document builder
//   adapters/                → Built-in render adapters (markdown, mermaid, csv, ...)
//   components/              → React components for interactive rendering
//
// # Usage
//
//   import { registerBuiltinAdapters } from "./adapters";
//   import { RenderEngine } from "./RenderModule.Engine";
//   import { RenderView } from "./components";
//
//   // 1. Register built-in adapters once at app startup
//   registerBuiltinAdapters();
//
//   // 2. Render in React
//   <RenderView format="markdown" content="# Hello" />
//
//   // 3. Export to standalone HTML
//   const { document } = buildExportHtml("# Hello", "markdown");
//
//   // 4. Register a custom adapter
//   import { renderRegistry } from "./RenderModule.Registry";
//   renderRegistry.register(myCustomAdapter);
//
// # Extending
//
//   To add a new render format:
//   1. Create an adapter implementing RenderAdapter
//   2. Register it: renderRegistry.register(myAdapter)
//   3. Add a case in RenderModule.View.tsx for React rendering
// ───────────────────────────────────────────────────────────────────────────────

// ── Registry & Engine ───────────────────────────────────────────────────────
export { renderRegistry } from "./RenderModule.Registry";
export { RenderEngine } from "./RenderModule.Engine";

// ── HTML Export ─────────────────────────────────────────────────────────────
export {
  buildExportHtml,
  buildMultiExportHtml,
  downloadExportHtml,
} from "./RenderModule.HtmlExport";
export type { HtmlExportOptions, HtmlExportResult } from "./RenderModule.HtmlExport";

// ── Types ───────────────────────────────────────────────────────────────────
export type {
  RenderFormat,
  RenderOptions,
  RenderHtmlResult,
  RenderAdapter,
  RenderRegistryEntry,
  RenderEngineOptions,
  RenderEngineHtmlResult,
  RenderViewProps,
} from "./RenderModule.Types";

export { RenderFormats } from "./RenderModule.Types";

// ── Adapters ────────────────────────────────────────────────────────────────
export { registerBuiltinAdapters } from "./adapters";
export {
  markdownAdapter,
  mermaidAdapter,
  csvAdapter,
  htmlAdapter,
  tailwindAdapter,
  plainTextAdapter,
  jsonAdapter,
} from "./adapters";

// ── Components ──────────────────────────────────────────────────────────────
export { RenderView, MermaidRenderer } from "./components";
