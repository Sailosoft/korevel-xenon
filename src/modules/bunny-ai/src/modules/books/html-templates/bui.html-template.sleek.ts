import { BUIBookHTMLTemplate } from "../bui.book.export.types";

export const BUIHTMLTemplateSleek: BUIBookHTMLTemplate = {
  name: "Sleek Template",
  description: "A sleek and modern template for book exports",
  globalAsset: {
    typographyFonts: `
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;700&family=Space+Mono&display=swap');
    body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #fafafa; }
    .font-mono { font-family: 'Space Mono', monospace; }
    `,
    printStyles: `@media print { .no-print { display: none !important; } .content-area { margin-left: 0 !important; } }`,
  },
  layout: {
    documentShell: `<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{bookTitle}}</title>
    <script src="https://cdn.tailwindcss.com?plugins=typography"></script>
    <style>{{{globalAssets.typographyFonts}}}{{{globalAssets.printStyles}}}</style>
</head>
<body class="text-zinc-900 antialiased flex">
    {{{sidebarContainer}}}
    {{{mainContentWrapper}}}
</body>
</html>`,
    sidebarContainer: `
    <aside class="no-print fixed top-0 left-0 h-screen w-60 border-r border-zinc-200 bg-white p-6 overflow-y-auto hidden xl:block">
        <div class="mb-8 font-mono text-xs font-bold uppercase tracking-widest text-zinc-400">Index</div>
        <ul class="space-y-1.5">{{{sidebarLinks}}}</ul>
    </aside>`,
    mainContentWrapper: `
    <main class="content-area xl:ml-60 w-full min-h-screen flex flex-col justify-between">
        <div class="max-w-4xl mx-auto w-full pt-20 pb-32 px-6 md:px-12">
            {{{mainHeaderWrapper}}}
            {{{articleContainer}}}
        </div>
        {{{pageFooter}}}
    </main>`,
    mainHeaderWrapper: `
    <header id="bunny-quick-routing" class="mb-24 border-b border-zinc-100 pb-12 scroll-mt-24">
        <h1 class="text-5xl font-light tracking-tight text-zinc-950 mb-6">{{bookTitle}}</h1>
        <div class="mt-8">
            <span class="font-mono text-xs uppercase tracking-wider text-zinc-400 block mb-4">Outline Quick Jump</span>
            <div class="divide-y divide-zinc-100 border-t border-b border-zinc-100">{{{mainIndexHtml}}}</div>
        </div>
    </header>`,
    articleContainer: `<article class="space-y-24">{{{chaptersHtml}}}</article>`,
  },
  component: {
    sidebarLinkItem: `
    <li>
      <a href="#chapter-{{chapterNumber}}" class="flex items-baseline py-1 text-sm text-zinc-500 hover:text-zinc-950 transition-colors">
        <span class="font-mono text-xs w-6 text-zinc-300">{{paddedChapterNumber}}</span>
        <span class="truncate">{{chapterTitle}}</span>
      </a>
    </li>`,
    mainIndexLinkItem: `
    <a href="#chapter-{{chapterNumber}}" class="group flex justify-between items-center py-3.5 text-sm hover:text-zinc-600 transition-colors">
        <span class="text-zinc-800 font-medium">{{chapterNumber}} &mdash; {{chapterTitle}}</span>
        <span class="font-mono text-xs text-zinc-300 group-hover:translate-x-1 transition-transform">→</span>
    </a>`,
    chapterHeader: `
    <header class="mb-6">
      <div class="flex items-center justify-between mb-2">
        <div class="font-mono text-xs text-zinc-400">SECTION {{paddedChapterNumber}}</div>
        <a href="#bunny-quick-routing" class="inline-flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-zinc-950 hover:bg-zinc-50 px-2.5 py-1 rounded-lg transition-colors no-print">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
          Back to Index
        </a>
      </div>
      <h2 class="text-3xl font-medium tracking-tight text-zinc-950">{{chapterTitle}}</h2>
    </header>`,
    chapterBodyWrapper: `
    <section id="chapter-{{chapterNumber}}" class="scroll-mt-12">
        {{{chapterHeader}}}
        <div class="prose prose-zinc max-w-none prose-headings:font-normal text-zinc-800 leading-relaxed">
            {{{parsedContent}}}
        </div>
    </section>`,
    pageFooter: `
    <footer class="no-print border-t border-zinc-200 bg-white py-6 px-12 flex justify-between items-center text-xs font-mono text-zinc-400 w-full">
        <span>&copy; {{currentYear}} Layout Engine</span>
        <span>MDRN // MANUSCRIPT</span>
    </footer>`,
  },
};
