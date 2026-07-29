// BKMemory.Export.ts
//
// Export utilities for BKThought — view and download thought content
// as standalone HTML documents, copy to clipboard, and blob preview.
//
// Template markup lives in BKMemory.Template.ts — this file is the
// consumer / logic layer.

import { buildStandaloneHtml } from "./BKMemory.Template";
import type { RenderFormat } from "@/src/modules/render/src/RenderModule.Types";
import type { BKMemory, BKMemoryNeuron } from "./BKMemory.Types";

// ─── Copy to clipboard ──────────────────────────────────────────────────────

/**
 * Copy content to the clipboard. Falls back to legacy execCommand if the
 * async clipboard API is unavailable.
 */
export async function bkCopyContent(content: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(content);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = content;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }
}

// ─── Download as text ───────────────────────────────────────────────────────

/**
 * Trigger a browser download of content as a text file.
 */
export function bkDownloadContent(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── View raw thought blob in new tab ────────────────────────────────────────

/**
 * Open a thought item's content in a new browser tab for preview.
 * Uses text/html for most formats, application/json for JSON.
 * For "tailwind" format, wraps content in a full HTML document with Tailwind CDN.
 * For "image" format, opens the image URL directly.
 */
export function bkViewThoughtBlob(content: string, format?: string): void {
  let blob: Blob;
  let mimeType: string;

  switch (format) {
    case "json":
      mimeType = "application/json";
      blob = new Blob([content], { type: mimeType });
      break;
    case "image": {
      // For images, try to open the URL directly
      const imgSrc = extractImageUrl(content);
      if (imgSrc) {
        window.open(imgSrc, "_blank");
        return;
      }
      mimeType = "text/html";
      blob = new Blob([content], { type: mimeType });
      break;
    }
    case "tailwind": {
      // Wrap in full document with Tailwind CDN plugin
      const doc = buildTailwindPreviewDocument(content);
      blob = new Blob([doc], { type: "text/html" });
      break;
    }
    default:
      mimeType = "text/html";
      blob = new Blob([content], { type: mimeType });
      break;
  }

  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

/**
 * Extract image URL from various formats (plain URL, markdown, HTML img tag).
 */
function extractImageUrl(raw: string): string | null {
  const trimmed = raw.trim();
  // Direct URL (http, https, data:)
  if (trimmed.match(/^https?:\/\//i) || trimmed.startsWith("data:")) {
    return trimmed;
  }
  // Markdown image syntax: ![alt](url)
  const mdMatch = trimmed.match(/!\[.*?\]\((.*?)\)/);
  if (mdMatch) return mdMatch[1].trim();
  // HTML img tag
  const htmlMatch = trimmed.match(/<img[^>]+src=["']([^"']+)["']/);
  if (htmlMatch) return htmlMatch[1].trim();
  return null;
}

/**
 * Build a complete HTML document wrapping tailwind content with the CDN plugin.
 */
function buildTailwindPreviewDocument(raw: string): string {
  return [
    `<!DOCTYPE html>`,
    `<html lang="en">`,
    `<head>`,
    `  <meta charset="UTF-8" />`,
    `  <meta name="viewport" content="width=device-width, initial-scale=1.0" />`,
    `  <script src="https://cdn.tailwindcss.com?plugins=typography"></script>`,
    `</head>`,
    `<body class="p-8 bg-slate-50">`,
    `  <div class="max-w-4xl mx-auto">`,
    `    ${raw}`,
    `  </div>`,
    `</body>`,
    `</html>`,
  ].join("\n");
}

// ─── View HTML in new tab ───────────────────────────────────────────────────

/**
 * Open the compiled thought HTML document in a new browser tab.
 */
export function bkViewAsHtml(
  neurons: BKMemoryNeuron[],
  memory: BKMemory | null,
  getNeuronFormat: (neuronId: string) => RenderFormat,
): void {
  const html = buildStandaloneHtml(neurons, memory, getNeuronFormat);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

// ─── Download HTML ──────────────────────────────────────────────────────────

/**
 * Download the compiled thought HTML document as an .html file.
 */
export function bkDownloadHtml(
  neurons: BKMemoryNeuron[],
  memoryId: string,
  memory: BKMemory | null,
  getNeuronFormat: (neuronId: string) => RenderFormat,
): void {
  const html = buildStandaloneHtml(neurons, memory, getNeuronFormat);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `thoughts-${memoryId.slice(0, 8)}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Download specific thought as file ──────────────────────────────────────

/**
 * Download a single thought item's content as its appropriate file type.
 */
export function bkDownloadThoughtItem(
  neuron: BKMemoryNeuron,
  format: RenderFormat,
): void {
  const filename = generateThoughtFilename(neuron, format);
  let content = neuron.value;
  let mimeType = "text/plain";

  switch (format) {
    case "json":
      mimeType = "application/json";
      // Try to pretty-print JSON
      try {
        content = JSON.stringify(JSON.parse(content), null, 2);
      } catch {
        // Use as-is
      }
      break;
    case "html":
    case "tailwind":
      mimeType = "text/html";
      break;
    case "markdown":
      mimeType = "text/markdown";
      break;
    case "csv":
      mimeType = "text/csv";
      break;
    case "yaml":
      mimeType = "text/yaml";
      break;
    case "image":
      // For images, download the image directly
      downloadImageThought(neuron);
      return;
    default:
      mimeType = "text/plain";
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Download an image thought item by extracting the URL and triggering a download.
 */
function downloadImageThought(neuron: BKMemoryNeuron): void {
  const raw = neuron.value;
  const imgSrc = extractImageUrl(raw);

  if (imgSrc) {
    // If it's a data URI, download directly
    if (imgSrc.startsWith("data:")) {
      const a = document.createElement("a");
      a.href = imgSrc;
      a.download = `thought-${neuron.order + 1}.png`;
      a.click();
      return;
    }
    // For URLs, fetch and blob download
    fetch(imgSrc)
      .then((res) => res.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `thought-${neuron.order + 1}.${blob.type.split("/")[1] || "png"}`;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => {
        // Fallback: try opening in new tab
        window.open(imgSrc, "_blank");
      });
  }
}

/**
 * Generate a filename for a thought item based on its name/order and format.
 */
function generateThoughtFilename(neuron: BKMemoryNeuron, format: RenderFormat): string {
  const base = (neuron.name || `thought-${neuron.order + 1}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const extensionMap: Partial<Record<RenderFormat, string>> = {
    markdown: "md",
    mermaid: "mmd",
    mindmap: "mmd",
    csv: "csv",
    tailwind: "html",
    html: "html",
    json: "json",
    yaml: "yaml",
    plain: "txt",
    codeblock: "txt",
    image: "png",
  };

  const ext = extensionMap[format] || "txt";
  return `${base}.${ext}`;
}
