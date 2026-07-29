/**
 * BLOutputConstant - Template constants for Bunny Legacy HTML export.
 *
 * Single Responsibility: Hold pure HTML template strings for the export output.
 * No logic, no data processing — only template markup with placeholder parameters.
 *
 * Theme: Tailwind CSS classes matching BLApp's design system.
 */

export interface BLBaseLineParams {
  title: string;
  description: string | null;
  sidebarLinks: string;
  mainIndexHtml: string;
  contentHtml: string;
  teal: string;
  tealDark: string;
  tealSoft: string;
  tealSubtle: string;
}

export interface BLChapterParams {
  number: number;
  title: string;
  content: string;
  teal: string;
  tealDark: string;
}

export class BLOutputConstant {
  /**
   * Full baseline HTML document shell.
   * Includes doctype, <head> with Tailwind CDN + custom CSS,
   * sidebar navigation, mobile hamburger menu, table of contents,
   * chapter content area, footer, and sidebar toggle script.
   */
  static baseLine(params: BLBaseLineParams): string {
    const { title, description, sidebarLinks, mainIndexHtml, contentHtml, teal, tealDark, tealSoft, tealSubtle } = params;

    return `<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <script src="https://cdn.tailwindcss.com?plugins=typography"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&family=JetBrains+Mono&display=swap');
        body { font-family: 'Inter', sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }

        /* Teal Design System (matching BLApp) */
        :root {
          --teal: ${teal};
          --teal-dark: ${tealDark};
          --teal-soft: ${tealSoft};
          --teal-subtle: ${tealSubtle};
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
           class="sidebar-panel no-print fixed inset-y-0 left-0 z-40 w-72 bg-gradient-to-b from-[${tealSubtle}] to-white border-r border-[${teal}]/10 p-6 overflow-y-auto sidebar-scroll lg:translate-x-0 lg:!z-auto lg:!bg-[${tealSubtle}]/50">
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
                    ${title}
                </h1>
                ${description ? `<p class="text-lg text-slate-500 font-light mb-8 max-w-2xl">${description}</p>` : ""}
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
                ${contentHtml}
            </article>

            <!-- Footer -->
            <footer class="mt-32 py-12 border-t border-[${teal}]/10 flex flex-col sm:flex-row justify-between items-center gap-4 text-slate-400 text-xs font-mono">
                <span>&#169; ${new Date().getFullYear()} ${title}</span>
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
   * Chapter section HTML template.
   * Renders a single chapter with anchor link, header, and content body.
   * Content is expected to be pre-rendered HTML (via marked with custom theme renderer).
   */
  static chapter(params: BLChapterParams): string {
    const { number, title, content, teal, tealDark } = params;

    return `
        <section id="chapter-${number}" class="mb-32 scroll-mt-20 chapter-break">
            <header class="mb-10">
              <span class="text-[${teal}] font-mono text-xs font-semibold tracking-widest uppercase">Chapter ${number}</span>
              <h2 class="text-4xl font-light text-slate-900 mt-2 tracking-tight italic">
                  ${title}
              </h2>
            </header>
            <div class="text-slate-800">
                ${content}
            </div>
            <div class="mt-12 pt-6 border-t border-[${teal}]/10 flex justify-end">
              <a href="#toc" class="text-sm text-[${teal}] hover:text-[${tealDark}] transition-colors no-print font-medium">
                &#11014; Back to Table of Contents
              </a>
            </div>
        </section>`;
  }
}
