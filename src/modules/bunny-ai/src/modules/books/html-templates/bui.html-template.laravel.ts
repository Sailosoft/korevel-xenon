import { BUIBookHTMLTemplate } from "../bui.book.export.types";

export const BUIHTMLTemplateLaravel: BUIBookHTMLTemplate = {
  name: "Laravel Docs Template",
  description: "A template inspired by the official Laravel documentation style",
  globalAsset: {
    typographyFonts: `
    @import url('https://fonts.googleapis.com/css2?family=Figtree:wght@300;400;500;600;700&display=swap');
    body { font-family: 'Figtree', sans-serif; background-color: #f8fafc; }
    `,
    printStyles: `@media print { .no-print, .sticky-nav { display: none !important; } .laravel-body { margin-left: 0 !important; top: 0 !important; } }`,
  },
  layout: {
    documentShell: `<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
    <meta charset="UTF-8">
    <title>{{bookTitle}}</title>
    <script src="https://cdn.tailwindcss.com?plugins=typography"></script>
    <style>{{{globalAssets.typographyFonts}}}{{{globalAssets.printStyles}}}</style>
</head>
<body class="text-slate-900 antialiased">
    <div class="sticky-nav no-print fixed top-0 inset-x-0 h-16 bg-white border-b border-slate-100 flex items-center justify-between px-6 z-40">
        <div class="flex items-center gap-3">
            <button onclick="document.getElementById('laravel-sidebar').classList.toggle('hidden')" class="p-2 hover:bg-slate-50 rounded-lg lg:hidden">
                <svg class="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
            </button>
            <div class="flex items-center gap-2">
                <div class="w-7 h-7 bg-[#ff2d20] rounded-md flex items-center justify-center text-white font-bold text-xs shadow-sm shadow-red-200">L</div>
                <span class="font-semibold text-slate-900 text-sm hidden sm:block">{{bookTitle}} Documentation</span>
            </div>
        </div>
        <div class="text-xs text-slate-400 font-mono">v11.x</div>
    </div>

    <div class="pt-16 flex min-h-screen">
        {{{sidebarContainer}}}
        {{{mainContentWrapper}}}
    </div>
</body>
</html>`,
    sidebarContainer: `
    <aside id="laravel-sidebar" class="no-print fixed lg:sticky top-16 left-0 h-[calc(100vh-4rem)] w-64 bg-white border-r border-slate-100 p-6 overflow-y-auto z-30 hidden lg:block">
        <nav class="space-y-6">
            <div>
                <div class="text-xs font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">Getting Started</div>
                <ul class="space-y-1">{{{sidebarLinks}}}</ul>
            </div>
        </nav>
    </aside>`,
    mainContentWrapper: `
    <main class="laravel-body flex-1 min-w-0 bg-[#f8fafc]">
        <div class="max-w-4xl mx-auto py-12 px-6 md:px-12">
            {{{mainHeaderWrapper}}}
            {{{articleContainer}}}
            {{{pageFooter}}}
        </div>
    </main>`,
    mainHeaderWrapper: `
    <header class="mb-16 bg-white rounded-2xl border border-slate-200/50 p-8 shadow-sm">
        <span class="text-xs font-bold text-[#ff2d20] tracking-wider uppercase">Reference Manual</span>
        <h1 class="text-4xl font-bold tracking-tight text-slate-900 mt-1 mb-4">{{bookTitle}}</h1>
        <p class="text-sm text-slate-500 leading-relaxed">Select a submodule category routing target path node below to step straight into its parsed text content block instructions.</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-6 border-t border-slate-100 pt-6">{{{mainIndexHtml}}}</div>
    </header>`,
    articleContainer: `<article class="bg-white rounded-2xl border border-slate-200/50 p-8 md:p-12 shadow-sm">{{{chaptersHtml}}}</article>`,
  },
  component: {
    sidebarLinkItem: `
    <li>
      <a href="#chapter-{{chapterNumber}}" class="block px-3 py-1.5 text-sm font-medium rounded-lg text-slate-600 hover:text-[#ff2d20] hover:bg-red-50/40 transition-all">
         {{chapterTitle}}
      </a>
    </li>`,
    mainIndexLinkItem: `
    <a href="#chapter-{{chapterNumber}}" class="group flex items-center gap-2 p-2.5 rounded-xl border border-transparent hover:border-slate-100 hover:bg-slate-50 transition-all text-sm text-slate-700">
        <span class="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-[#ff2d20] transition-colors"></span>
        <span class="group-hover:text-[#ff2d20] transition-colors truncate">{{chapterTitle}}</span>
    </a>`,
    chapterHeader: `
    <header class="mb-6 border-b border-slate-100 pb-4">
      <h2 class="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
         <a href="#chapter-{{chapterNumber}}" class="text-[#ff2d20] font-mono text-lg font-medium opacity-80">#</a>
         {{chapterTitle}}
      </h2>
    </header>`,
    chapterBodyWrapper: `
    <section id="chapter-{{chapterNumber}}" class="mb-16 last:mb-0 scroll-mt-24">
        {{{chapterHeader}}}
        <div class="prose prose-slate max-w-none prose-p:leading-relaxed text-slate-700 prose-pre:bg-slate-900">
            {{{parsedContent}}}
        </div>
    </section>`,
    pageFooter: `
    <footer class="mt-16 pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-slate-400">
        <span>&copy; {{currentYear}} Laravel Docs Style Render. All rights reserved.</span>
        <span class="font-mono text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded">BUILD_SUCCESS</span>
    </footer>`,
  },
};
