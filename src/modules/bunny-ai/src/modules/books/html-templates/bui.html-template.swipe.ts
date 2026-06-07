import { BUIBookHTMLTemplate } from '../bui.book.export.types';

export const BUIHTMLTemplateSwipe: BUIBookHTMLTemplate = {
  name: "Swipe Template",
  description: "A swipe-based template for book exports",
  globalAsset: {
    typographyFonts: `
    @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,400;0,600;1,400&family=Lora:wght@400;500&display=swap');
    body { font-family: 'Lora', serif; background-color: #f4f1ea; }
    .prose { font-family: 'Crimson Pro', serif; }
    `,
    printStyles: `@media print { .no-print { display: none !important; } }`
  },
  layout: {
    documentShell: `<!DOCTYPE html>
<html lang="en" class="overflow-hidden h-full">
<head>
    <meta charset="UTF-8">
    <title>{{bookTitle}}</title>
    <script src="https://cdn.tailwindcss.com?plugins=typography"></script>
    <style>{{{globalAssets.typographyFonts}}}{{{globalAssets.printStyles}}}</style>
</head>
<body class="text-stone-900 antialiased h-full flex flex-col justify-between">
    <div class="flex flex-1 overflow-hidden relative">
        {{{sidebarContainer}}}
        {{{mainContentWrapper}}}
    </div>
    {{{pageFooter}}}
</body>
</html>`,
    sidebarContainer: `
    <aside class="no-print w-64 bg-stone-900 text-stone-300 p-6 overflow-y-auto hidden md:block border-r border-stone-800">
        <div class="text-[11px] font-mono tracking-widest text-stone-500 uppercase mb-4">Volume Registry</div>
        <ul class="space-y-2">{{{sidebarLinks}}}</ul>
    </aside>`,
    mainContentWrapper: `
    <main class="flex-1 overflow-x-auto snap-x snap-mandatory flex scroll-smooth h-full">
        <div id="book-cover" class="snap-start min-w-full flex-shrink-0 flex items-center justify-center p-8 bg-stone-100">
            {{{mainHeaderWrapper}}}
        </div>
        {{{articleContainer}}}
    </main>`,
    mainHeaderWrapper: `
    <div class="max-w-2xl text-center border-4 border-stone-800 p-12 bg-white shadow-xl rounded-sm">
        <h1 class="text-5xl font-semibold tracking-wide text-stone-900 mb-6">{{bookTitle}}</h1>
        <div class="w-16 h-0.5 bg-stone-800 mx-auto my-6"></div>
        <p class="text-sm italic text-stone-500 mb-8">Table of Contents</p>
        <div class="grid grid-cols-1 gap-2 text-left max-h-60 overflow-y-auto pr-2">{{{mainIndexHtml}}}</div>
        <div class="mt-8"><a href="#chapter-1" class="px-6 py-2.5 bg-stone-900 text-white rounded text-sm hover:bg-stone-800 transition-colors">Open Manuscript →</a></div>
    </div>`,
    articleContainer: `{{{chaptersHtml}}}`
  },
  component: {
    sidebarLinkItem: `
    <li>
      <a href="#chapter-{{chapterNumber}}" class="block py-1 text-sm hover:text-white transition-colors truncate">
         <span class="font-mono text-stone-500 mr-2">{{paddedChapterNumber}}</span> {{chapterTitle}}
      </a>
    </li>`,
    mainIndexLinkItem: `
    <a href="#chapter-{{chapterNumber}}" class="flex justify-between items-baseline py-1 border-b border-dashed border-stone-200 hover:text-stone-600">
        <span class="font-medium text-sm">{{chapterNumber}}. {{chapterTitle}}</span>
        <span class="text-xs font-mono text-stone-400">Read</span>
    </a>`,
    chapterHeader: `
    <header class="mb-8 border-b border-stone-200 pb-6 text-center">
      <span class="font-mono text-xs uppercase tracking-widest text-stone-400 block mb-1">Chapter {{chapterNumber}}</span>
      <h2 class="text-3xl font-medium text-stone-900 tracking-tight">{{chapterTitle}}</h2>
    </header>`,
    chapterBodyWrapper: `
    <section id="chapter-{{chapterNumber}}" class="snap-start min-w-full flex-shrink-0 flex flex-col justify-center items-center p-6 md:p-16 overflow-y-auto bg-stone-50/70">
        <div class="max-w-2xl w-full bg-white p-8 md:p-12 shadow-md rounded border border-stone-200/60 my-auto">
            {{{chapterHeader}}}
            <div class="prose prose-stone prose-lg max-w-none text-stone-800 leading-relaxed text-justify">
                {{{parsedContent}}}
            </div>
            <div class="mt-12 pt-6 border-t border-stone-100 flex justify-between no-print">
                 <a href="#chapter-{{chapterNumber}}" onclick="this.closest('main').scrollBy({left: -window.innerWidth, behavior: 'smooth'}); return false;" class="text-xs text-stone-400 hover:text-stone-900 font-mono">← Previous Page</a>
                 <a href="#chapter-{{chapterNumber}}" onclick="this.closest('main').scrollBy({left: window.innerWidth, behavior: 'smooth'}); return false;" class="text-xs text-stone-700 hover:text-stone-900 font-mono">Next Page →</a>
            </div>
        </div>
    </section>`,
    pageFooter: `
    <footer class="no-print bg-stone-900 border-t border-stone-800 py-3 px-6 flex justify-between items-center text-[11px] font-mono text-stone-400 w-full z-10">
        <span>{{bookTitle}}</span>
        <span>&copy; {{currentYear}} Folio Render</span>
    </footer>`
  }
};