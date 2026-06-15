import { BUIBookHTMLTemplate } from "../bui.book.export.types";

export const BUIHTMLTemplateSwipe: BUIBookHTMLTemplate = {
  name: "Swipe Template",
  description: "A swipe-based template for book exports",
  globalAsset: {
    typographyFonts: `
    @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,400;0,600;1,400&family=Lora:wght@400;500&display=swap');
    body { font-family: 'Lora', serif; background-color: #f4f1ea; -webkit-tap-highlight-color: transparent; }
    .prose { font-family: 'Crimson Pro', serif; }

    /* Ensure snap sections scroll vertically without content spill */
    .snap-start {
      scrollbar-width: auto;
      scrollbar-color: #94a3b8 #f1f5f9;
      overscroll-behavior: contain;
      overflow-x: hidden;
    }
    .snap-start::-webkit-scrollbar { width: 6px; }
    .snap-start::-webkit-scrollbar-track { background: #f1f5f9; }
    .snap-start::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 3px; }
    .snap-start .prose {
      overflow-wrap: break-word;
      word-break: break-word;
    }

    /* Prevent content bleed between snap pages */
    main.snap-x {
      scroll-snap-type: x proximity;
      -webkit-overflow-scrolling: touch;
      scroll-behavior: smooth;
    }

    /* Page dot navigation */
    .page-dots {
      position: fixed;
      bottom: 1.5rem;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 8px;
      z-index: 50;
      padding: 8px 16px;
      background: rgba(28, 25, 23, 0.7);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.15);
    }
    .page-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.3);
      border: none;
      cursor: pointer;
      padding: 0;
      transition: all 0.3s ease;
      -webkit-tap-highlight-color: transparent;
    }
    .page-dot.active {
      background: #fff;
      width: 24px;
      border-radius: 4px;
    }
    .page-dot:hover {
      background: rgba(255, 255, 255, 0.6);
    }

    /* Swipe hint animation */
    .swipe-hint {
      position: fixed;
      bottom: 7rem;
      left: 50%;
      transform: translateX(-50%);
      z-index: 40;
      display: flex;
      align-items: center;
      gap: 12px;
      color: rgba(255, 255, 255, 0.6);
      font-size: 12px;
      font-family: ui-monospace, monospace;
      letter-spacing: 0.05em;
      pointer-events: none;
      animation: hintFadeOut 4s ease-in-out 4s forwards;
    }
    .swipe-hint .swipe-arrow {
      animation: swipePulse 1.5s ease-in-out infinite;
    }
    .swipe-hint .swipe-arrow:nth-child(2) { animation-delay: 0.2s; }
    .swipe-hint .swipe-arrow:nth-child(3) { animation-delay: 0.4s; }

    @keyframes swipePulse {
      0%, 100% { opacity: 0.3; transform: translateX(0); }
      50% { opacity: 1; transform: translateX(6px); }
    }
    @keyframes hintFadeOut {
      to { opacity: 0; transform: translateX(-50%) translateY(10px); visibility: hidden; }
    }

    /* Hamburger menu button for mobile sidebar */
    .hamburger-btn {
      display: none;
      position: fixed;
      top: 12px;
      left: 12px;
      z-index: 60;
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: rgba(28, 25, 23, 0.8);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #fff;
      cursor: pointer;
      align-items: center;
      justify-content: center;
      transition: background 0.2s ease;
    }
    .hamburger-btn:active { background: rgba(28, 25, 23, 0.95); }
    .hamburger-btn svg { width: 20px; height: 20px; }
    @media (max-width: 767px) { .hamburger-btn { display: flex; } }

    /* Mobile sidebar overlay */
    .mob-sidebar {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      z-index: 55;
    }
    .mob-sidebar.open { display: block; }
    .mob-sidebar aside {
      width: 280px;
      max-width: 80vw;
      height: 100%;
      background: #1c1917;
      color: #d6d3d1;
      padding: 24px 20px;
      overflow-y: auto;
      box-shadow: 4px 0 24px rgba(0,0,0,0.3);
    }
    @media (min-width: 768px) { .mob-sidebar { display: none !important; } }

    /* Responsive font adjustments */
    @media (max-width: 640px) {
      .prose { font-size: 0.9375rem; line-height: 1.65; }
    }

    /* Extra small screen adjustments (<=380px) */
    @media (max-width: 380px) {
      .prose { font-size: 0.8125rem; line-height: 1.55; }
      .page-dots { bottom: 1rem; gap: 5px; padding: 5px 10px; }
      .page-dot { width: 6px; height: 6px; }
      .page-dot.active { width: 16px; border-radius: 3px; }
      .hamburger-btn { width: 34px; height: 34px; top: 8px; left: 8px; }
      .hamburger-btn svg { width: 16px; height: 16px; }
    }
    `,
    printStyles: `@media print { .no-print { display: none !important; } }`,
  },
  layout: {
    documentShell: `<!DOCTYPE html>
<html lang="en" class="overflow-hidden h-full">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>{{bookTitle}}</title>
    <script src="https://cdn.tailwindcss.com?plugins=typography"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
    <style>{{{globalAssets.typographyFonts}}}{{globalAssets.printStyles}}</style>
</head>
<body class="text-stone-900 antialiased h-full flex flex-col justify-between">
    <!-- Mobile sidebar overlay -->
    <div id="mob-sidebar-overlay" class="mob-sidebar" onclick="toggleMobileSidebar()">
        <aside onclick="event.stopPropagation()">
            <div class="flex items-center justify-between mb-6">
                <span class="text-xs font-mono tracking-widest text-stone-500 uppercase">Volume Registry</span>
                <button onclick="toggleMobileSidebar()" class="text-stone-400 hover:text-white p-1">
                    <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
            </div>
            <ul class="space-y-1">{{{sidebarLinks}}}</ul>
        </aside>
    </div>

    <!-- Hamburger button for mobile sidebar -->
    <button id="hamburger-btn" class="hamburger-btn" onclick="toggleMobileSidebar()" aria-label="Toggle table of contents">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
    </button>

    <!-- Page dot indicator -->
    <div id="page-dots" class="page-dots no-print"></div>

    <!-- Swipe gesture hint (auto-fades after a few seconds) -->
    <div id="swipe-hint" class="swipe-hint no-print">
        <span class="swipe-arrow">‹</span>
        <span class="swipe-arrow">‹</span>
        <span class="text-xs tracking-wider">Swipe to turn page</span>
        <span class="swipe-arrow">›</span>
        <span class="swipe-arrow">›</span>
    </div>

    <div class="flex flex-1 overflow-hidden relative">
        {{{sidebarContainer}}}
        {{{mainContentWrapper}}}
    </div>
    {{{pageFooter}}}

    <script>
        (function() {
            'use strict';
            var mainEl = document.querySelector('main.snap-x');
            if (!mainEl) return;

            // --- State ---
            var touchStartX = 0;
            var touchStartY = 0;
            var isSwiping = false;
            var totalPages = 0;
            var currentPage = 0;
            var pageWidth = mainEl.clientWidth;
            var isDragging = false;
            var dragStartX = 0;
            var dotsContainer = document.getElementById('page-dots');
            var hintEl = document.getElementById('swipe-hint');

            // --- Build page dots ---
            function buildDots() {
                var snapSections = mainEl.querySelectorAll('.snap-start');
                totalPages = snapSections.length;
                dotsContainer.innerHTML = '';
                for (var i = 0; i < totalPages; i++) {
                    var dot = document.createElement('button');
                    dot.className = 'page-dot' + (i === 0 ? ' active' : '');
                    dot.setAttribute('aria-label', 'Go to page ' + (i + 1));
                    dot.addEventListener('click', (function(idx) {
                        return function() {
                            mainEl.scrollTo({ left: idx * pageWidth, behavior: 'smooth' });
                            scrollSectionToTop(idx);
                        };
                    })(i));
                    dotsContainer.appendChild(dot);
                }
            }

            function updateDots() {
                var scrollLeft = mainEl.scrollLeft;
                pageWidth = mainEl.clientWidth;
                currentPage = Math.round(scrollLeft / pageWidth);
                var dots = dotsContainer.querySelectorAll('.page-dot');
                for (var i = 0; i < dots.length; i++) {
                    if (i === currentPage) {
                        dots[i].classList.add('active');
                    } else {
                        dots[i].classList.remove('active');
                    }
                }
                // Update footer page indicator
                var footerIndicator = document.getElementById('footer-page-indicator');
                if (footerIndicator) {
                    footerIndicator.textContent = (currentPage + 1) + ' / ' + totalPages;
                }
                // Hide swipe hint on first navigation
                if (hintEl && currentPage > 0) {
                    hintEl.style.display = 'none';
                }
            }

            function scrollSectionToTop(index) {
                var snapSections = mainEl.querySelectorAll('.snap-start');
                if (snapSections[index]) {
                    snapSections[index].scrollTop = 0;
                }
            }

            // Debounced scroll handler for dots (passive - never forces scroll to top)
            var scrollTimeout;
            mainEl.addEventListener('scroll', function() {
                if (scrollTimeout) cancelAnimationFrame(scrollTimeout);
                scrollTimeout = requestAnimationFrame(updateDots);
            }, { passive: true });

            // --- Touch swipe (mobile) ---
            mainEl.addEventListener('touchstart', function(e) {
                var touch = e.touches[0];
                touchStartX = touch.clientX;
                touchStartY = touch.clientY;
                isSwiping = false;
            }, { passive: true });

            mainEl.addEventListener('touchmove', function(e) {
                if (!touchStartX) return;
                var touch = e.touches[0];
                var deltaX = touch.clientX - touchStartX;
                var deltaY = touch.clientY - touchStartY;
                if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
                    isSwiping = true;
                }
            }, { passive: true });

            mainEl.addEventListener('touchend', function(e) {
                if (!touchStartX) { touchStartX = 0; touchStartY = 0; return; }
                if (isSwiping) {
                    var touch = e.changedTouches[0];
                    var deltaX = touch.clientX - touchStartX;
                    var swipeThreshold = Math.max(20, pageWidth * 0.08);
                    if (Math.abs(deltaX) > swipeThreshold) {
                        pageWidth = mainEl.clientWidth;
                        var targetIdx;
                        if (deltaX > 0) {
                            targetIdx = Math.max(0, Math.round(mainEl.scrollLeft / pageWidth) - 1);
                        } else {
                            targetIdx = Math.min(totalPages - 1, Math.round(mainEl.scrollLeft / pageWidth) + 1);
                        }
                        mainEl.scrollTo({ left: targetIdx * pageWidth, behavior: 'smooth' });
                        scrollSectionToTop(targetIdx);
                    }
                }
                touchStartX = 0; touchStartY = 0; isSwiping = false;
            }, { passive: true });

            // --- Mouse drag (desktop) ---
            mainEl.addEventListener('mousedown', function(e) {
                isDragging = true;
                dragStartX = e.clientX;
                mainEl.style.cursor = 'grabbing';
                mainEl.style.userSelect = 'none';
            });

            document.addEventListener('mousemove', function(e) {
                if (!isDragging) return;
                mainEl.scrollLeft = mainEl.scrollLeft - (e.clientX - dragStartX);
                dragStartX = e.clientX;
            });

            document.addEventListener('mouseup', function() {
                if (!isDragging) return;
                isDragging = false;
                mainEl.style.cursor = '';
                mainEl.style.userSelect = '';
                pageWidth = mainEl.clientWidth;
                var targetIdx = Math.max(0, Math.min(totalPages - 1, Math.round(mainEl.scrollLeft / pageWidth)));
                mainEl.scrollTo({ left: targetIdx * pageWidth, behavior: 'smooth' });
                scrollSectionToTop(targetIdx);
            });

            // --- Keyboard navigation (desktop) ---
            document.addEventListener('keydown', function(e) {
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
                    e.preventDefault();
                    pageWidth = mainEl.clientWidth;
                    var nextIdx = Math.min(totalPages - 1, Math.round(mainEl.scrollLeft / pageWidth) + 1);
                    mainEl.scrollTo({ left: nextIdx * pageWidth, behavior: 'smooth' });
                    scrollSectionToTop(nextIdx);
                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    pageWidth = mainEl.clientWidth;
                    var prevIdx = Math.max(0, Math.round(mainEl.scrollLeft / pageWidth) - 1);
                    mainEl.scrollTo({ left: prevIdx * pageWidth, behavior: 'smooth' });
                    scrollSectionToTop(prevIdx);
                }
            });

            // --- Resize handler ---
            var resizeTimeout;
            window.addEventListener('resize', function() {
                if (resizeTimeout) clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(function() {
                    pageWidth = mainEl.clientWidth;
                    mainEl.scrollTo({ left: currentPage * pageWidth, behavior: 'auto' });
                }, 100);
            });

            // --- Init ---
            buildDots();
            updateDots();
        })();

        // Global mobile sidebar toggle
        function toggleMobileSidebar() {
            document.getElementById('mob-sidebar-overlay').classList.toggle('open');
        }
    </script>
</body>
</html>`,
    sidebarContainer: `
    <aside class="no-print w-64 bg-stone-900 text-stone-300 p-6 overflow-y-auto hidden md:block border-r border-stone-800">
        <div class="text-[11px] font-mono tracking-widest text-stone-500 uppercase mb-4">Volume Registry</div>
        <ul class="space-y-2">{{{sidebarLinks}}}</ul>
    </aside>`,
    mainContentWrapper: `
    <main class="flex-1 overflow-hidden snap-x snap-mandatory flex scroll-smooth h-full">
        <div id="book-cover" class="snap-start min-w-full flex-shrink-0 flex items-center justify-center p-8 bg-stone-100 h-full overflow-y-auto">
            {{{mainHeaderWrapper}}}
        </div>
        {{{articleContainer}}}
    </main>`,
    mainHeaderWrapper: `
    <div id="bunny-quick-routing" class="w-full max-w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl text-center border-2 md:border-4 border-stone-800 p-4 sm:p-6 md:p-12 bg-white shadow-xl rounded-sm mx-auto">
        <h1 class="text-2xl md:text-5xl font-semibold tracking-wide text-stone-900 mb-3 md:mb-6">{{bookTitle}}</h1>
        <div class="w-10 md:w-16 h-0.5 bg-stone-800 mx-auto my-3 md:my-6"></div>
        <p class="text-xs md:text-sm italic text-stone-500 mb-4 md:mb-8">Table of Contents</p>
        <div class="flex flex-col gap-1.5 md:gap-2 text-left max-h-40 md:max-h-60 overflow-y-auto pr-1 md:pr-2 overscroll-contain">{{{mainIndexHtml}}}</div>
        <div class="mt-4 md:mt-8"><a href="#chapter-1" class="inline-block w-full md:w-auto px-5 md:px-6 py-3 md:py-2.5 bg-stone-900 text-white rounded text-sm font-medium hover:bg-stone-800 active:bg-stone-700 transition-colors">Open Manuscript →</a></div>
    </div>`,
    articleContainer: `{{{chaptersHtml}}}`,
  },
  component: {
    sidebarLinkItem: `
    <li>
      <a href="#chapter-{{chapterNumber}}" onclick="event.preventDefault();const m=document.querySelector('main.snap-x');if(m){const targets=m.querySelectorAll('.snap-start');const tp=parseInt('{{chapterNumber}}');if(targets[tp]){targets[tp].scrollTop=0;m.scrollTo({left:tp*m.clientWidth,behavior:'smooth'});}document.getElementById('mob-sidebar-overlay').classList.remove('open');}" class="block py-1 text-sm hover:text-white transition-colors truncate">
         <span class="font-mono text-stone-500 mr-2">{{paddedChapterNumber}}</span> {{chapterTitle}}
      </a>
    </li>`,
    mainIndexLinkItem: `
    <a href="#chapter-{{chapterNumber}}" onclick="event.preventDefault(); const m=document.querySelector('main.snap-x'); if(m){const targets=m.querySelectorAll('.snap-start'); const idx=Array.from(targets).indexOf(this.closest('[id^=\"bunny-quick-routing\"]') ? targets[0] : this.closest('[id^=\"bunny-quick-routing\"]')); const targetPage=parseInt('{{chapterNumber}}');if(targets[targetPage])targets[targetPage].scrollTop=0;m.scrollTo({left: targetPage*m.clientWidth, behavior:'smooth'});}" class="flex items-center gap-2 md:gap-3 py-2.5 md:py-1.5 px-2 md:px-0 border-b border-dashed border-stone-200 hover:text-stone-600 hover:bg-stone-50 active:bg-stone-100 rounded-md transition-colors -mx-1 md:mx-0">
        <span class="flex items-center justify-center w-6 h-6 md:w-auto md:h-auto rounded md:rounded-none bg-stone-100 md:bg-transparent text-stone-600 md:text-inherit text-xs font-bold shrink-0">{{chapterNumber}}.</span>
        <span class="flex-1 font-medium text-sm leading-snug line-clamp-1 md:line-clamp-none">{{chapterTitle}}</span>
        <svg class="w-3.5 h-3.5 text-stone-400 shrink-0 hidden md:block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
    </a>`,
    chapterHeader: `
    <header class="mb-6 md:mb-8 border-b border-stone-200 pb-4 md:pb-6">
      <div class="flex items-center justify-between mb-2">
        <span class="font-mono text-[10px] md:text-xs uppercase tracking-widest text-stone-400">Chapter {{chapterNumber}}</span>
        <a href="#bunny-quick-routing" onclick="var m=this.closest('main');var t=m.querySelectorAll('.snap-start');if(t[0])t[0].scrollTop=0;m.scrollTo({left:0,behavior:'smooth'});return false;" class="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900 hover:bg-stone-100 active:bg-stone-200 px-3 md:px-2.5 py-2 md:py-1 rounded-lg transition-colors no-print min-h-[36px] md:min-h-0">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
          <span class="hidden md:inline">Back to Index</span>
          <span class="md:hidden">Index</span>
        </a>
      </div>
      <h2 class="text-xl md:text-3xl font-medium text-stone-900 tracking-tight text-center md:text-center leading-snug">{{chapterTitle}}</h2>
    </header>`,
    chapterBodyWrapper: `
    <section id="chapter-{{chapterNumber}}" class="snap-start min-w-full flex-shrink-0 flex flex-col items-start justify-start p-2 sm:p-4 md:p-10 overflow-y-auto bg-stone-50/70 h-full">
        <div class="w-full max-w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl bg-white p-3 sm:p-4 md:p-12 shadow-md rounded border border-stone-200/60 my-2 sm:my-3 md:my-8 mx-auto">
            {{{chapterHeader}}}
            <div class="prose prose-stone max-w-none text-stone-800 leading-relaxed prose-lg md:prose-lg prose-sm sm:prose-base">
                {{{parsedContent}}}
            </div>
            <div class="mt-6 md:mt-10 pt-4 md:pt-6 border-t border-stone-100 flex justify-between items-center no-print">
                 <a href="#chapter-{{chapterNumber}}" onclick="event.preventDefault(); const m=this.closest('main'); const targets=m.querySelectorAll('.snap-start'); const idx=Array.from(targets).indexOf(this.closest('section')); if(idx>0){const t=targets[idx-1];t.scrollTop=0;m.scrollTo({left: (idx-1)*m.clientWidth, behavior:'smooth'});}" class="inline-flex items-center gap-1.5 text-xs md:text-sm font-semibold text-stone-500 hover:text-stone-900 hover:bg-stone-100 active:bg-stone-200 px-3 md:px-4 py-2.5 md:py-2 rounded-lg transition-all">← Previous</a>
                 <span class="text-[10px] font-mono text-stone-300 hidden sm:block">Page {{chapterNumber}}</span>
                 <a href="#chapter-{{chapterNumber}}" onclick="event.preventDefault(); const m=this.closest('main'); const targets=m.querySelectorAll('.snap-start'); const idx=Array.from(targets).indexOf(this.closest('section')); if(idx<targets.length-1){const t=targets[idx+1];t.scrollTop=0;m.scrollTo({left: (idx+1)*m.clientWidth, behavior:'smooth'});}" class="inline-flex items-center gap-1.5 text-xs md:text-sm font-semibold text-stone-700 hover:text-stone-900 hover:bg-stone-100 active:bg-stone-200 px-3 md:px-4 py-2.5 md:py-2 rounded-lg transition-all">Next →</a>
            </div>
        </div>
    </section>`,
    pageFooter: `
    <footer class="no-print bg-stone-900 border-t border-stone-800 py-2.5 md:py-3 px-4 md:px-6 flex justify-between items-center text-[10px] md:text-[11px] font-mono text-stone-500 w-full z-10">
        <span class="truncate max-w-[40%]">{{bookTitle}}</span>
        <span id="footer-page-indicator" class="text-stone-400 font-semibold tracking-wider">1 / 1</span>
        <span class="hidden sm:block">&copy; {{currentYear}} Folio Render</span>
    </footer>`,
  },
};
