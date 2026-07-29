/**
 * BLExportHTMLService - HTML export service for Bunny Legacy books.
 *
 * Single Responsibility: Generate self-contained HTML files with
 * Tailwind CSS, sidebar navigation, quick-routing index, and
 * per-chapter anchor links for fast navigation.
 *
 * Styled to match BLApp's teal design system (#007399).
 * Desktop: sidebar fixed to the left.
 * Mobile: hamburger button slides sidebar in from the left.
 *
 * Inspired by book-builder.export.service.interactive.ts
 *
 * Logic layer — templates live in BLOutputConstant.
 */

import { marked, Renderer } from "marked";
import type { IBLGeneration, IBLChapter } from "./BLEntity";
import { BLOutputConstant } from "./BLOutputConstant";

export class BLExportHTMLService {
  /** Teal primary color matching BLApp theme */
  private static readonly TEAL = "#007399";
  private static readonly TEAL_DARK = "#00557a";
  private static readonly TEAL_SOFT = "#e6f4f8";
  private static readonly TEAL_SUBTLE = "#f0f8fb";

  /**
   * Creates a custom marked Renderer that applies the theme's Tailwind
   * classes to each HTML element — replaces the old prose-based approach.
   */
  private static createThemeRenderer(): Renderer {
    const renderer = new Renderer();

    // ── Headings ───────────────────────────────────────────────────
    renderer.heading = function (this: Renderer, token) {
      const classes: Record<number, string> = {
        1: "text-xl font-bold text-[lab(44.7267%_-21.5987_-26.118)] mt-6 mb-3 pb-1 border-b border-[#e0e0e0]",
        2: "text-lg font-bold text-[lab(44.7267%_-21.5987_-26.118)] mt-5 mb-2",
        3: "text-base font-semibold text-[#1a1a1a] mt-4 mb-1",
        4: "text-sm font-semibold text-[#1a1a1a] mt-3 mb-1",
      };
      const cls = classes[token.depth] ?? "";
      return `<h${token.depth} class="${cls}">${this.parser.parseInline(token.tokens)}</h${token.depth}>`;
    };

    // ── Paragraph ──────────────────────────────────────────────────
    renderer.paragraph = function (this: Renderer, token) {
      return `<p class="my-2 text-[#1a1a1a]">${this.parser.parseInline(token.tokens)}</p>`;
    };

    // ── Lists ──────────────────────────────────────────────────────
    renderer.list = function (this: Renderer, token) {
      const tag = token.ordered ? "ol" : "ul";
      const cls = token.ordered
        ? "list-decimal pl-4 sm:pl-6 my-2 text-[#1a1a1a] space-y-1"
        : "list-disc pl-4 sm:pl-6 my-2 text-[#1a1a1a] space-y-1";
      const items = token.items.map((item) => this.listitem(item)).join("");
      return `<${tag} class="${cls}">${items}</${tag}>`;
    };

    renderer.listitem = function (this: Renderer, token) {
      const content =
        token.tokens.length === 1 && token.tokens[0].type === "paragraph"
          ? this.parser.parseInline((token.tokens[0] as any).tokens)
          : this.parser.parse(token.tokens);
      return `<li>${content}</li>`;
    };

    // ── Code (block) ───────────────────────────────────────────────
    renderer.code = function (_token) {
      const escaped = _token.text
        .replace(/&/g, "&")
        .replace(/</g, "<")
        .replace(/>/g, ">");
      return `<pre class="bg-transparent p-0 m-0 overflow-x-auto"><code class="block bg-[#f8f8f8] text-[#1a1a1a] p-3 sm:p-4 rounded-lg text-xs font-mono overflow-x-auto my-3 border border-[#e0e0e0]">${escaped}</code></pre>`;
    };

    // ── Codespan (inline code) ─────────────────────────────────────
    renderer.codespan = function (_token) {
      return `<code class="bg-[#f0f0f0] text-[#e06c75] px-1.5 py-0.5 rounded text-xs font-mono">${_token.text}</code>`;
    };

    // ── Blockquote ─────────────────────────────────────────────────
    renderer.blockquote = function (this: Renderer, token) {
      return `<blockquote class="border-l-4 border-[lab(44.7267%_-21.5987_-26.118)] pl-3 sm:pl-4 my-3 italic text-[#666666]">${this.parser.parse(token.tokens)}</blockquote>`;
    };

    // ── Link ───────────────────────────────────────────────────────
    renderer.link = function (this: Renderer, token) {
      const href = token.href || "";
      return `<a href="${href}" class="text-[lab(65%_-18_-22)] hover:underline hover:text-[lab(44.7267%_-21.5987_-26.118)] transition-colors" target="_blank" rel="noopener noreferrer">${this.parser.parseInline(token.tokens)}</a>`;
    };

    // ── Thematic break (hr) ────────────────────────────────────────
    renderer.hr = function () {
      return `<hr class="border-[#e0e0e0] my-4" />`;
    };

    // ── Table ──────────────────────────────────────────────────────
    renderer.table = function (this: Renderer, token) {
      const header = token.header
        .map((cell) => this.tablecell(cell))
        .join("");
      const headerRow = `<tr>${header}</tr>`;
      const bodyRows = token.rows
        .map((row) => {
          const cells = row.map((cell) => this.tablecell(cell)).join("");
          return `<tr>${cells}</tr>`;
        })
        .join("");
      return `<div class="overflow-x-auto my-3"><table class="min-w-full border-collapse border border-[#e0e0e0] text-xs sm:text-sm"><thead>${headerRow}</thead><tbody>${bodyRows}</tbody></table></div>`;
    };

    renderer.tablecell = function (this: Renderer, token) {
      const tag = token.header ? "th" : "td";
      const cls = token.header
        ? "border border-[#e0e0e0] bg-[#f5f5f5] text-[lab(44.7267%_-21.5987_-26.118)] px-2 sm:px-3 py-1.5 font-semibold text-left"
        : "border border-[#e0e0e0] px-2 sm:px-3 py-1.5 text-[#1a1a1a]";
      const content = this.parser.parseInline(token.tokens);
      return `<${tag} class="${cls}">${content}</${tag}>`;
    };

    // ── Image ──────────────────────────────────────────────────────
    renderer.image = function (_token) {
      const src = _token.href || "";
      const alt = _token.text || "";
      return `<img src="${src}" alt="${alt}" class="max-w-full rounded-lg my-3" />`;
    };

    return renderer;
  }

