# Render Module

A standalone, adapter-based rendering module for transforming content of various formats into React views and standalone HTML documents.

## Table of Contents

- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Setup](#setup)
- [Usage](#usage)
  - [Rendering Content in React](#rendering-content-in-react)
  - [Exporting to Standalone HTML](#exporting-to-standalone-html)
  - [Downloading Exports in the Browser](#downloading-exports-in-the-browser)
  - [Multi-Block Export](#multi-block-export)
  - [Format Selection UI](#format-selection-ui)
  - [Getting Available Formats Programmatically](#getting-available-formats-programmatically)
  - [Per-Module Integration](#per-module-integration)
  - [Registering a Custom Adapter](#registering-a-custom-adapter)
  - [Low-Level Registry Access](#low-level-registry-access)
- [Built-in Adapters](#built-in-adapters)
- [API Reference](#api-reference)
- [Extending with Custom Adapters](#extending-with-custom-adapters)

---

## Architecture

The Render Module follows an **adapter pattern** with three core layers:

```
┌─────────────────────────────────────────────────────────┐
│                     Public API                           │
│  (RenderView, buildExportHtml, createModuleRenderer,    │
│   useRenderOptions, RenderOptionsSelect)                 │
├─────────────────────────────────────────────────────────┤
│                    RenderEngine                          │
│   Central facade — resolves adapters from the registry   │
│   and delegates rendering calls                          │
├─────────────────────────────────────────────────────────┤
│                  RenderRegistry                          │
│   Singleton map: format → adapter                        │
│   Supports dynamic register / unregister / lookup        │
├─────────────────────────────────────────────────────────┤
│                    Adapters                              │
│   markdown │ mermaid │ csv │ tailwind │ html │ plain    │
│   json      (plus any module-registered adapters)        │
└─────────────────────────────────────────────────────────┘
```

**Key files:**

| File | Purpose |
|---|---|
| [`RenderModule.Types.ts`](../src/RenderModule.Types.ts) | Core types, [`RenderAdapter`](../src/RenderModule.Types.ts:75) interface, [`RenderFormat`](../src/RenderModule.Types.ts:27) type |
| [`RenderModule.Registry.ts`](../src/RenderModule.Registry.ts) | Singleton [`renderRegistry`](../src/RenderModule.Registry.ts:144) for dynamic adapter registration |
| [`RenderModule.Engine.ts`](../src/RenderModule.Engine.ts) | Central [`RenderEngine`](../src/RenderModule.Engine.ts:31) facade |
| [`RenderModule.HtmlExport.ts`](../src/RenderModule.HtmlExport.ts) | Standalone HTML document builder + download helper |
| [`RenderModule.Extend.ts`](../src/RenderModule.Extend.ts) | Per-module integration via [`createModuleRenderer`](../src/RenderModule.Extend.ts:48) |
| [`RenderModule.UseRenderOptions.ts`](../src/RenderModule.UseRenderOptions.ts) | React hook for listing available formats |
| [`RenderModule.OptionsSelect.tsx`](../src/RenderModule.OptionsSelect.tsx) | React dropdown for format selection |
| [`components/`](../src/components/) | React view components ([`RenderView`](../src/components/RenderModule.View.tsx), [`MermaidRenderer`](../src/components/RenderView.Mermaid.tsx)) |
| [`adapters/`](../src/adapters/) | Built-in render adapters |

---

## Quick Start

```tsx
import {
  registerBuiltinAdapters,
  RenderView,
  buildExportHtml,
} from "@/src/modules/render";

// 1. Register built-in adapters once at app startup
registerBuiltinAdapters();

// 2. Render content in React
function MyComponent() {
  return (
    <RenderView
      format="markdown"
      content="# Hello World\n\nThis is **markdown** content."
    />
  );
}

// 3. Export to standalone HTML (server or client)
const { document } = buildExportHtml("# Hello World", "markdown");
// document is a complete <!DOCTYPE html> string

// 4. Render a mind map from markdown headings
function MindMap() {
  return (
    <RenderView
      format="mindmap"
      content={`# Central Topic
## Branch A
### Leaf A1
### Leaf A2
## Branch B
### Leaf B1`}
    />
  );
}
```

---

## Setup

Call [`registerBuiltinAdapters()`](../src/adapters/index.ts:26) once at application startup — typically in a layout, provider, or early-initialization module.

```tsx
// src/app/layout.tsx
"use client";

import { registerBuiltinAdapters } from "@/src/modules/render";
import { useEffect } from "react";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    registerBuiltinAdapters();
  }, []);

  return <html>{children}</html>;
}
```

> **Important:** Built-in adapters are **not** auto-registered. You must call [`registerBuiltinAdapters()`](../src/adapters/index.ts:26) explicitly. This keeps the module tree-shakeable — if you only need a subset of adapters, you can import and register them individually instead.

---

## Usage

### Rendering Content in React

Use the [`<RenderView>`](../src/components/RenderModule.View.tsx) component to render content in a React UI.

```tsx
import { RenderView } from "@/src/modules/render";

function Preview({ content, format }: { content: string; format: string }) {
  return (
    <RenderView
      format={format}
      content={content}
      className="my-preview"
      options={{ darkMode: false, maxHeight: "600px" }}
    />
  );
}
```

**Props** ([`RenderViewProps`](../src/RenderModule.Types.ts:130)):

| Prop | Type | Default | Description |
|---|---|---|---|
| `format` | `RenderFormat` | — | The target render format |
| `content` | `string` | — | Raw content to render |
| `className?` | `string` | — | CSS class on the wrapper |
| `options?` | `RenderOptions` | `{}` | Rendering options (darkMode, maxHeight, etc.) |
| `fallback?` | `ReactNode` | — | Content shown when no adapter is found |

### Exporting to Standalone HTML

Generate a complete HTML document string — useful for SSR, file download, or email.

```ts
import { buildExportHtml } from "@/src/modules/render";
import type { HtmlExportOptions } from "@/src/modules/render";

const options: HtmlExportOptions = {
  title: "My Export",
  extraCss: "body { background: #f0f0f0; }",
  showFooter: true,
  footerText: "Generated on 2025-01-01",
};

const result = buildExportHtml("# Hello", "markdown", options);
console.log(result.document); // Full <!DOCTYPE html> string
console.log(result.format);   // "markdown"
console.log(result.raw);      // "# Hello"
```

**Options** ([`HtmlExportOptions`](../src/RenderModule.HtmlExport.ts:70)):

| Option | Type | Default | Description |
|---|---|---|---|
| `title` | `string` | `"Export — {format}"` | Document `<title>` |
| `extraCss` | `string` | `""` | Additional CSS injected into `<head>` |
| `extraHead` | `string` | `""` | Additional `<head>` content (meta, scripts) |
| `showFooter` | `boolean` | `true` | Whether to include the export footer |
| `footerText` | `string` | Date-stamped default | Custom footer text |
| `renderOptions` | `RenderOptions` | — | Passthrough options for the adapter |

### Downloading Exports in the Browser

Trigger a browser download of the exported HTML document.

```ts
import { downloadExportHtml } from "@/src/modules/render";

function handleDownload() {
  downloadExportHtml(
    "# Hello World",
    "markdown",
    "my-export.html",        // optional filename
    { title: "My Document" } // optional HtmlExportOptions
  );
}
```

> **Note:** [`downloadExportHtml()`](../src/RenderModule.HtmlExport.ts:254) only works in browser environments. It creates a blob, generates an object URL, and programmatically clicks a download anchor.

### Multi-Block Export

Render multiple content blocks into a single HTML document, each rendered sequentially.

```ts
import { buildMultiExportHtml } from "@/src/modules/render";

const html = buildMultiExportHtml([
  { content: "# Chapter 1", format: "markdown", label: "Overview" },
  { content: "graph TD; A-->B;", format: "mermaid", label: "Flowchart" },
  { content: "Name,Age\nAlice,30\nBob,25", format: "csv", label: "Data" },
], {
  title: "Full Report",
});
```

### Format Selection UI

Use the [`useRenderOptions`](../src/RenderModule.UseRenderOptions.ts) hook to get display-ready format options.

```tsx
import { useRenderOptions } from "@/src/modules/render";

function FormatPicker() {
  const allOptions = useRenderOptions();
  // [{ format: "markdown", displayName: "Markdown", description: "...", isBuiltin: true }, ...]

  const moduleOptions = useRenderOptions("lemon-coder");
  // Only formats registered by the "lemon-coder" module

  const builtinOptions = useRenderOptions("builtin");
  // Only built-in formats
}
```

Or use the ready-made [`<RenderOptionsSelect>`](../src/RenderModule.OptionsSelect.tsx) dropdown component.

```tsx
import { RenderOptionsSelect, useRenderOptions } from "@/src/modules/render";
import type { RenderFormat } from "@/src/modules/render";
import { useState } from "react";

function FormatSelector() {
  const [format, setFormat] = useState<RenderFormat>("markdown");

  return (
    <RenderOptionsSelect
      value={format}
      onChange={setFormat}
      sourceModule="lemon-coder"   // optional filter
      groupByModule={true}          // group options by source module
      showDescriptions={true}       // show descriptions in tooltips
      placeholder="Choose format..."
    />
  );
}
```

### Getting Available Formats Programmatically

Use the [`RenderEngine`](../src/RenderModule.Engine.ts:31) static methods to query available adapters without rendering.

```ts
import { RenderEngine } from "@/src/modules/render";

// Check if a format is supported
RenderEngine.supports("markdown"); // true

// List all registered format identifiers
const formats = RenderEngine.getAvailableFormats();
// ["markdown", "mermaid", "csv", ...]

// Get display name/description
RenderEngine.getDisplayName("mermaid"); // "Mermaid Diagram"
RenderEngine.getDescription("mermaid"); // "Render Mermaid flowchart..."

// Get all registered adapters
const adapters = RenderEngine.getRegisteredAdapters();
```

### Per-Module Integration

Other modules can register their own adapters scoped to their module, and clean them up on unmount.

```tsx
import { createModuleRenderer } from "@/src/modules/render";
import type { RenderAdapter } from "@/src/modules/render";

// Create a scoped renderer for your module
const myRenderer = createModuleRenderer("my-module");

// Register a custom adapter
myRenderer.register({
  format: "myFormat" as any,
  displayName: "My Format",
  description: "Custom rendering for my module",
  renderHtml(content, options) {
    return {
      raw: content,
      html: `<div class="my-format">${content}</div>`,
      format: "myFormat" as any,
    };
  },
});

// Get formats scoped to this module
const formats = myRenderer.getFormats(); // ["myFormat"]

// React UI: get filtered options
const myOptions = useRenderOptions("my-module");

// Clean up when module unmounts
// useEffect(() => () => myRenderer.dispose(), []);
```

[`ModuleRenderer`](../src/RenderModule.Extend.ts:58) provides:

| Method | Description |
|---|---|
| `register(adapter)` | Register a single adapter |
| `registerAll(adapters)` | Register multiple adapters at once |
| `unregister(format)` | Unregister a specific format |
| `has(format)` | Check if this module owns a format |
| `get(format)` | Get adapter for a format (only if owned) |
| `getAll()` | Get all adapters owned by this module |
| `getFormats()` | List format identifiers owned by this module |
| `dispose()` | Unregister all adapters — call on unmount |

> **Note:** Adapters registered via [`ModuleRenderer`](../src/RenderModule.Extend.ts:58) are automatically tagged with the module name, so [`useRenderOptions("moduleName")`](../src/RenderModule.UseRenderOptions.ts:130) can filter by them.

### Registering a Custom Adapter

Implement the [`RenderAdapter`](../src/RenderModule.Types.ts:75) interface and register it with the registry.

```ts
import { renderRegistry } from "@/src/modules/render";
import type { RenderAdapter } from "@/src/modules/render";

const myAdapter: RenderAdapter = {
  format: "myCustomFormat" as any,
  displayName: "My Custom Format",
  description: "Renders content in my custom format",
  renderHtml(content, options) {
    return {
      raw: content,
      html: `<div class="custom">${content}</div>`,
      format: "myCustomFormat" as any,
      meta: { processedAt: Date.now() },
    };
  },
};

// Register globally
renderRegistry.register(myAdapter);

// Or register with a source module tag
renderRegistry.register(myAdapter, "my-module");
```

### Low-Level Registry Access

The [`renderRegistry`](../src/RenderModule.Registry.ts:144) singleton provides full CRUD for adapters.

```ts
import { renderRegistry } from "@/src/modules/render";

renderRegistry.register(adapter, "optional-module");
renderRegistry.registerAll([adapter1, adapter2], "module");
renderRegistry.get("markdown");        // → RenderAdapter | undefined
renderRegistry.has("markdown");        // → boolean
renderRegistry.getEntry("markdown");   // → RenderRegistryEntry with metadata
renderRegistry.unregister("markdown"); // → boolean
renderRegistry.getAll();              // → RenderAdapter[]
renderRegistry.getAllEntries();       // → RenderRegistryEntry[]
renderRegistry.getFormats();          // → RenderFormat[]
renderRegistry.clear();               // Remove all
renderRegistry.size;                  // → number
```

---

## Dependencies

The Render module uses these packages from [`package.json`](../../../../package.json):

| Package | Version | Usage | Imported By |
|---|---|---|---|
| [`react-markdown`](../../../../package.json:33) | `^10.1.0` | Renders Markdown content in React views with full syntax support (headings, lists, code blocks, tables, etc.) | [`RenderModule.View.tsx`](../src/components/RenderModule.View.tsx:25) — `import ReactMarkdown from "react-markdown"` |
| [`remark-gfm`](../../../../package.json:34) | `^4.0.1` | GitHub Flavored Markdown plugin for `react-markdown` (tables, strikethrough, task lists, URLs) | [`RenderModule.View.tsx`](../src/components/RenderModule.View.tsx:26) — `import remarkGfm from "remark-gfm"` |
| [`mermaid`](../../../../package.json:27) | `^11.16.0` | Renders Mermaid diagram definitions (flowcharts, sequence diagrams, Gantt, etc.) to SVG in React | [`RenderView.Mermaid.tsx`](../src/components/RenderView.Mermaid.tsx:11) — `import mermaid from "mermaid"` |

The [`markdownAdapter`](../src/adapters/RenderAdapter.Markdown.ts) uses its own **regex-based** markdown-to-HTML converter (not `react-markdown`) for HTML export / SSR, since `react-markdown` is a React-specific renderer. The standalone export document references `marked` via CDN for full client-side rendering.

The [`mermaidAdapter`](../src/adapters/RenderAdapter.Mermaid.ts) wraps the diagram definition in a `<pre class="mermaid">` element and includes the **Mermaid CDN script** for standalone HTML export, while the React component uses the installed `mermaid` npm package directly.

The [`mindmapAdapter`](../src/adapters/RenderAdapter.Mindmap.ts) converts markdown heading hierarchies (`# Topic` → `## Branch` → `### Leaf`) into Mermaid mindmap syntax and renders them using the same `mermaid` library. It also accepts raw Mermaid mindmap syntax or `\`\`\`mm` / `\`\`\`mindmap` fenced blocks.

---

## Built-in Adapters

| Format | Adapter | Description |
|---|---|---|
| `markdown` | [`markdownAdapter`](../src/adapters/RenderAdapter.Markdown.ts) | Renders Markdown → HTML (regex-based for export, `react-markdown` for React) |
| `mermaid` | [`mermaidAdapter`](../src/adapters/RenderAdapter.Mermaid.ts) | Renders Mermaid diagram syntax (`mermaid` npm package in React, CDN for export) |
| `mindmap` | [`mindmapAdapter`](../src/adapters/RenderAdapter.Mindmap.ts) | Renders mind maps from markdown headings or Mermaid mindmap syntax via `mermaid` |
| `csv` | [`csvAdapter`](../src/adapters/RenderAdapter.Csv.ts) | Renders CSV data as an HTML `<table>` |
| `tailwind` | [`tailwindAdapter`](../src/adapters/RenderAdapter.Tailwind.ts) | Passes content through with Tailwind CDN for export |
| `html` | [`htmlAdapter`](../src/adapters/RenderAdapter.Html.ts) | Renders raw HTML content directly |
| `plain` | [`plainTextAdapter`](../src/adapters/RenderAdapter.PlainText.ts) | Renders content as plain text (escaped) |
| `json` | [`jsonAdapter`](../src/adapters/RenderAdapter.Json.ts) | Renders JSON content with syntax-highlighted `<pre>` |

Each adapter can also be imported individually:

```ts
import {
  markdownAdapter,
  mermaidAdapter,
  mindmapAdapter,
  csvAdapter,
  htmlAdapter,
  tailwindAdapter,
  plainTextAdapter,
  jsonAdapter,
} from "@/src/modules/render";
```

---

## API Reference

### Exports from [`src/index.ts`](../src/index.ts)

| Export | Kind | Source |
|---|---|---|
| `renderRegistry` | Singleton | [`RenderModule.Registry.ts`](../src/RenderModule.Registry.ts) |
| `RenderEngine` | Class (static) | [`RenderModule.Engine.ts`](../src/RenderModule.Engine.ts) |
| `buildExportHtml` | Function | [`RenderModule.HtmlExport.ts`](../src/RenderModule.HtmlExport.ts) |
| `buildMultiExportHtml` | Function | [`RenderModule.HtmlExport.ts`](../src/RenderModule.HtmlExport.ts) |
| `downloadExportHtml` | Function | [`RenderModule.HtmlExport.ts`](../src/RenderModule.HtmlExport.ts) |
| `registerBuiltinAdapters` | Function | [`adapters/index.ts`](../src/adapters/index.ts) |
| `createModuleRenderer` | Function | [`RenderModule.Extend.ts`](../src/RenderModule.Extend.ts) |
| `ModuleRenderer` | Class | [`RenderModule.Extend.ts`](../src/RenderModule.Extend.ts) |
| `RenderView` | Component | [`components/RenderModule.View.tsx`](../src/components/RenderModule.View.tsx) |
| `MermaidRenderer` | Component | [`components/RenderView.Mermaid.tsx`](../src/components/RenderView.Mermaid.tsx) |
| `useRenderOptions` | Hook | [`RenderModule.UseRenderOptions.ts`](../src/RenderModule.UseRenderOptions.ts) |
| `RenderOptionsSelect` | Component | [`RenderModule.OptionsSelect.tsx`](../src/RenderModule.OptionsSelect.tsx) |
| `RenderFormats` | Const array | [`RenderModule.Types.ts`](../src/RenderModule.Types.ts) |
| `mindmapAdapter` | Adapter | [`adapters/RenderAdapter.Mindmap.ts`](../src/adapters/RenderAdapter.Mindmap.ts) |

### Type Exports

| Type | Source |
|---|---|
| `RenderFormat` | [`RenderModule.Types.ts`](../src/RenderModule.Types.ts:27) |
| `RenderOptions` | [`RenderModule.Types.ts`](../src/RenderModule.Types.ts:32) |
| `RenderHtmlResult` | [`RenderModule.Types.ts`](../src/RenderModule.Types.ts:50) |
| `RenderAdapter` | [`RenderModule.Types.ts`](../src/RenderModule.Types.ts:75) |
| `RenderRegistryEntry` | [`RenderModule.Types.ts`](../src/RenderModule.Types.ts:100) |
| `RenderEngineOptions` | [`RenderModule.Types.ts`](../src/RenderModule.Types.ts:110) |
| `RenderEngineHtmlResult` | [`RenderModule.Types.ts`](../src/RenderModule.Types.ts:122) |
| `RenderViewProps` | [`RenderModule.Types.ts`](../src/RenderModule.Types.ts:130) |
| `RenderOptionItem` | [`RenderModule.Types.ts`](../src/RenderModule.Types.ts:149) |
| `HtmlExportOptions` | [`RenderModule.HtmlExport.ts`](../src/RenderModule.HtmlExport.ts:70) |
| `HtmlExportResult` | [`RenderModule.HtmlExport.ts`](../src/RenderModule.HtmlExport.ts:87) |
| `RenderOptionsSelectProps` | [`RenderModule.OptionsSelect.tsx`](../src/RenderModule.OptionsSelect.tsx:29) |

---

## Extending with Custom Adapters

To add support for a new render format:

1. **Create an adapter** implementing the [`RenderAdapter`](../src/RenderModule.Types.ts:75) interface:

```ts
import type { RenderAdapter, RenderHtmlResult, RenderOptions } from "@/src/modules/render";

export const myFormatAdapter: RenderAdapter = {
  format: "myFormat" as any,
  displayName: "My Format",
  description: "Description of my format",
  renderHtml(content: string, options?: RenderOptions): RenderHtmlResult {
    // Transform content into an HTML fragment
    const html = transformToHtml(content);
    return { raw: content, html, format: "myFormat" as any, meta: {} };
  },
};
```

2. **Register it:**

```ts
import { renderRegistry } from "@/src/modules/render";
import { myFormatAdapter } from "./myFormatAdapter";

renderRegistry.register(myFormatAdapter);
```

3. **Add a rendering case** in the View component (if React rendering is needed) — see [`RenderModule.View.tsx`](../src/components/RenderModule.View.tsx) for the pattern.

4. **That's it.** The format will automatically appear in:
   - [`RenderEngine.getAvailableFormats()`](../src/RenderModule.Engine.ts:85)
   - [`useRenderOptions()`](../src/RenderModule.UseRenderOptions.ts:130)
   - [`<RenderOptionsSelect>`](../src/RenderModule.OptionsSelect.tsx)

---

> For module-level integration, prefer [`createModuleRenderer`](../src/RenderModule.Extend.ts:48) over direct registry access — it handles scoping, cleanup, and automatic UI notification.
