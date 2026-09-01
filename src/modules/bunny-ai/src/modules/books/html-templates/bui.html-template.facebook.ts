import { BUIBookHTMLTemplate } from "../bui.book.export.types";

export const BUIHTMLTemplateFacebook: BUIBookHTMLTemplate = {
  name: "Facebook Inspired Template",
  description:
    "A Facebook-style social reader template with a hovering hamburger sidebar, blue theme, and per-chapter text-to-speech",
  globalAsset: {
    typographyFonts: `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Poppins:wght@600;700;800&display=swap');
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #F0F2F5;
      -webkit-tap-highlight-color: transparent;
    }
    h1, h2, h3, h4, h5, h6 { font-family: 'Poppins', 'Inter', sans-serif; }
    * { -webkit-tap-highlight-color: transparent; }

    /* Facebook-style scrollbar */
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: #F0F2F5; }
    ::-webkit-scrollbar-thumb { background: #BCC0C4; border-radius: 8px; }
    ::-webkit-scrollbar-thumb:hover { background: #8A8D91; }

    /* TTS active state pulse */
    .tts-btn.tts-active {
      background-color: #1877F2 !important;
      color: #ffffff !important;
      animation: tts-pulse 1.2s ease-in-out infinite;
    }
    @keyframes tts-pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(24, 119, 242, 0.45); }
      50% { box-shadow: 0 0 0 6px rgba(24, 119, 242, 0); }
    }
    `,
    printStyles: `@media print { .no-print { display: none !important; } body { background: #ffffff !important; } }`,
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
<body class="text-[#050505] antialiased bg-[#F0F2F5] min-h-screen flex flex-col">

    {{{sidebarContainer}}}
    {{{mainContentWrapper}}}

    <script>
        // ===== Hovering Hamburger Sidebar =====
        function openSidebar() {
            const sidebar = document.getElementById('fb-sidebar');
            const overlay = document.getElementById('fb-sidebar-overlay');
            if (sidebar) sidebar.classList.remove('-translate-x-full');
            if (overlay) overlay.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
        function closeSidebar() {
            const sidebar = document.getElementById('fb-sidebar');
            const overlay = document.getElementById('fb-sidebar-overlay');
            if (sidebar) sidebar.classList.add('-translate-x-full');
            if (overlay) overlay.classList.add('hidden');
            document.body.style.overflow = '';
        }
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') closeSidebar();
        });

        // ===== Per-Chapter Text-to-Speech =====
        var ttsActiveChapter = null;
        var ttsSpeaking = false;

        function toggleSpeech(chapterId) {
            if (!('speechSynthesis' in window)) {
                alert('Text-to-speech is not supported in this browser.');
                return;
            }
            var section = document.getElementById(chapterId);
            if (!section) return;
            var content = section.querySelector('.chapter-content');
            var text = (content ? content.textContent : section.textContent).trim();
            if (!text) return;

            // Toggle off if already speaking this chapter
            if (ttsSpeaking && ttsActiveChapter === chapterId) {
                window.speechSynthesis.cancel();
                ttsSpeaking = false;
                ttsActiveChapter = null;
                setTtsButtonState(chapterId, false);
                return;
            }

            window.speechSynthesis.cancel();
            var utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            utterance.rate = 1;
            utterance.pitch = 1;
            utterance.onend = function () {
                ttsSpeaking = false;
                ttsActiveChapter = null;
                setTtsButtonState(chapterId, false);
            };
            utterance.onerror = function () {
                ttsSpeaking = false;
                ttsActiveChapter = null;
                setTtsButtonState(chapterId, false);
            };
            window.speechSynthesis.speak(utterance);
            ttsSpeaking = true;
            ttsActiveChapter = chapterId;
            setTtsButtonState(chapterId, true);
        }

        function setTtsButtonState(chapterId, speaking) {
            document.querySelectorAll('.tts-btn').forEach(function (btn) {
                var isTarget = btn.getAttribute('data-chapter') === chapterId;
                btn.classList.toggle('tts-active', speaking && isTarget);
                var label = btn.querySelector('.tts-label');
                if (label) label.textContent = speaking && isTarget ? 'Stop' : 'Listen';
            });
        }
    </script>
</body>
</html>`,
    sidebarContainer: `
    <!-- Backdrop overlay -->
    <div id="fb-sidebar-overlay" class="no-print fixed inset-0 z-50 hidden bg-black/40 backdrop-blur-[2px]" onclick="closeSidebar()"></div>

    <!-- Hovering sidebar (slides over content on desktop & mobile) -->
    <aside id="fb-sidebar" class="no-print fixed top-0 left-0 z-[60] h-full w-80 max-w-[85vw] bg-white shadow-2xl transform -translate-x-full transition-transform duration-300 ease-in-out flex flex-col">
        <div class="flex items-center justify-between px-5 py-4 border-b border-[#DADDE1]">
            <div class="flex items-center gap-2.5 min-w-0">
                <div class="w-9 h-9 rounded-full bg-[#1877F2] text-white flex items-center justify-center shrink-0">
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                </div>
                <div class="min-w-0">
                    <span class="block text-sm font-bold text-[#050505] truncate">{{bookTitle}}</span>
                    <span class="block text-[10px] font-semibold text-[#65676B] uppercase tracking-wider">Chapters</span>
                </div>
            </div>
            <button onclick="closeSidebar()" class="p-2 rounded-full text-[#65676B] hover:bg-[#F0F2F5] transition-colors" aria-label="Close menu">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
        </div>

        <nav class="flex-1 overflow-y-auto px-3 py-4">
            <span class="text-[11px] font-bold text-[#65676B] uppercase tracking-widest px-3 mb-2 block">Jump to Section</span>
            <ul class="space-y-1">
                {{{sidebarLinks}}}
            </ul>
        </nav>

        <div class="px-5 py-4 border-t border-[#DADDE1] bg-[#F7F8FA]">
            <div class="flex items-center gap-2.5">
                <span class="w-2 h-2 rounded-full bg-[#31A24C] animate-pulse"></span>
                <span class="text-xs font-semibold text-[#65676B]">Reader Mode Active</span>
            </div>
        </div>
    </aside>`,
    mainContentWrapper: `
    <main class="flex-1 min-w-0 flex flex-col">
        <!-- Sticky Facebook-style top bar -->
        <header class="no-print sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-[#DADDE1] shadow-sm">
            <div class="max-w-4xl xl:max-w-6xl mx-auto px-3 sm:px-4 h-14 flex items-center gap-3">
                <button onclick="openSidebar()" class="p-2 -ml-2 rounded-full text-[#050505] hover:bg-[#F0F2F5] transition-colors" aria-label="Open menu">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
                </button>
                <div class="flex items-center gap-2 min-w-0">
                    <div class="w-7 h-7 rounded-full bg-[#1877F2] text-white flex items-center justify-center shrink-0">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                    </div>
                    <span class="text-sm font-bold text-[#050505] truncate">{{bookTitle}}</span>
                </div>
                <div class="ml-auto flex items-center gap-2">
                    <a href="#bunny-quick-routing" class="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-[#1877F2] bg-[#E7F3FF] hover:bg-[#D8EBFF] px-3.5 py-1.5 rounded-full transition-all">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M3 12h18M3 12l6-6M3 12l6 6"/></svg>
                        Index
                    </a>
                </div>
            </div>
        </header>

        <div class="flex-1">
            <div class="max-w-4xl xl:max-w-6xl mx-auto px-3 sm:px-4 py-4 md:py-6">
                {{{mainHeaderWrapper}}}
                {{{articleContainer}}}
                {{{pageFooter}}}
            </div>
        </div>
    </main>`,
    mainHeaderWrapper: `
    <div id="bunny-quick-routing" class="scroll-mt-20 mb-6">
        <!-- Facebook cover-style hero -->
        <div class="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#1877F2] via-[#166FE5] to-[#0e5fc7] text-white shadow-lg">
            <div class="absolute inset-0 opacity-10" style="background-image: radial-gradient(circle at 20% 30%, #ffffff 1px, transparent 1px), radial-gradient(circle at 80% 70%, #ffffff 1px, transparent 1px); background-size: 24px 24px;"></div>
            <div class="relative px-5 py-8 md:px-8 md:py-12">
                <div class="inline-flex items-center gap-2 bg-white/15 backdrop-blur px-3 py-1 rounded-full text-[11px] font-semibold mb-3">
                    <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                    Book Library
                </div>
                <h1 class="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight">{{bookTitle}}</h1>
                <p class="text-white/80 text-sm md:text-base mt-2 max-w-lg">Browse the chapters below or open the menu to jump to any section.</p>
                <div class="mt-5 flex flex-wrap gap-2">
                    <a href="#chapter-1" class="inline-flex items-center gap-2 bg-white text-[#1877F2] hover:bg-[#F0F2F5] font-bold text-xs px-5 py-2.5 rounded-full transition-all shadow-md">
                        <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        Start Reading
                    </a>
                </div>
            </div>
        </div>

        <!-- Facebook-style chapter index cards -->
        <div class="mt-4">
            <span class="text-[11px] font-bold text-[#65676B] uppercase tracking-widest block mb-2">Chapters</span>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">{{{mainIndexHtml}}}</div>
        </div>
    </div>`,
    articleContainer: `<article class="space-y-4">{{{chaptersHtml}}}</article>`,
  },
  component: {
    sidebarLinkItem: `
    <li>
      <a href="#chapter-{{chapterNumber}}" onclick="closeSidebar()" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#050505] hover:bg-[#F0F2F5] font-medium text-sm transition-colors">
         <span class="w-7 h-7 rounded-full bg-[#E7F3FF] text-[#1877F2] font-bold text-[11px] flex items-center justify-center shrink-0">{{chapterNumber}}</span>
         <span class="truncate">{{chapterTitle}}</span>
      </a>
    </li>`,
    mainIndexLinkItem: `
    <a href="#chapter-{{chapterNumber}}" class="group flex items-center gap-3 p-3 rounded-lg bg-white border border-[#DADDE1] hover:border-[#1877F2] hover:bg-[#F0F6FF] transition-all">
        <span class="w-8 h-8 rounded-full bg-[#E7F3FF] text-[#1877F2] font-bold text-xs flex items-center justify-center shrink-0 group-hover:bg-[#1877F2] group-hover:text-white transition-colors">{{chapterNumber}}</span>
        <span class="flex-1 text-sm font-semibold text-[#050505] truncate">{{chapterTitle}}</span>
        <svg class="w-4 h-4 text-[#65676B] group-hover:text-[#1877F2] group-hover:translate-x-0.5 transition-all shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
    </a>`,
    chapterHeader: `
    <header class="mb-5">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-11 h-11 rounded-full bg-gradient-to-br from-[#1877F2] to-[#0e5fc7] text-white flex items-center justify-center font-bold text-base shadow-md shrink-0">{{chapterNumber}}</div>
          <div class="min-w-0">
            <span class="text-[10px] font-bold text-[#1877F2] uppercase tracking-widest">Chapter {{chapterNumber}}</span>
            <h2 class="text-xl md:text-2xl font-bold text-[#050505] leading-tight truncate">{{chapterTitle}}</h2>
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button onclick="toggleSpeech('chapter-{{chapterNumber}}')" data-chapter="chapter-{{chapterNumber}}" class="tts-btn inline-flex items-center gap-1.5 text-xs font-semibold text-[#1877F2] bg-[#E7F3FF] hover:bg-[#D8EBFF] px-3.5 py-2 rounded-full transition-all no-print" aria-label="Listen to this chapter">
            <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
            <span class="tts-label">Listen</span>
          </button>
          <a href="#bunny-quick-routing" class="inline-flex items-center gap-1.5 text-xs font-semibold text-[#65676B] bg-[#F0F2F5] hover:bg-[#E4E6EB] px-3.5 py-2 rounded-full transition-all no-print">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
            Index
          </a>
        </div>
      </div>
    </header>`,
    chapterBodyWrapper: `
    <section id="chapter-{{chapterNumber}}" class="scroll-mt-20 bg-white border border-[#DADDE1] rounded-lg shadow-sm overflow-hidden">
        <div class="px-4 md:px-6 pt-4 md:pt-5">
            {{{chapterHeader}}}
        </div>
        <div class="px-4 md:px-6 pb-5">
            <div class="prose prose-slate max-w-none text-[#1c1e21] leading-relaxed chapter-content prose-headings:text-[#050505] prose-headings:font-bold prose-p:mb-4 prose-a:text-[#1877F2] prose-a:font-semibold prose-strong:text-[#050505] prose-code:bg-[#F0F2F5] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-[#1877F2] prose-code:text-xs">
                {{{parsedContent}}}
            </div>
        </div>
    </section>`,
    pageFooter: `
    <footer class="no-print mt-6 bg-white border border-[#DADDE1] rounded-lg px-4 py-3 flex flex-col sm:flex-row gap-2 justify-between items-center text-xs font-medium text-[#65676B] shadow-sm">
        <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-[#31A24C] animate-pulse"></span>
            <span>Reader Mode Active</span>
        </div>
        <span class="font-mono text-[10px] uppercase tracking-wider">&copy; {{currentYear}} FACEBOOK READER</span>
    </footer>`,
  },
};