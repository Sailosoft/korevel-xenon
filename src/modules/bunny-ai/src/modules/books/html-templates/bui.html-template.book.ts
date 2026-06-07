import { BUIBookHTMLTemplate } from "../bui.book.export.types";

export const BUIHTMLTemplateBook: BUIBookHTMLTemplate = {
  name: "Book Template",
  description: "A template for book exports",
  globalAsset: {
    typographyFonts: `
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
    body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #f8fafc; }
    .glass-header { background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(12px); border-bottom: 1px solid #f1f5f9; }
    `,
    printStyles: `@media print { .no-print, .glass-header { display: none !important; } .bunny-main { margin-left: 0 !important; } }`,
  },
  layout: {
    documentShell: `<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
    <meta charset="UTF-8">
    <title>{{bookTitle}} - Bunny AI</title>
    <script src="https://cdn.tailwindcss.com?plugins=typography"></script>
    <style>{{{globalAssets.typographyFonts}}}{{{globalAssets.printStyles}}}</style>
</head>
<body class="text-slate-800 antialiased flex min-h-screen overflow-x-hidden">
    {{{sidebarContainer}}}
    <div class="flex-1 flex flex-col min-w-0">
        <header class="glass-header h-16 flex items-center justify-between px-6 md:px-8 z-40 sticky top-0 no-print">
            <div class="flex items-center space-x-3">
                <div class="w-9 h-9 bg-gradient-to-br from-[#ff2d20] to-[#f43f5e] rounded-xl flex items-center justify-center shadow-md shadow-red-100">
                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                </div>
                <span class="text-md font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#ff2d20] to-[#f43f5e]">Bunny AI — Workspace View</span>
            </div>
            <button onclick="document.getElementById('bunny-sidebar').classList.toggle('hidden')" class="md:hidden p-2 text-slate-500 hover:text-slate-900">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
            </button>
        </header>
        {{{mainContentWrapper}}}
    </div>
</body>
</html>`,
    sidebarContainer: `
    <aside id="bunny-sidebar" class="no-print fixed md:sticky top-0 left-0 h-screen w-72 bg-white border-r border-slate-100 flex flex-col z-50 hidden md:flex shrink-0">
        <div class="p-6 border-b border-slate-100 flex items-center space-x-3">
            <div class="w-10 h-10 bg-gradient-to-br from-[#ff2d20] to-[#f43f5e] rounded-xl flex items-center justify-center shadow-lg shadow-red-100">
                 <span class="text-white font-bold text-md">B</span>
            </div>
            <span class="text-lg font-bold text-slate-900">Bunny AI</span>
        </div>
        <nav class="flex-1 p-4 space-y-6 overflow-y-auto">
            <div>
                <div class="text-xs font-semibold uppercase tracking-wider text-slate-400 px-3 mb-2">Chapters Navigation</div>
                <ul class="space-y-1">{{{sidebarLinks}}}</ul>
            </div>
        </nav>
        <div class="p-4 border-t border-slate-100 bg-slate-50/50">
            <div class="bg-white border border-slate-100 rounded-xl p-3 flex items-center space-x-3 shadow-xs">
                <div class="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center font-bold text-xs text-[#ff2d20]">BA</div>
                <div class="overflow-hidden"><p class="text-xs font-semibold text-slate-800 truncate">Bunny Studio</p><p class="text-[10px] text-slate-400 truncate">Premium Compilation Tier</p></div>
            </div>
        </div>
    </aside>`,
    mainContentWrapper: `
    <main class="bunny-main flex-1 min-w-0 p-4 md:p-8 bg-[#f8fafc]">
        <div class="max-w-4xl mx-auto space-y-8">
            {{{mainHeaderWrapper}}}
            {{{articleContainer}}}
            {{{pageFooter}}}
        </div>
    </main>`,
    mainHeaderWrapper: `
    <header class="bg-white rounded-2xl border border-slate-100 p-6 md:p-8 shadow-xs">
        <h1 class="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 mb-2">{{bookTitle}}</h1>
        <div class="h-1 w-12 bg-gradient-to-r from-[#ff2d20] to-[#f43f5e] rounded-full mb-6"></div>
        <div class="bg-slate-50/70 border border-slate-100 rounded-xl p-4">
            <span class="text-[10px] font-bold text-slate-400 tracking-wider uppercase block mb-3">Compiled Book Index Links</span>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">{{{mainIndexHtml}}}</div>
        </div>
    </header>`,
    articleContainer: `<article class="bg-white rounded-2xl border border-slate-100 p-6 md:p-10 shadow-xs space-y-12">{{{chaptersHtml}}}</article>`,
  },
  component: {
    sidebarLinkItem: `
    <li>
      <a href="#chapter-{{chapterNumber}}" class="flex items-center space-x-3 px-3 py-2 rounded-xl text-slate-600 hover:bg-red-50/60 hover:text-[#ff2d20] font-medium text-sm transition-colors group">
         <span class="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-[#ff2d20]"></span>
         <span class="truncate">{{chapterTitle}}</span>
      </a>
    </li>`,
    mainIndexLinkItem: `
    <a href="#chapter-{{chapterNumber}}" class="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-white hover:border-red-200 hover:shadow-sm transition-all text-sm group">
        <span class="text-slate-700 font-medium truncate group-hover:text-[#ff2d20]">{{chapterNumber}}. {{chapterTitle}}</span>
        <span class="text-xs text-slate-300 group-hover:text-[#ff2d20] font-mono">→</span>
    </a>`,
    chapterHeader: `
    <header class="mb-4">
      <span class="inline-block text-[10px] font-bold text-[#ff2d20] bg-red-50 px-2.5 py-0.5 rounded-md mb-2">CHAPTER {{chapterNumber}}</span>
      <h2 class="text-2xl font-bold text-slate-900 tracking-tight">{{chapterTitle}}</h2>
    </header>`,
    chapterBodyWrapper: `
    <section id="chapter-{{chapterNumber}}" class="scroll-mt-24 border-b border-slate-100 pb-12 last:border-b-0 last:pb-0">
        {{{chapterHeader}}}
        <div class="prose prose-slate max-w-none text-slate-700 prose-p:leading-relaxed prose-headings:text-slate-900 prose-a:text-[#ff2d20]">
            {{{parsedContent}}}
        </div>
    </section>`,
    pageFooter: `
    <footer class="bg-white border border-slate-100 rounded-2xl p-4 flex justify-between items-center text-xs text-slate-400 no-print">
        <span>Generated via BunnyAI Outline Node Engine</span>
        <span class="font-mono text-[10px] uppercase">&copy; {{currentYear}} Engine</span>
    </footer>`,
  },
};
