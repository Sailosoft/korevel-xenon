// ───────────────────────────────────────────────────────────────────────────────
// Render Module — Barrel Exports
//
// A standalone, adapter-based rendering module for transforming content
// of various formats into React views and standalone HTML documents.
//
// # Architecture
//
//   RenderModule.Types             → Core types, RenderAdapter interface, RenderFormat
//   RenderModule.Registry          → Singleton registry for dynamic adapter registration
//   RenderModule.Engine            → Central facade coordinating adapters
//   RenderModule.HtmlExport        → Standalone HTML document builder + download helper
//   RenderModule.Extend            → Per-module integration utilities (createModuleRenderer)
//   RenderModule.UseRenderOptions  → React hook for listing available formats in UI
//   RenderModule.OptionsSelect     → React dropdown component for format selection
//   adapters/                      → Built-in render adapters (markdown, mermaid, csv, ...)
//   components/                    → React components for interactive rendering
//
// # Quick Start
//
//   import { registerBuiltinAdapters, RenderEngine, RenderView } from "./index";
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
// # Per-Module Integration
//
//   import { createModuleRenderer } from "./index";
//
//   const myRenderer = createModuleRenderer("my-module");
//   myRenderer.register(myCustomAdapter);
//
//   // In React UI:
//   const options = useRenderOptions("my-module");
//   <RenderOptionsSelect value={format} onChange={setFormat} sourceModule="my-module" />
//
// # Adapter Pattern
//
//   To add a new render format:
//   1. Create an adapter implementing `RenderAdapter`
//   2. Register it: `renderRegistry.register(myAdapter)`
//   3. Add a case in `RenderModule.View.tsx` for React rendering
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
  RenderTableColors,
  RenderOptionItem,
} from "./RenderModule.Types";

export { RenderFormats } from "./RenderModule.Types";

// ── Adapters ────────────────────────────────────────────────────────────────
export { registerBuiltinAdapters } from "./adapters";
export { yamlAdapter } from "./adapters/RenderAdapter.Yaml";
export {
  markdownAdapter,
  mermaidAdapter,
  mindmapAdapter,
  csvAdapter,
  htmlAdapter,
  tailwindAdapter,
  plainTextAdapter,
  jsonAdapter,
  imageAdapter,
} from "./adapters";

// ── Components ──────────────────────────────────────────────────────────────
export { RenderView, MermaidRenderer, defaultMarkdownComponents } from "./components";

// ── Per-Module Extension ────────────────────────────────────────────────────
export { createModuleRenderer, ModuleRenderer } from "./RenderModule.Extend";

// ── Options Listing (React) ─────────────────────────────────────────────────
export { useRenderOptions, notifyRenderOptionsChanged } from "./RenderModule.UseRenderOptions";
export { default as RenderOptionsSelect } from "./RenderModule.OptionsSelect";
export type { RenderOptionsSelectProps } from "./RenderModule.OptionsSelect";
