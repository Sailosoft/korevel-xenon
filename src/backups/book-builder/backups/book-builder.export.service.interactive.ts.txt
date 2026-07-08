import BookBuilderExportService from "./book-builder.export.service";
import {
  IBookBuilderChapter,
  IBookBuilderGeneration,
} from "./book-builder.interface";
import { marked } from "marked";

export default class BookBuilderExportServiceInteractive extends BookBuilderExportService {
  static async generateTailwindHTML(
    book: IBookBuilderGeneration,
    chapters: IBookBuilderChapter[],
  ): Promise<string> {
    const sortedChapters = [...chapters].sort((a, b) => a.number - b.number);

    // Sidebar Navigation logic
    const sidebarLinks = sortedChapters
      .map(
        (ch) => `
        <li>
          <a href="#chapter-${ch.number}" 
             class="group flex items-center py-2 text-sm text-slate-500 hover:text-blue-600 transition-all duration-200">
            <span class="mr-3 text-[10px] font-mono text-slate-300 group-hover:text-blue-400">${ch.number.toString().padStart(2, "0")}</span>
            <span class="truncate">${ch.title}</span>
          </a>
        </li>`,
      )
      .join("");

    // Main Header Index logic (The "Routing" section under the title)
    const mainIndexHtml = sortedChapters
      .map(
        (ch) => `
        <a href="#chapter-${ch.number}" class="group block py-4 border-b border-slate-50 hover:bg-slate-50 transition-colors px-2">
            <div class="flex justify-between items-center">
                <span class="text-slate-900 font-medium group-hover:text-blue-600 transition-colors">${ch.number}. ${ch.title}</span>
                <span class="text-slate-300 font-mono text-xs group-hover:text-blue-400">Jump to →</span>
            </div>
        </a>`,
      )
      .join("");

    const contentHtml = await Promise.all(
      sortedChapters.map(async (ch) => {
        const sanitizedContent = (ch.content || "_Content not generated yet._")
          .replace(/\$\\rightarrow\$/g, "→")
          .replace(/\\rightarrow/g, "→");
        const parsedContent = await marked.parse(sanitizedContent);
        return `
        <section id="chapter-${ch.number}" class="mb-32 scroll-mt-20 chapter-break">
            <header class="mb-10">
              <span class="text-blue-600 font-mono text-xs font-semibold tracking-widest uppercase">Chapter ${ch.number}</span>
              <h2 class="text-4xl font-light text-slate-900 mt-2 tracking-tight italic">
                  ${ch.title}
              </h2>
            </header>
            <div class="prose prose-slate prose-lg max-w-none prose-headings:font-normal prose-p:leading-relaxed text-slate-800">
                ${parsedContent}
            </div>
        </section>
      `;
      }),
    );

    return `
<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${book.title}</title>
    <script src="https://cdn.tailwindcss.com?plugins=typography"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&family=JetBrains+Mono&display=swap');
        body { font-family: 'Inter', sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        @media print {
            .no-print { display: none !important; }
            .content-area { margin-left: 0 !important; padding: 0 !important; }
            .chapter-break { page-break-before: always; }
        }
    </style>
</head>
<body class="bg-white text-slate-900 antialiased">
    <aside class="no-print fixed top-0 left-0 h-screen w-64 bg-slate-50/50 border-r border-slate-100 p-8 overflow-y-auto hidden lg:block">
        <nav>
            <p class="text-[10px] font-bold text-slate-400 tracking-[0.2em] mb-4 uppercase">Navigation</p>
            <ul class="space-y-1">
                ${sidebarLinks}
            </ul>
        </nav>
    </aside>

    <main class="content-area lg:ml-64 min-h-screen">
        <div class="max-w-5xl mx-auto py-24 px-8 lg:px-12">
            <header class="mb-20">
                <h1 class="text-7xl font-extrabold text-slate-900 tracking-tighter leading-[0.9] mb-8">
                    ${book.title}
                </h1>
                <div class="h-1 w-20 bg-blue-600 mb-16"></div>
                
                <div class="mt-12 bg-white rounded-xl">
                    <p class="text-[10px] font-bold text-slate-400 tracking-[0.2em] mb-6 uppercase">Quick Routing</p>
                    <div class="grid grid-cols-1 gap-0">
                        ${mainIndexHtml}
                    </div>
                </div>
            </header>

            <article class="mt-40">
                ${contentHtml.join("")}
            </article>
            
            <footer class="mt-32 py-12 border-t border-slate-100 flex justify-between items-center text-slate-400 text-xs font-mono">
                <span>&copy; ${new Date().getFullYear()} Manuscript</span>
                <span class="uppercase tracking-widest">End of File</span>
            </footer>
        </div>
    </main>
</body>
</html>`;
  }
}
