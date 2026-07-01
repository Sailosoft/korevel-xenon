// BKCraft.Engine.ts
//
// Craft Engine — processes AI output according to the specified format.
// It calculates and generates output before saving to memory.
// Supports: markdown, html, tailwind, csv, json, imageList, mermaid, plain

import type {
  BKCraftFormat,
  BKCraftEngineResult,
} from "./BKCraft.Types";

/**
 * Image source definitions for imageList format.
 */
const IMAGE_SOURCES = [
  { name: "Pexels", url: "https://pexels.com" },
  { name: "Unsplash", url: "https://unsplash.com" },
  { name: "Pixabay", url: "https://pixabay.com" },
  { name: "Pinterest", url: "https://pinterest.com" },
  { name: "StockSnap", url: "https://stocksnap.io" },
] as const;

export class BKCraftEngine {
  /**
   * Process raw AI output through the craft engine for the given format.
   */
  static process(
    raw: string,
    format: BKCraftFormat,
  ): BKCraftEngineResult {
    switch (format) {
      case "markdown":
        return BKCraftEngine.processMarkdown(raw);
      case "html":
        return BKCraftEngine.processHtml(raw);
      case "tailwind":
        return BKCraftEngine.processTailwind(raw);
      case "csv":
        return BKCraftEngine.processCsv(raw);
      case "json":
        return BKCraftEngine.processJson(raw);
      case "imageList":
        return BKCraftEngine.processImageList(raw);
      case "mermaid":
        return BKCraftEngine.processMermaid(raw);
      case "plain":
        return BKCraftEngine.processPlain(raw);
      case "architecture":
        return BKCraftEngine.processArchitecture(raw);
      case "agentSwarm":
        return BKCraftEngine.processAgentSwarm(raw);
      case "docker":
        return BKCraftEngine.processDocker(raw);
      default:
        return BKCraftEngine.processMarkdown(raw);
    }
  }

