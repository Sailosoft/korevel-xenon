import { BUIBookHTMLTemplate } from "../bui.book.export.types";

export const BUIHTMLTemplateMobile: BUIBookHTMLTemplate = {
  name: "Mobile Template",
  description: "A mobile-optimized template for book exports",
  globalAsset: {
    typographyFonts: `
    @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600&display=swap');
    body { font-family: 'Sora', sans-serif; background-color: #f1f5f9; }
    `,
    printStyles: `@media print { .no-print { display: none !important; } }`,
  },
  layout: {
    documentShell: `<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>{{bookTitle}}</title>
    <script src="https://cdn.tailwindcss.com?plugins=typography"></script>
    <style>{{{globalAssets.typographyFonts}}}{{{globalAssets.printStyles}}}</style>
</head>
<body class="text-slate-900 antialiased">
    <div class="max-w-md mx-auto min-h-screen bg-white shadow-2xl flex flex-col justify-between border-x border-slate-200/60">
        {{{sidebarContainer}}}
        {{{mainContentWrapper}}}
    </div>
</body>
</html>`,
    sidebarContainer: `
    <div id="mob-menu" class="no-print hidden fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50" onclick="this.classList.add('hidden')">
        <aside class="w-4/5 max-w-xs h-full bg-white p-6 overflow-y-auto" onclick="event.stopPropagation()">
            <div class="flex justify-between items-center mb-6">
                <span class="font-bold text-sm tracking-wide text-slate-400 uppercase">Chapters</span>
                <button onclick="document.getElementById('mob-menu').classList.add('hidden')" class="text-xs font-bold px-2 py-1 bg-slate-100 rounded">Close</button>
            </div>
            <ul class="space-y-1" onclick="document.getElementById('mob-menu').classList.add('hidden')">
                {{{sidebarLinks}}}
            </ul>
        </aside>
    </div>`,
    mainContentWrapper: `
    <main class="flex-1 flex flex-col">
        <div class="no-print h-14 bg-slate-900 text-white flex items-center justify-between px-4 sticky top-0 z-40 shadow-sm">
            <span class="text-sm font-semibold truncate pr-4">{{bookTitle}}</span>
            <button onclick="document.getElementById('mob-menu').classList.remove('hidden')" class="bg-slate-800 text-xs px-3 py-1.5 rounded font-medium shrink-0">Menu</button>
        </div>
        <div class="p-4 flex-1">
            {{{mainHeaderWrapper}}}
            {{{articleContainer}}}
        </div>
        {{{pageFooter}}}
    </main>`,
    mainHeaderWrapper: `
    <header id="bunny-quick-routing" class="bg-gradient-to-br from-slate-50 to-slate-100/60 border border-slate-200/60 rounded-xl p-5 mb-6 text-center scroll-mt-20">
        <h1 class="text-2xl font-bold tracking-tight text-slate-900">{{bookTitle}}</h1>
        <div class="w-10 h-1 bg-slate-900 mx-auto my-3 rounded-full"></div>
        <div class="text-left mt-4">
            <span class="text-[10px] font-bold text-slate-400 tracking-wider uppercase block mb-2">Quick Access Nav</span>
            <div class="flex flex-col gap-1 max-h-40 overflow-y-auto">{{{mainIndexHtml}}}</div>
        </div>
    </header>`,
    articleContainer: `<article class="space-y-8">{{{chaptersHtml}}}</article>`,
  },
  component: {
    sidebarLinkItem: `
    <li>
      <a href="#chapter-{{chapterNumber}}" class="block py-2 px-3 text-sm text-slate-700 hover:bg-slate-50 rounded-lg border-b border-slate-100">
         <span class="font-mono text-xs text-slate-400 mr-2">{{paddedChapterNumber}}</span>{{chapterTitle}}
      </a>
    </li>`,
    mainIndexLinkItem: `
    <a href="#chapter-{{chapterNumber}}" class="block p-2 text-xs font-medium rounded-lg bg-white border border-slate-200 truncate active:bg-slate-50">
        {{chapterNumber}}. {{chapterTitle}}
    </a>`,
    chapterHeader: `
    <header class="mb-3">
      <div class="flex items-center justify-between">
        <span class="text-[10px] font-bold tracking-widest text-indigo-600 uppercase">CH. {{chapterNumber}}</span>
        <a href="#bunny-quick-routing" class="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 hover:text-indigo-600 active:bg-indigo-50 px-2 py-1 rounded transition-colors no-print">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
          Index
        </a>
      </div>
      <h2 class="text-xl font-bold text-slate-900 leading-tight mt-0.5">{{chapterTitle}}</h2>
    </header>`,
    chapterBodyWrapper: `
    <section id="chapter-{{chapterNumber}}" class="scroll-mt-16 bg-white border border-slate-100 p-4 rounded-xl shadow-xs">
        {{{chapterHeader}}}
        <div class="prose prose-sm max-w-none text-slate-700 leading-relaxed prose-p:my-2">
            {{{parsedContent}}}
        </div>
    </section>`,
    pageFooter: `
    <footer class="bg-slate-50 border-t border-slate-200 p-4 text-center text-[10px] font-mono text-slate-400 tracking-wide mt-12">
        &copy; {{currentYear}} Mobile Reader Portal
    </footer>`,
  },
};
