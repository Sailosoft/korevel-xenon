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
 */

import { marked } from "marked";
import type { IBLGeneration, IBLChapter } from "./BLEntity";

export class BLExportHTMLService {
  /** Teal primary color matching BLApp theme */
  private static readonly TEAL = "#007399";
  private static readonly TEAL_DARK = "#00557a";
  private static readonly TEAL_SOFT = "#e6f4f8";
  private static readonly TEAL_SUBTLE = "#f0f8fb";

  /**
   * Generates a self-contained HTML file with Tailwind CSS,
   * sidebar navigation, quick-routing index, and chapter anchor links.
   */
  static async generateHTML(
    book: IBLGeneration,
    chapters: IBLChapter[],
  ): Promise<string> {
    const sortedChapters = [...chapters].sort((a, b) => a.number - b.number);
    const teal = this.TEAL;
    const tealDark = this.TEAL_DARK;

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
        const parsedContent = await marked.parse(sanitizedContent);
        return `
        <section id="chapter-${ch.number}" class="mb-32 scroll-mt-20 chapter-break">
            <header class="mb-10">
              <span class="text-[${teal}] font-mono text-xs font-semibold tracking-widest uppercase">Chapter ${ch.number}</span>
              <h2 class="text-4xl font-light text-slate-900 mt-2 tracking-tight italic">
                  ${this.escapeHtml(ch.title)}
              </h2>
            </header>
            <div class="prose prose-slate prose-lg max-w-none prose-headings:font-normal prose-p:leading-relaxed text-slate-800">
                ${parsedContent}
            </div>
            <div class="mt-12 pt-6 border-t border-[${teal}]/10 flex justify-end">
              <a href="#toc" class="text-sm text-[${teal}] hover:text-[${tealDark}] transition-colors no-print font-medium">
                &#11014; Back to Table of Contents
              </a>
            </div>
        </section>`;
      }),
    );

    return `<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.escapeHtml(book.title)}</title>
    <script src="https://cdn.tailwindcss.com?plugins=typography"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&family=JetBrains+Mono&display=swap');
        body { font-family: 'Inter', sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }

        /* Teal Design System (matching BLApp) */
        :root {
          --teal: ${teal};
          --teal-dark: ${tealDark};
          --teal-soft: ${this.TEAL_SOFT};
          --teal-subtle: ${this.TEAL_SUBTLE};
        }

        /* Sidebar Transition */
        .sidebar-panel {
          transform: translateX(-100%);
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .sidebar-panel.open {
          transform: translateX(0);
        }

        /* Mobile Overlay */
        .sidebar-overlay {
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s ease;
        }
        .sidebar-overlay.open {
          opacity: 1;
          pointer-events: auto;
        }

        /* Desktop sidebar always visible */
        @media (min-width: 1024px) {
          .sidebar-panel {
            transform: translateX(0) !important;
          }
          .sidebar-overlay {
            display: none !important;
          }
          .hamburger-btn {
            display: none !important;
          }
        }

        /* Print */
        @media print {
            .no-print { display: none !important; }
            .content-area { margin-left: 0 !important; padding: 0 !important; }
            .chapter-break { page-break-before: always; }
        }

        /* Sidebar Scrollbar */
        .sidebar-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .sidebar-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .sidebar-scroll::-webkit-scrollbar-thumb {
          background: var(--teal);
          border-radius: 999px;
        }
        .sidebar-scroll {
          scrollbar-width: thin;
          scrollbar-color: var(--teal) transparent;
        }

        /* TOC accent bar */
        .teal-accent-bar {
          width: 5rem;
          height: 4px;
          background: var(--teal);
          border-radius: 999px;
        }

        /* Gradient card (matches BLApp card style) */
        .toc-card {
          background: linear-gradient(135deg, rgba(255,255,255,1), rgba(255,255,255,0.8));
          border: 1px solid color-mix(in srgb, var(--teal) 15%, transparent);
          border-radius: 0.75rem;
        }
    </style>
</head>
<body class="bg-white text-slate-900 antialiased">
    <!-- Mobile Hamburger Button -->
    <button id="hamburgerBtn"
            class="hamburger-btn no-print fixed top-4 left-4 z-50 flex items-center justify-center w-10 h-10 rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl active:scale-95"
            style="background: linear-gradient(135deg, ${teal}, ${tealDark}); color: #fff; border: none;"
            onclick="toggleSidebar()"
            aria-label="Toggle navigation sidebar">
        <svg id="hamburgerIcon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
    </button>

    <!-- Mobile Overlay -->
    <div id="sidebarOverlay"
         class="sidebar-overlay no-print fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
         onclick="toggleSidebar()">
    </div>

    <!-- Sidebar Navigation -->
    <aside id="sidebarPanel"
           class="sidebar-panel no-print fixed inset-y-0 left-0 z-40 w-72 bg-gradient-to-b from-[${this.TEAL_SUBTLE}] to-white border-r border-[${teal}]/10 p-6 overflow-y-auto sidebar-scroll lg:translate-x-0 lg:!z-auto lg:!bg-[${this.TEAL_SUBTLE}]/50">
        <nav>
            <div class="flex items-center gap-2 mb-6 pb-4 border-b border-[${teal}]/10">
                <div class="w-2 h-2 rounded-full" style="background: ${teal};"></div>
                <p class="text-[10px] font-bold text-[${teal}] tracking-[0.2em] uppercase">Navigation</p>
            </div>
            <ul class="space-y-1">
                ${sidebarLinks}
            </ul>
        </nav>
    </aside>

    <!-- Main Content -->
    <main class="content-area lg:ml-72 min-h-screen">
        <div class="max-w-5xl mx-auto py-24 px-8 lg:px-12">
            <!-- Book Header / TOC -->
            <header class="mb-20" id="toc">
                <h1 class="text-7xl font-extrabold text-slate-900 tracking-tighter leading-[0.9] mb-8">
                    ${this.escapeHtml(book.title)}
                </h1>
                ${book.description ? `<p class="text-lg text-slate-500 font-light mb-8 max-w-2xl">${this.escapeHtml(book.description)}</p>` : ""}
                <div class="teal-accent-bar mb-16"></div>

                <div class="toc-card p-6">
                    <div class="flex items-center gap-2 mb-6">
                        <div class="p-1.5 rounded-lg" style="background: ${teal}15;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${teal}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>
                            </svg>
                        </div>
                        <p class="text-[10px] font-bold text-[${teal}] tracking-[0.2em] uppercase">Quick Routing</p>
                    </div>
                    <div class="grid grid-cols-1 gap-0">
                        ${mainIndexHtml}
                    </div>
                </div>
            </header>

            <!-- Chapters -->
            <article class="mt-40">
                ${contentHtml.join("")}
            </article>

            <!-- Footer -->
            <footer class="mt-32 py-12 border-t border-[${teal}]/10 flex flex-col sm:flex-row justify-between items-center gap-4 text-slate-400 text-xs font-mono">
                <span>&#169; ${new Date().getFullYear()} ${this.escapeHtml(book.title)}</span>
                <span class="uppercase tracking-widest">Generated with Korevel Xenon</span>
            </footer>
        </div>
    </main>

    <!-- Sidebar Toggle Script -->
    <script>
        function toggleSidebar() {
            var panel = document.getElementById('sidebarPanel');
            var overlay = document.getElementById('sidebarOverlay');
            var icon = document.getElementById('hamburgerIcon');
            panel.classList.toggle('open');
            overlay.classList.toggle('open');
            if (panel.classList.contains('open')) {
                icon.innerHTML = '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>';
            } else {
                icon.innerHTML = '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>';
            }
        }
        // Close sidebar when clicking a link on mobile
        document.querySelectorAll('#sidebarPanel a').forEach(function(link) {
            link.addEventListener('click', function() {
                if (window.innerWidth < 1024) {
                    toggleSidebar();
                }
            });
        });
    </script>
</body>
</html>`;
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