  /**
   * Process markdown — convert to HTML using simple mark parsing.
   */
  private static processMarkdown(raw: string): BKCraftEngineResult {
    // Basic markdown to HTML conversion
    let parsed = raw
      // Code blocks
      .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
      // Bold
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      // Italic
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      // Inline code
      .replace(/`(.*?)`/g, "<code>$1</code>")
      // Headers
      .replace(/^### (.*$)/gm, "<h3>$1</h3>")
      .replace(/^## (.*$)/gm, "<h2>$1</h2>")
      .replace(/^# (.*$)/gm, "<h1>$1</h1>")
      // Unordered lists
      .replace(/^- (.*$)/gm, "<li>$1</li>")
      // Paragraphs (double newlines)
      .replace(/\n\n/g, "</p><p>")
      // Line breaks
      .replace(/\n/g, "<br/>");

    parsed = `<div class="bk-craft-markdown"><p>${parsed}</p></div>`;

    return { raw, parsed, format: "markdown" };
  }

  /**
   * Process HTML — output as-is in view mode.
   */
  private static processHtml(raw: string): BKCraftEngineResult {
    return { raw, parsed: raw, format: "html" };
  }

  /**
   * Process Tailwind — output with tailwind class names.
   */
  private static processTailwind(raw: string): BKCraftEngineResult {
    // Pass through as-is, tailwind classes will be applied
    return { raw, parsed: raw, format: "tailwind" };
  }

  /**
   * Process CSV — render as an HTML table.
   */
  private static processCsv(raw: string): BKCraftEngineResult {
    const lines = raw
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      return { raw, parsed: "<p>No data</p>", format: "csv" };
    }

    const headers = lines[0].split(",").map((h) => h.trim());
    const rows = lines.slice(1).map((line) =>
      line.split(",").map((c) => c.trim()),
    );

    let html = '<div class="bk-craft-table-wrapper overflow-x-auto">';
    html +=
      '<table class="min-w-full divide-y divide-gray-200 border border-gray-300">';

    // Header
    html += "<thead><tr>";
    for (const header of headers) {
      html +=
        `<th class="px-4 py-2 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${header}</th>`;
    }
    html += "</tr></thead>";

    // Body
    html += '<tbody class="divide-y divide-gray-200">';
    for (const row of rows) {
      html += "<tr>";
      for (const cell of row) {
        html += `<td class="px-4 py-2 text-sm text-gray-700">${cell}</td>`;
      }
      html += "</tr>";
    }
    html += "</tbody></table></div>";

    return { raw, parsed: html, format: "csv" };
  }

  /**
   * Process JSON — format and prettify.
   */
  private static processJson(raw: string): BKCraftEngineResult {
    try {
      const parsed = JSON.stringify(JSON.parse(raw), null, 2);
      const html = `<pre class="bk-craft-json bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm"><code>${parsed}</code></pre>`;
      return { raw, parsed: html, format: "json" };
    } catch {
      // If not valid JSON, wrap in pre tag
      const html = `<pre class="bk-craft-json bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm"><code>${raw}</code></pre>`;
      return { raw, parsed: html, format: "json" };
    }
  }

  /**
   * Process imageList — extract image links from supported sources.
   */
  private static processImageList(raw: string): BKCraftEngineResult {
    const urlPattern = /https?:\/\/[^\s"')>]+/g;
    const foundUrls = raw.match(urlPattern) || [];

    const images: BKCraftEngineResult["images"] = [];
    const sourceNames = IMAGE_SOURCES.map((s) => s.name.toLowerCase());

    for (const url of foundUrls) {
      const source = IMAGE_SOURCES.find((s) =>
        url.toLowerCase().includes(s.name.toLowerCase()),
      )?.name || "Unknown";

      // Only include images from known sources or image extensions
      const isImageExtension = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);
      const isKnownSource = sourceNames.some((s) =>
        url.toLowerCase().includes(s),
      );

      if (isKnownSource || isImageExtension) {
        images.push({
          src: url,
          alt: `Image from ${source}`,
          source,
        });
      }
    }

    // Build gallery HTML
    let html = '<div class="bk-craft-image-grid grid grid-cols-2 md:grid-cols-3 gap-4">';
    for (const img of images) {
      html += `<div class="bk-craft-image-item">
        <a href="${img.src}" target="_blank" rel="noopener noreferrer">
          <img src="${img.src}" alt="${img.alt}" class="w-full h-48 object-cover rounded-lg shadow-md hover:shadow-xl transition-shadow" loading="lazy" />
          <span class="block text-xs text-gray-500 mt-1">Source: ${img.source}</span>
        </a>
      </div>`;
    }
    html += "</div>";

    if (images.length === 0) {
      if (foundUrls.length > 0) {
        // Show all found URLs as clickable links so user can visit the source sites
        const links = foundUrls
          .map(
            (url) =>
              `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline block mb-1 break-all">${url}</a>`,
          )
          .join("");
        html = `<div class="space-y-1 text-sm">${links}</div>`;
      } else {
        html = `<p class="text-gray-500 italic">No images or links found.</p>`;
      }
    }

    return { raw, parsed: html, format: "imageList", images };
  }

  /**
   * Process Mermaid — wrap in mermaid container.
   */
  private static processMermaid(raw: string): BKCraftEngineResult {
    // Extract mermaid diagram code if wrapped in fences
    const mermaidMatch = raw.match(/```mermaid\n?([\s\S]*?)```/);
    const diagram = mermaidMatch ? mermaidMatch[1].trim() : raw.trim();

    const html = `<div class="bk-craft-mermaid bg-white p-4 rounded-lg">
      <pre class="mermaid">${diagram}</pre>
    </div>`;

    return { raw, parsed: html, format: "mermaid" };
  }

  /**
   * Process plain text — no formatting.
   */
  private static processPlain(raw: string): BKCraftEngineResult {
    const html = `<div class="bk-craft-plain whitespace-pre-wrap font-mono text-sm">${raw}</div>`;
    return { raw, parsed: html, format: "plain" };
  }

  /**
   * Process Architecture — markdown document for agentic coding setup.
   * Generates Architecture.md describing system architecture for AI agents to read.
   */
  private static processArchitecture(raw: string): BKCraftEngineResult {
    // Wrap in a styled markdown container — content rendered via ReactMarkdown in the UI
    const html = `<div class="bk-craft-architecture prose prose-sm max-w-none">${raw}</div>`;
    return { raw, parsed: html, format: "architecture" };
  }

  /**
   * Process AgentSwarm — markdown document for agent behavioral guidelines.
   * Generates Agent.md compatible with agentic coding conventions (CLAUDE.md, AGENTS.md).
   */
  private static processAgentSwarm(raw: string): BKCraftEngineResult {
    const html = `<div class="bk-craft-agent-swarm prose prose-sm max-w-none">${raw}</div>`;
    return { raw, parsed: html, format: "agentSwarm" };
  }

  /**
   * Process Docker — YAML output for docker-compose configuration.
   * Displayed in Monaco editor with YAML syntax highlighting.
   */
  private static processDocker(raw: string): BKCraftEngineResult {
    // Wrap YAML content in a pre/code block for raw fallback rendering
    const escaped = raw
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">");
    const html = `<div class="bk-craft-docker"><pre class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm"><code>${escaped}</code></pre></div>`;
    return { raw, parsed: html, format: "docker" };
  }
}
