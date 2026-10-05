import { BUIBookHTMLTemplate } from "../bui.book.export.types";

export const BUIHTMLTemplateBunny: BUIBookHTMLTemplate = {
  name: "Bunny Template",
  description: "Bunny-branded chapter list with pop-up modal reader",
  globalAsset: {
    typographyFonts: `
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
    body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #f8fafc; }
    body.bunny-locked { overflow: hidden; }

    /* --- Bunny modal reader --- */
    .bunny-modal {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 90;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      background: rgba(15, 23, 42, 0.55);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
    }
    .bunny-modal.open { display: flex; }
    .bunny-modal-panel {
      width: 100%;
      max-width: 64rem;
      max-height: 92vh;
      display: flex;
      flex-direction: column;
      background: #ffffff;
      border-radius: 1.25rem;
      box-shadow: 0 30px 60px -12px rgba(15, 23, 42, 0.35);
      overflow: hidden;
      animation: bunnyPop 0.22s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    .bunny-modal-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1.1rem 1.5rem;
      border-bottom: 1px solid #f1f5f9;
      background: linear-gradient(135deg, #ff2d20 0%, #f43f5e 100%);
      color: #ffffff;
    }
    .bunny-modal-body {
      padding: 1.5rem;
      overflow-y: auto;
      color: #334155;
      line-height: 1.7;
    }
    @keyframes bunnyPop {
      from { opacity: 0; transform: translateY(14px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    `,
    printStyles: `@media print { .no-print, .bunny-modal { display: none !important; } .bunny-main { margin-left: 0 !important; } }`,
  },
  layout: {
    documentShell: `<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{bookTitle}} - Bunny AI</title>
    <script src="https://cdn.tailwindcss.com?plugins=typography"></script>
    <style>{{{globalAssets.typographyFonts}}}{{{globalAssets.printStyles}}}</style>
</head>
<body class="text-slate-800 antialiased flex min-h-screen overflow-x-hidden">
    {{{sidebarContainer}}}
    <div class="flex-1 flex flex-col min-w-0">
        <header class="glass-header h-16 flex items-center justify-between px-6 md:px-8 z-40 sticky top-0 no-print bg-white/85 backdrop-blur-md border-b border-slate-100">
            <div class="flex items-center space-x-3">
                <div class="w-9 h-9 bg-gradient-to-br from-[#ff2d20] to-[#f43f5e] rounded-xl flex items-center justify-center shadow-md shadow-red-100">
                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"/></svg>
                </div>
                <span class="text-md font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#ff2d20] to-[#f43f5e]">Bunny AI — Reading Room</span>
            </div>
            <button onclick="document.getElementById('bunny-sidebar').classList.toggle('hidden')" class="md:hidden p-2 text-slate-500 hover:text-slate-900">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
            </button>
        </header>
        {{{mainContentWrapper}}}
    </div>

    <div id="bunny-modal" class="bunny-modal no-print" onclick="closeBunnyModal()">
        <div class="bunny-modal-panel" onclick="event.stopPropagation()">
            <div class="bunny-modal-head">
                <span class="text-sm md:text-base font-semibold tracking-wide">Bunny Reader</span>
                <button type="button" onclick="closeBunnyModal()" class="p-1.5 rounded-lg hover:bg-white/20 transition-colors" aria-label="Close reader">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>
            <div id="bunny-modal-body" class="bunny-modal-body prose prose-slate max-w-none prose-headings:text-slate-900 prose-headings:font-bold prose-a:text-[#ff2d20]"></div>
        </div>
    </div>

    <script>
        (function () {
            'use strict';

            window.openBunnyModal = function (chapterNumber) {
                var source = document.getElementById('chapter-source-' + chapterNumber);
                if (!source) return;

                var modal = document.getElementById('bunny-modal');
                var body = document.getElementById('bunny-modal-body');

                body.innerHTML = '';

                var clone = source.cloneNode(true);
                clone.removeAttribute('id');
                clone.classList.remove('hidden');

                body.appendChild(clone);

                modal.classList.add('open');
                document.body.classList.add('bunny-locked');
            };

            window.closeBunnyModal = function () {
                var modal = document.getElementById('bunny-modal');
                if (!modal) return;
                modal.classList.remove('open');
                document.getElementById('bunny-modal-body').innerHTML = '';
                document.body.classList.remove('bunny-locked');
            };

            document.addEventListener('keydown', function (event) {
                if (event.key === 'Escape') window.closeBunnyModal();
            });
        })();
    </script>
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
            <div class="bg-white border border-slate-100 rounded-xl p-3 flex items-center space-x-3 shadow-sm">
                <div class="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center font-bold text-xs text-[#ff2d20]">BA</div>
                <div class="overflow-hidden"><p class="text-xs font-semibold text-slate-800 truncate">Bunny Studio</p><p class="text-[10px] text-slate-400 truncate">Reader Tier</p></div>
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
    <header id="bunny-quick-routing" class="bg-white rounded-2xl border border-slate-100 p-6 md:p-8 shadow-sm scroll-mt-24">
        <div class="flex items-center gap-3 mb-2">
            <span class="text-[10px] font-bold text-[#ff2d20] bg-red-50 px-2.5 py-1 rounded-md uppercase tracking-wider">Collection</span>
        </div>
        <h1 class="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 mb-2">{{bookTitle}}</h1>
        <div class="h-1 w-12 bg-gradient-to-r from-[#ff2d20] to-[#f43f5e] rounded-full mb-6"></div>
        <p class="text-sm text-slate-500 mb-6">Select a chapter and press <span class="font-semibold text-slate-700">Preview</span> to read it in the reader.</p>
        <div class="space-y-2">{{{mainIndexHtml}}}</div>
    </header>`,
    articleContainer: `<div id="chapter-sources" class="hidden" aria-hidden="true">{{{chaptersHtml}}}</div>`,
  },
  component: {
    sidebarLinkItem: `
    <li>
      <a href="#chapter-{{chapterNumber}}" onclick="event.preventDefault(); openBunnyModal({{chapterNumber}});" class="flex items-center space-x-3 px-3 py-2 rounded-xl text-slate-600 hover:bg-red-50/60 hover:text-[#ff2d20] font-medium text-sm transition-colors group">
         <span class="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-[#ff2d20]"></span>
         <span class="truncate">{{chapterTitle}}</span>
      </a>
    </li>`,
    mainIndexLinkItem: `
    <div class="group flex items-start justify-between gap-3 p-3.5 bg-white border border-slate-100 rounded-xl hover:border-red-200 hover:shadow-sm transition-all">
        <div class="flex items-start gap-3 min-w-0">
            <span class="w-8 h-8 shrink-0 rounded-lg bg-red-50 text-[#ff2d20] text-xs font-bold flex items-center justify-center">{{chapterNumber}}</span>
            <div class="min-w-0">
                <span class="block text-sm font-semibold text-slate-800 truncate">{{chapterTitle}}</span>
                <p class="mt-1 text-xs text-slate-400 leading-relaxed line-clamp-2">{{chapterExcerpt}}</p>
            </div>
        </div>
        <button type="button" onclick="openBunnyModal({{chapterNumber}})" class="no-print shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-[#ff2d20] bg-red-50 hover:bg-[#ff2d20] hover:text-white px-3 py-1.5 rounded-lg transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
            Preview
        </button>
    </div>`,
    chapterHeader: `
    <header class="mb-6 pb-4 border-b border-slate-100">
      <span class="inline-block text-[10px] font-bold text-[#ff2d20] bg-red-50 px-2.5 py-0.5 rounded-md uppercase tracking-wider mb-2">Chapter {{chapterNumber}}</span>
      <h2 class="text-2xl font-bold text-slate-900 tracking-tight">{{chapterTitle}}</h2>
    </header>`,
    chapterBodyWrapper: `
    <section id="chapter-source-{{chapterNumber}}" class="hidden">
        <div class="prose prose-slate max-w-none text-slate-700 prose-p:leading-relaxed prose-headings:text-slate-900 prose-a:text-[#ff2d20]">
            {{{parsedContent}}}
        </div>
    </section>`,
    pageFooter: `
    <footer class="bg-white border border-slate-100 rounded-2xl p-4 flex justify-between items-center text-xs text-slate-400 no-print">
        <span class="inline-flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-emerald-500"></span>Bunny AI — Reading Room</span>
        <span class="font-mono text-[10px] uppercase">&copy; {{currentYear}} Bunny Engine</span>
    </footer>`,
  },
};
