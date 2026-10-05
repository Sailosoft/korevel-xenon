import { BUIBookHTMLTemplate } from "../bui.book.export.types";

export const BUIHTMLTemplateGitHub: BUIBookHTMLTemplate = {
  name: "GitHub Inspired Template",
  description:
    "A GitHub-style social reader template with a hovering hamburger sidebar, blue theme, and per-chapter text-to-speech",
  globalAsset: {
    typographyFonts: `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Poppins:wght@600;700;800&family=Source+Serif+4:ital,opsz,wght@0,8..60,400..700;1,8..60,400..700&display=swap');

    :root {
      --reader-scale: 1;
      --reader-width: 56rem;
      --ink: #1f2328;
      --ink-body: #2b3440;
      --accent: #0969da;
      --accent-soft: #ddf4ff;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f6f8fa;
      -webkit-tap-highlight-color: transparent;
    }
    h1, h2, h3, h4, h5, h6 { font-family: 'Poppins', 'Inter', sans-serif; color: var(--ink); }
    * { -webkit-tap-highlight-color: transparent; }

    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: #f6f8fa; }
    ::-webkit-scrollbar-thumb { background: #afb8c1; border-radius: 8px; }
    ::-webkit-scrollbar-thumb:hover { background: #8c959f; }

    .tts-btn.tts-active {
      background-color: var(--accent) !important;
      color: #ffffff !important;
      animation: tts-pulse 1.2s ease-in-out infinite;
    }
    @keyframes tts-pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(9, 105, 218, 0.45); }
      50% { box-shadow: 0 0 0 6px rgba(9, 105, 218, 0); }
    }

    pre {
      background-color: #161b22 !important;
      color: #c9d1d9 !important;
      border: 1px solid #30363d !important;
      border-radius: 10px !important;
      padding: 16px !important;
      overflow-x: auto !important;
      font-size: 13px !important;
      line-height: 1.6 !important;
    }
    pre code {
      background-color: transparent !important;
      color: #c9d1d9 !important;
      padding: 0 !important;
      font-size: 13px !important;
    }
    code {
      background-color: #eff1f3 !important;
      color: #cf222e !important;
      padding: 0.15em 0.4em !important;
      border-radius: 6px !important;
      font-size: 85% !important;
    }

    .chapter-content.chapter-content {
      font-family: 'Source Serif 4', Georgia, 'Times New Roman', serif;
      font-size: calc(1.125rem * var(--reader-scale));
      line-height: 1.8;
      color: var(--ink-body);
      letter-spacing: 0.003em;
      text-rendering: optimizeLegibility;
      -webkit-font-smoothing: antialiased;
    }
    .chapter-content p {
      margin: 0 0 1.3em;
      text-wrap: pretty;
    }
    .chapter-content > p:last-child { margin-bottom: 0; }
    .chapter-content h2 {
      font-size: 1.5em;
      line-height: 1.3;
      margin: 2em 0 0.75em;
      font-weight: 700;
      letter-spacing: -0.01em;
      color: var(--ink);
    }
    .chapter-content h3 {
      font-size: 1.24em;
      line-height: 1.35;
      margin: 1.8em 0 0.6em;
      font-weight: 700;
      color: var(--ink);
    }
    .chapter-content h4 {
      font-size: 1.08em;
      margin: 1.6em 0 0.5em;
      font-weight: 700;
      color: var(--ink);
    }
    .chapter-content a {
      color: var(--accent);
      font-weight: 600;
      text-decoration: underline;
      text-underline-offset: 3px;
      text-decoration-thickness: 1.5px;
      text-decoration-color: rgba(9, 105, 218, 0.4);
      transition: text-decoration-color 0.15s ease, background-color 0.15s ease;
    }
    .chapter-content a:hover { text-decoration-color: var(--accent); background-color: var(--accent-soft); }
    .chapter-content strong, .chapter-content b { color: var(--ink); font-weight: 700; }
    .chapter-content blockquote {
      margin: 1.7em 0;
      padding: 0.85em 1.15em;
      border-left: 3px solid var(--accent);
      border-radius: 0 12px 12px 0;
      background: linear-gradient(90deg, rgba(221, 244, 255, 0.9), rgba(221, 244, 255, 0.35));
      color: #3a4552;
      font-style: italic;
    }
    .chapter-content blockquote p:last-child { margin-bottom: 0; }
    .chapter-content ul, .chapter-content ol { margin: 1.3em 0; padding-left: 1.5em; }
    .chapter-content li { margin: 0.45em 0; }
    .chapter-content li::marker { color: var(--accent); font-weight: 700; }
    .chapter-content hr {
      border: 0;
      width: 7em;
      height: 2px;
      margin: 2.4em auto;
      background: linear-gradient(90deg, transparent, #afb8c1, transparent);
    }
    .chapter-content img {
      display: block;
      margin: 1.8em auto;
      border-radius: 12px;
      box-shadow: 0 12px 28px -14px rgba(31, 35, 40, 0.45);
    }
    .chapter-content figure { margin: 1.8em 0; }
    .chapter-content figcaption {
      margin-top: 0.6em;
      text-align: center;
      font-family: 'Inter', sans-serif;
      font-size: 0.82em;
      color: #57606a;
    }
    .chapter-content table {
      display: block;
      width: 100%;
      overflow-x: auto;
      border-collapse: collapse;
      margin: 1.6em 0;
      font-size: 0.95em;
    }
    .chapter-content th { background: #f6f8fa; font-family: 'Inter', sans-serif; }

    .chapter-content.drop-cap > p:first-of-type::first-letter {
      float: left;
      font-family: 'Poppins', 'Inter', sans-serif;
      font-weight: 800;
      font-size: 3.2em;
      line-height: 0.92;
      padding: 0.04em 0.1em 0 0;
      color: var(--accent);
    }

    #reader-sidebar a.sb-active {
      background-color: var(--accent-soft);
      color: var(--accent);
      font-weight: 600;
    }
    #reader-sidebar a.sb-active .sb-num {
      background-color: var(--accent);
      color: #ffffff;
    }

    #chapter-pos:empty { display: none; }

    #back-top {
      opacity: 0;
      visibility: hidden;
      transform: translateY(10px);
      transition: opacity 0.25s ease, transform 0.25s ease, visibility 0.25s ease, color 0.15s ease, border-color 0.15s ease;
    }
    #back-top.show { opacity: 1; visibility: visible; transform: translateY(0); }

    @keyframes rise {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .rise { animation: rise 0.6s cubic-bezier(0.22, 1, 0.36, 1) both; }
    .rise-1 { animation-delay: 0.05s; }
    .rise-2 { animation-delay: 0.14s; }
    .rise-3 { animation-delay: 0.23s; }
    .rise-4 { animation-delay: 0.32s; }

    @media (prefers-reduced-motion: reduce) {
      html { scroll-behavior: auto; }
      .rise { animation: none; }
      .tts-btn.tts-active { animation: none; }
    }
    `,
    printStyles: `
    @media print {
      .no-print { display: none !important; }
      body { background: #ffffff !important; }
      #reader-header { position: static !important; box-shadow: none !important; }
      article > section + section { break-before: page; }
      section[id^="chapter-"] {
        border: none !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        background: #ffffff !important;
      }
      .chapter-content.chapter-content { font-size: 11.5pt !important; line-height: 1.6 !important; }
      .chapter-content a { color: #000000 !important; text-decoration: none !important; }
      .chapter-content a[href^="http"]::after { content: " (" attr(href) ")"; font-size: 0.85em; color: #555; }
      .drop-cap > p:first-of-type::first-letter { color: #000000 !important; }
    }`,
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
<body class="text-[#24292f] antialiased bg-[#f6f8fa] min-h-screen flex flex-col">

    {{{sidebarContainer}}}
    {{{mainContentWrapper}}}

    <button id="back-top" onclick="window.scrollTo({ top: 0, behavior: 'smooth' })" class="no-print fixed bottom-5 right-5 z-40 w-11 h-11 rounded-full bg-white border border-[#d0d7de] shadow-lg text-[#57606a] hover:text-[#0969da] hover:border-[#0969da] flex items-center justify-center" aria-label="Back to top">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 15l7-7 7 7"/></svg>
    </button>

    <script>
        function openSidebar() {
            var sidebar = document.getElementById('reader-sidebar');
            var overlay = document.getElementById('reader-sidebar-overlay');
            if (sidebar) sidebar.classList.remove('-translate-x-full');
            if (overlay) overlay.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
        function closeSidebar() {
            var sidebar = document.getElementById('reader-sidebar');
            var overlay = document.getElementById('reader-sidebar-overlay');
            if (sidebar) sidebar.classList.add('-translate-x-full');
            if (overlay) overlay.classList.add('hidden');
            document.body.style.overflow = '';
        }
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') closeSidebar();
        });

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

        (function () {
            var progress = document.getElementById('read-progress');
            var backTop = document.getElementById('back-top');
            var posEl = document.getElementById('chapter-pos');
            var header = document.getElementById('reader-header');
            var sections = Array.prototype.slice.call(document.querySelectorAll('section[id^="chapter-"]'));
            var sideLinks = Array.prototype.slice.call(document.querySelectorAll('#reader-sidebar a[href^="#chapter-"]'));

            var scale = 1;
            try { scale = parseFloat(localStorage.getItem('bui-reader-scale')) || 1; } catch (e) {}
            function applyScale() {
                document.documentElement.style.setProperty('--reader-scale', String(scale));
            }
            window.changeReaderScale = function (dir) {
                scale = Math.min(1.5, Math.max(0.85, Math.round((scale + dir * 0.075) * 1000) / 1000));
                try { localStorage.setItem('bui-reader-scale', String(scale)); } catch (e) {}
                applyScale();
            };
            applyScale();

            var readerWidths = [
                { label: 'Narrow', value: '42rem' },
                { label: 'Default', value: '56rem' },
                { label: 'Wide', value: '72rem' },
                { label: 'Full', value: '100%' }
            ];
            var widthIndex = 1;
            try {
                var savedWidth = parseInt(localStorage.getItem('bui-reader-width'), 10);
                if (!isNaN(savedWidth) && savedWidth >= 0 && savedWidth < readerWidths.length) widthIndex = savedWidth;
            } catch (e) {}
            function applyReaderWidth() {
                var mode = readerWidths[widthIndex];
                document.documentElement.style.setProperty('--reader-width', mode.value);
                var select = document.getElementById('width-select');
                if (select) {
                    select.value = String(widthIndex);
                    select.setAttribute('title', 'Content width: ' + mode.label);
                }
            }
            window.setReaderWidth = function (value) {
                var parsed = parseInt(value, 10);
                if (isNaN(parsed) || parsed < 0 || parsed >= readerWidths.length) return;
                widthIndex = parsed;
                try { localStorage.setItem('bui-reader-width', String(widthIndex)); } catch (e) {}
                applyReaderWidth();
            };
            applyReaderWidth();

            sections.forEach(function (sec) {
                var box = sec.querySelector('.chapter-content');
                if (!box) return;
                var words = (box.textContent || '').trim().split(/\s+/).filter(Boolean).length;
                var slot = sec.querySelector('.read-time');
                if (slot && words > 0) slot.textContent = Math.max(1, Math.round(words / 200)) + ' min read';
                var p = box.querySelector('p');
                if (p && p.textContent.trim().length > 240) box.classList.add('drop-cap');
            });

            function onScroll() {
                var st = window.scrollY || document.documentElement.scrollTop;
                var max = document.documentElement.scrollHeight - window.innerHeight;
                if (progress) progress.style.width = (max > 0 ? (st / max) * 100 : 0) + '%';
                if (backTop) backTop.classList.toggle('show', st > 600);

                var offset = (header ? header.offsetHeight : 56) + 40;
                var current = null;
                for (var i = 0; i < sections.length; i++) {
                    if (sections[i].getBoundingClientRect().top <= offset) current = sections[i];
                }
                var id = current ? current.id : null;
                sideLinks.forEach(function (a) {
                    a.classList.toggle('sb-active', id !== null && a.getAttribute('href') === '#' + id);
                });
                if (posEl) {
                    posEl.textContent = id ? (sections.indexOf(current) + 1) + ' / ' + sections.length : '';
                }
            }
            window.addEventListener('scroll', onScroll, { passive: true });
            window.addEventListener('resize', onScroll);
            onScroll();
        })();
    </script>
</body>
</html>`,
    sidebarContainer: `
    <div id="reader-sidebar-overlay" class="no-print fixed inset-0 z-50 hidden bg-black/40 backdrop-blur-[2px]" onclick="closeSidebar()"></div>

    <aside id="reader-sidebar" class="no-print fixed top-0 left-0 z-[60] h-full w-80 max-w-[85vw] bg-white shadow-2xl transform -translate-x-full transition-transform duration-300 ease-in-out flex flex-col">
        <div class="flex items-center justify-between px-5 py-4 border-b border-[#d0d7de]">
            <div class="flex items-center gap-2.5 min-w-0">
                <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0969da] to-[#8250df] text-white flex items-center justify-center shrink-0 shadow-md">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path stroke-linecap="round" stroke-linejoin="round" d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                </div>
                <div class="min-w-0">
                    <span class="block text-sm font-bold text-[#1f2328] truncate">{{bookTitle}}</span>
                    <span class="block text-[10px] font-semibold text-[#57606a] uppercase tracking-wider">Chapters</span>
                </div>
            </div>
            <button onclick="closeSidebar()" class="p-2 rounded-full text-[#57606a] hover:bg-[#f6f8fa] transition-colors" aria-label="Close menu">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
        </div>

        <nav class="flex-1 overflow-y-auto px-3 py-4">
            <span class="text-[11px] font-bold text-[#57606a] uppercase tracking-widest px-3 mb-2 block">Jump to Section</span>
            <ul class="space-y-1">
                {{{sidebarLinks}}}
            </ul>
        </nav>

        <div class="px-5 py-4 border-t border-[#d0d7de] bg-[#f6f8fa]">
            <div class="flex items-center gap-2.5">
                <span class="w-2 h-2 rounded-full bg-[#1a7f37] animate-pulse"></span>
                <span class="text-xs font-semibold text-[#57606a]">Reader Mode Active</span>
            </div>
        </div>
    </aside>`,
    mainContentWrapper: `
    <main class="flex-1 min-w-0 flex flex-col">
        <header id="reader-header" class="no-print sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-[#d0d7de] shadow-sm w-full">
            <div class="w-full px-3 sm:px-4 h-14 flex items-center gap-3">
                <button onclick="openSidebar()" class="p-2 -ml-2 rounded-full text-[#1f2328] hover:bg-[#f6f8fa] transition-colors" aria-label="Open menu">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
                </button>
                <div class="flex items-center gap-2 min-w-0">
                    <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-[#0969da] to-[#8250df] text-white flex items-center justify-center shrink-0">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path stroke-linecap="round" stroke-linejoin="round" d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                    </div>
                    <span class="text-sm font-bold text-[#1f2328] truncate">{{bookTitle}}</span>
                    <span id="chapter-pos" class="hidden sm:inline-flex text-[10px] font-bold text-[#57606a] bg-[#f6f8fa] border border-[#d0d7de] px-2 py-0.5 rounded-full tabular-nums shrink-0"></span>
                </div>
                <div class="ml-auto flex items-center gap-1.5 sm:gap-2">
                    <div class="flex items-center rounded-full border border-[#d0d7de] bg-[#f6f8fa] overflow-hidden no-print">
                        <button onclick="changeReaderScale(-1)" class="w-9 h-8 text-xs font-bold text-[#57606a] hover:bg-white hover:text-[#0969da] transition-colors" aria-label="Smaller text">A&minus;</button>
                        <span class="w-px h-4 bg-[#d0d7de]"></span>
                        <button onclick="changeReaderScale(1)" class="w-9 h-8 text-sm font-bold text-[#57606a] hover:bg-white hover:text-[#0969da] transition-colors" aria-label="Larger text">A+</button>
                    </div>
                    <label class="relative inline-flex items-center no-print" title="Content width">
                        <select id="width-select" onchange="setReaderWidth(this.value)" class="appearance-none h-8 pl-3 pr-7 rounded-full border border-[#d0d7de] bg-[#f6f8fa] text-[10px] font-bold uppercase tracking-wider text-[#57606a] hover:bg-white hover:text-[#0969da] focus:outline-none focus:border-[#0969da] focus:text-[#0969da] cursor-pointer" aria-label="Content width">
                            <option value="0">Narrow</option>
                            <option value="1" selected>Default</option>
                            <option value="2">Wide</option>
                            <option value="3">Full</option>
                        </select>
                        <svg class="pointer-events-none absolute right-2.5 w-3 h-3 text-[#57606a]" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6"/></svg>
                    </label>
                    <a href="#bunny-quick-routing" class="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-[#0969da] bg-[#ddf4ff] hover:bg-[#b6e3ff] px-3.5 py-1.5 rounded-full transition-all">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M3 12h18M3 12l6-6M3 12l6 6"/></svg>
                        Index
                    </a>
                </div>
            </div>
            <div id="read-progress" class="absolute bottom-0 left-0 h-0.5 w-0 bg-gradient-to-r from-[#0969da] via-[#8250df] to-[#1a7f37] transition-[width] duration-150 ease-out"></div>
        </header>

        <div class="flex-1">
            <div class="w-full mx-auto px-3 sm:px-4 lg:px-6 py-4 md:py-6" style="max-width: var(--reader-width);">
                {{{mainHeaderWrapper}}}
                {{{articleContainer}}}
                {{{pageFooter}}}
            </div>
        </div>
    </main>`,
    mainHeaderWrapper: `
    <div id="bunny-quick-routing" class="scroll-mt-20 mb-6">
        <div class="relative overflow-hidden rounded-2xl text-white shadow-xl rise rise-1" style="background: linear-gradient(135deg, #0d1117 0%, #161b22 45%, #0b3a75 100%);">
            <div class="absolute -top-24 -right-16 w-64 h-64 rounded-full bg-[#0969da] blur-3xl opacity-30"></div>
            <div class="absolute -bottom-24 -left-16 w-64 h-64 rounded-full bg-[#8250df] blur-3xl opacity-25"></div>
            <div class="absolute inset-0 opacity-10" style="background-image: radial-gradient(circle at 20% 30%, #ffffff 1px, transparent 1px), radial-gradient(circle at 80% 70%, #ffffff 1px, transparent 1px); background-size: 24px 24px;"></div>
            <div class="relative px-5 py-8 md:px-8 md:py-12">
                <div class="inline-flex items-center gap-2 bg-white/15 backdrop-blur border border-white/10 px-3 py-1 rounded-full text-[11px] font-semibold mb-3 rise rise-2">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path stroke-linecap="round" stroke-linejoin="round" d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                    Book Library
                </div>
                <h1 class="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight text-white rise rise-2">{{bookTitle}}</h1>
                <p class="text-white/75 text-sm md:text-base mt-3 max-w-lg rise rise-3">Browse the chapters below, tune the text size to your liking, or open the menu to jump to any section.</p>
                <div class="mt-6 flex flex-wrap gap-2.5 rise rise-4">
                    <a href="#chapter-1" class="inline-flex items-center gap-2 bg-white text-[#1f2328] hover:bg-[#f6f8fa] font-bold text-xs px-5 py-2.5 rounded-full transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5">
                        <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        Start Reading
                    </a>
                    <a href="#chapter-index" class="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold text-xs px-5 py-2.5 rounded-full transition-all">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h10"/></svg>
                        Browse Chapters
                    </a>
                </div>
            </div>
        </div>

        <div id="chapter-index" class="mt-5 scroll-mt-20 rise rise-4">
            <div class="flex items-center justify-between mb-2.5">
                <span class="text-[11px] font-bold text-[#57606a] uppercase tracking-widest">Chapters</span>
                <span class="text-[11px] font-medium text-[#8c959f]">Tap a chapter to jump</span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">{{{mainIndexHtml}}}</div>
        </div>
    </div>`,
    articleContainer: `<article class="max-w-none mx-auto space-y-6">{{{chaptersHtml}}}</article>`,
  },
  component: {
    sidebarLinkItem: `
    <li>
      <a href="#chapter-{{chapterNumber}}" onclick="closeSidebar()" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#24292f] hover:bg-[#f6f8fa] font-medium text-sm transition-colors">
         <span class="sb-num w-7 h-7 rounded-full bg-[#ddf4ff] text-[#0969da] font-bold text-[11px] flex items-center justify-center shrink-0 transition-colors">{{paddedChapterNumber}}</span>
         <span class="truncate">{{chapterTitle}}</span>
      </a>
    </li>`,
    mainIndexLinkItem: `
    <a href="#chapter-{{chapterNumber}}" class="group flex items-center gap-3 p-3.5 rounded-xl bg-white border border-[#d0d7de] hover:border-[#0969da] hover:bg-[#ddf4ff] hover:-translate-y-0.5 hover:shadow-md transition-all">
        <span class="w-8 h-8 rounded-lg bg-[#ddf4ff] text-[#0969da] font-bold text-xs flex items-center justify-center shrink-0 group-hover:bg-[#0969da] group-hover:text-white transition-colors">{{chapterNumber}}</span>
        <span class="flex-1 text-sm font-semibold text-[#1f2328] truncate">{{chapterTitle}}</span>
        <svg class="w-4 h-4 text-[#57606a] group-hover:text-[#0969da] group-hover:translate-x-0.5 transition-all shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
    </a>`,
    chapterHeader: `
    <header class="mb-5">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0969da] to-[#8250df] text-white flex items-center justify-center font-bold text-lg shadow-md ring-4 ring-[#ddf4ff] shrink-0">{{chapterNumber}}</div>
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-[10px] font-bold text-[#0969da] uppercase tracking-widest">Chapter {{chapterNumber}}</span>
              <span class="read-time hidden sm:inline-block text-[10px] font-semibold text-[#57606a] bg-[#f6f8fa] border border-[#d0d7de] px-2 py-0.5 rounded-full whitespace-nowrap"></span>
            </div>
            <h2 class="text-xl md:text-2xl font-bold text-[#1f2328] leading-tight truncate">{{chapterTitle}}</h2>
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button onclick="toggleSpeech('chapter-{{chapterNumber}}')" data-chapter="chapter-{{chapterNumber}}" class="tts-btn inline-flex items-center gap-1.5 text-xs font-semibold text-[#0969da] bg-[#ddf4ff] hover:bg-[#b6e3ff] px-3.5 py-2 rounded-full transition-all no-print" aria-label="Listen to this chapter">
            <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
            <span class="tts-label">Listen</span>
          </button>
          <a href="#bunny-quick-routing" class="inline-flex items-center gap-1.5 text-xs font-semibold text-[#57606a] bg-[#f6f8fa] hover:bg-[#eaeef2] px-3.5 py-2 rounded-full transition-all no-print">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
            Index
          </a>
        </div>
      </div>
    </header>`,
    chapterBodyWrapper: `
    <section id="chapter-{{chapterNumber}}" class="scroll-mt-20 relative bg-white border border-[#d0d7de] rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
        <div class="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#0969da] via-[#8250df] to-[#1a7f37] opacity-70"></div>
        <div class="px-5 md:px-8 pt-6">
            {{{chapterHeader}}}
        </div>
        <div class="px-5 md:px-8 pb-7">
            <div class="chapter-content prose prose-slate max-w-none prose-headings:font-bold prose-a:font-semibold">
                {{{parsedContent}}}
            </div>
        </div>
    </section>`,
    pageFooter: `
    <footer class="no-print mt-8 max-w-none mx-auto bg-white border border-[#d0d7de] rounded-2xl px-5 py-4 flex flex-col sm:flex-row gap-2 justify-between items-center text-xs font-medium text-[#57606a] shadow-sm">
        <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-[#1a7f37] animate-pulse"></span>
            <span>Reader Mode Active</span>
        </div>
        <span class="font-mono text-[10px] uppercase tracking-wider">&copy; {{currentYear}} Reader Edition</span>
    </footer>`,
  },
};
