// ───────────────────────────────────────────────────────────────────────────────
// Render Module — Image Adapter
//
// Wraps an image URL or base64 data in an <img> HTML tag for export.
// React rendering is handled by RenderModule.View.tsx.
// ───────────────────────────────────────────────────────────────────────────────

import type { RenderAdapter, RenderHtmlResult, RenderOptions } from "../RenderModule.Types";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, "&#34;")
    .replace(/'/g, "&#039;");
}

/**
 * Extract image source URL from raw content, stripping optional markdown image syntax.
 */
function extractImageSrc(raw: string): string {
  // Handle markdown image syntax: ![alt](url)
  const mdMatch = raw.match(/!\[.*?\]\((.*?)\)/);
  if (mdMatch) return mdMatch[1].trim();
  // Handle HTML img tag
  const htmlMatch = raw.match(/<img[^>]+src=["']([^"']+)["']/);
  if (htmlMatch) return htmlMatch[1].trim();
  // Plain URL or data URI
  return raw.trim();
}

/**
 * Extract optional alt text from raw content.
 */
function extractAlt(raw: string): string {
  const mdMatch = raw.match(/!\[(.*?)\]/);
  if (mdMatch) return mdMatch[1].trim();
  const htmlMatch = raw.match(/<img[^>]+alt=["']([^"']+)["']/);
  if (htmlMatch) return htmlMatch[1].trim();
  return "";
}

/**
 * Extract optional caption from raw content (text after the URL on a new line).
 */
function extractCaption(raw: string): string {
  const parts = raw.split("\n").filter((l) => l.trim());
  if (parts.length > 1) {
    // If there's text after the URL line, it's a caption
    const afterUrl = parts.slice(1).join(" ").trim();
    if (afterUrl && !afterUrl.startsWith("http") && !afterUrl.startsWith("data:")) {
      return afterUrl;
    }
  }
  return "";
}

/**
 * Image Adapter
 *
 * Wraps image content in an <img> tag with optional caption and alt text.
 * Supports plain URLs, markdown image syntax, and HTML img tags.
 */
export const imageAdapter: RenderAdapter = {
  format: "image",
  displayName: "Image",
  description: "Displays an image from a URL or data URI with optional caption.",

  renderHtml(content: string, _options?: RenderOptions): RenderHtmlResult {
    const src = extractImageSrc(content);
    const alt = extractAlt(content) || "Image";
    const caption = extractCaption(content);

    let html = `<div class="rm-image" style="margin:1rem 0;text-align:center;">`;
    html += `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" style="max-width:100%;height:auto;border-radius:10px;box-shadow:0 2px 12px rgba(0,0,0,0.08);" loading="lazy" />`;
    if (caption) {
      html += `<p style="margin-top:0.5rem;font-size:0.8rem;color:#64748b;font-style:italic;">${escapeHtml(caption)}</p>`;
    }
    html += `</div>`;

    return { raw: content, html, format: "image" };
  },
};