  /**
   * Generates a self-contained HTML file with Tailwind CSS,
   * sidebar navigation, quick-routing index, and chapter anchor links.
   * Uses the theme renderer from createThemeRenderer() and
   * delegates all template markup to BLOutputConstant.
   */
  static async generateHTML(
    book: IBLGeneration,
    chapters: IBLChapter[],
  ): Promise<string> {
    const sortedChapters = [...chapters].sort((a, b) => a.number - b.number);
    const teal = this.TEAL;
    const tealDark = this.TEAL_DARK;

    // ── Set up the theme renderer for marked ───────────────────────
    const renderer = this.createThemeRenderer();

    // ── Sidebar Navigation ──────────────────────────────────────────
    const sidebarLinks = sortedChapters
      .map(
        (ch) => `
        <li>
          <a href="#chapter-${ch.number}"
             class="group flex items-center py-2 text-sm text-slate-600 hover:text-[${teal}] transition-all duration-200">
            <span class="mr-3 text-[10px] font-mono text-slate-300 group-hover:text-[${teal}] font-semibold">${ch.number.toString().padStart(2, "0")}</span>
            <span class="truncate">${this.escapeHtml(ch.title)}</span>
          </a>
        </li>`,
      )
      .join("");

    // ── Quick Routing Index ─────────────────────────────────────────
    const mainIndexHtml = sortedChapters
      .map(
        (ch) => `
        <a href="#chapter-${ch.number}" class="group block py-4 border-b border-[${teal}]/10 hover:bg-[${teal}]/5 transition-colors px-2 rounded-lg">
            <div class="flex justify-between items-center">
                <span class="text-slate-900 font-medium group-hover:text-[${teal}] transition-colors">${ch.number}. ${this.escapeHtml(ch.title)}</span>
                <span class="text-[${teal}]/40 font-mono text-xs group-hover:text-[${teal}] transition-colors">Jump to &#8594;</span>
            </div>
        </a>`,
      )
      .join("");

    // ── Chapter Content ─────────────────────────────────────────────
    const contentHtml = await Promise.all(
      sortedChapters.map(async (ch) => {
        const sanitizedContent = (ch.content || "_Content not generated yet._")
          .replace(/\$\\rightarrow\$/g, "\u2192")
          .replace(/\\rightarrow/g, "\u2192");
        const parsedContent = await marked.parse(sanitizedContent, {
          renderer,
        });

        return BLOutputConstant.chapter({
          number: ch.number,
          title: this.escapeHtml(ch.title),
          content: parsedContent,
          teal,
          tealDark,
        });
      }),
    );

    // ── Assemble final document via template constant ───────────────
    return BLOutputConstant.baseLine({
      title: this.escapeHtml(book.title),
      description: book.description ? this.escapeHtml(book.description) : null,
      sidebarLinks,
      mainIndexHtml,
      contentHtml: contentHtml.join(""),
      teal,
      tealDark,
      tealSoft: this.TEAL_SOFT,
      tealSubtle: this.TEAL_SUBTLE,
    });
  }

  /**
   * Triggers a browser download of the HTML file.
   */
  static downloadHTML(html: string, filename: string): void {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename.endsWith(".html") ? filename : `${filename}.html`;
    link.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Escapes HTML entities to prevent injection.
   */
  private static escapeHtml(str: string): string {
    return str
      .replace(/&/g, "\x26amp;")
      .replace(/</g, "\x26lt;")
      .replace(/>/g, "\x26gt;")
      .replace(/\u0022/g, "\x26quot;")
      .replace(/\u0027/g, "\x26#039;");
  }
}
