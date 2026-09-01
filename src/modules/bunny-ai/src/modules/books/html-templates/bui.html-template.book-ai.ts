import { BUIBookHTMLTemplate } from "../bui.book.export.types";

export const BUIHTMLTemplateBookAI: BUIBookHTMLTemplate = {
  name: "Book AI Inspired Template",
  description:
    "A gorgeous, highly animated, vibrant blue creative workspace template using GSAP",
  globalAsset: {
    typographyFonts: `
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
    body { 
      font-family: 'Plus Jakarta Sans', sans-serif; 
      background-color: #f4f7fc; 
      overflow-x: hidden;
    }
    
    /* Elegant Custom Scrollbar */
    ::-webkit-scrollbar { width: 8px; }
    ::-webkit-scrollbar-track { background: #f4f7fc; }
    ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

    /* Book AI Gradient Wave Hero Concept & Backgrounds */
    .bookai-hero {
      background: linear-gradient(135deg, #4376f6 0%, #3b66df 100%);
      border-bottom-left-radius: 40px;
      position: relative;
    }
    
    .glass-header { 
      background: rgba(255, 255, 255, 0.85); 
      backdrop-filter: blur(16px); 
      -webkit-backdrop-filter: blur(16px);
      border-bottom: 1px solid rgba(226, 232, 240, 0.8); 
    }

    /* Stagger entry animations fallback or standard overrides */
    .animate-card {
      transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.4s ease, background-color 0.3s ease;
    }
    .animate-card:hover {
      transform: translateY(-4px);
      background-color: rgba(255, 255, 255, 1.0) !important;
      color: #3b66df !important;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.1);
    }
    `,
    printStyles: `@media print { .no-print, .glass-header, aside { display: none !important; } .bunny-main { margin-left: 0 !important; padding: 0 !important; } }`,
  },
  layout: {
    documentShell: `<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{bookTitle}} - Workspace View</title>
    <script src="https://cdn.tailwindcss.com?plugins=typography"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
    <style>{{{globalAssets.typographyFonts}}}{{{globalAssets.printStyles}}}</style>
</head>
<body class="text-slate-800 antialiased flex min-h-screen">

    {{{sidebarContainer}}}

    <div class="flex-1 flex flex-col min-w-0 bg-[#f8fafc]">
        <header class="glass-header h-16 flex items-center justify-between px-6 md:px-10 z-40 sticky top-0 no-print">
            <div class="flex items-center space-x-3" id="header-logo-area">
                <div class="w-8 h-8 bg-[#4376f6] rounded-lg flex items-center justify-center shadow-md shadow-blue-200">
                    <svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>
                </div>
                <span class="text-sm font-bold tracking-tight text-slate-900">{{bookTitle}}</span>
            </div>
            
            <div class="flex items-center space-x-4">
                <a href="#bunny-quick-routing" class="no-print hidden sm:inline-flex items-center text-xs font-semibold text-[#4376f6] bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-full transition-all">
                    Quick Index ⚡
                </a>
                <button onclick="document.getElementById('bunny-sidebar').classList.toggle('hidden')" class="md:hidden p-2 text-slate-600 hover:text-slate-900 focus:outline-none">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
                </button>
            </div>
        </header>

        {{{mainContentWrapper}}}
    </div>

    <script>
        document.addEventListener("DOMContentLoaded", () => {
            gsap.registerPlugin(ScrollTrigger);

            // 1. Hero Landing Entry Timeline
            const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
            
            tl.from("#hero-bg", { duration: 1.2, scaleY: 0.8, transformOrigin: "top center", opacity: 0 })
              .from("#hero-title", { duration: 0.8, y: 40, opacity: 0 }, "-=0.6")
              .from("#hero-decor", { duration: 1, x: 50, opacity: 0, scale: 0.95 }, "-=0.5")
              // FIXED: Animate the index outer container block cleanly instead of chasing unstable runtime child elements
              .from("#bunny-quick-routing", { duration: 0.8, y: 30, opacity: 0 }, "-=0.4")
              .from("#bunny-sidebar", { duration: 0.8, x: -50, opacity: 0 }, "-=1.2");

            // 2. Continuous Floating Micro-Animations for UI elements
            gsap.to(".floating-ui", {
                y: "random(-6, 6)",
                x: "random(-3, 3)",
                rotation: "random(-1, 1)",
                duration: 4,
                repeat: -1,
                yoyo: true,
                ease: "sine.inOut"
            });

            // 3. ScrollTrigger for Chapters (Fade-in & slide as you scroll down)
            gsap.utils.toArray(".chapter-section").forEach((chapter) => {
                gsap.from(chapter, {
                    scrollTrigger: {
                        trigger: chapter,
                        start: "top 85%",
                        toggleActions: "play none none none"
                    },
                    opacity: 0,
                    y: 40,
                    duration: 0.8,
                    ease: "power2.out"
                });
            });
        });
    </script>
</body>
</html>`,
    sidebarContainer: `
    <aside id="bunny-sidebar" class="no-print fixed md:sticky top-0 left-0 h-screen w-72 bg-white border-r border-slate-200 flex flex-col z-50 hidden md:flex shrink-0 shadow-sm">
        <div class="p-6 border-b border-slate-100 flex items-center space-x-3">
            <div class="w-9 h-9 bg-[#4376f6] rounded-xl flex items-center justify-center shadow-md shadow-blue-200">
                 <span class="text-white font-bold text-sm tracking-tighter">AI</span>
            </div>
            <div>
                <span class="text-base font-bold text-slate-900 block tracking-tight">Book AI Export</span>
                <span class="text-[10px] text-slate-400 block font-medium uppercase tracking-wider">Creative Document System</span>
            </div>
        </div>
        
        <nav class="flex-1 p-4 space-y-6 overflow-y-auto">
            <div>
                <div class="text-[11px] font-bold uppercase tracking-widest text-slate-400 px-3 mb-3">Workspace Index</div>
                <ul class="space-y-1">
                    {{{sidebarLinks}}}
                </ul>
            </div>
        </nav>
        
        <div class="p-4 border-t border-slate-100 bg-slate-50/50">
            <div class="bg-white border border-slate-200/60 rounded-xl p-3.5 flex items-center space-x-3 shadow-xs">
                <div class="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center font-bold text-xs text-[#4376f6]">WP</div>
                <div class="overflow-hidden">
                    <p class="text-xs font-bold text-slate-800 truncate">Creative Board</p>
                    <p class="text-[10px] font-medium text-slate-400 truncate">Active Production Tier</p>
                </div>
            </div>
        </div>
    </aside>`,
    mainContentWrapper: `
    <main class="bunny-main flex-1 min-w-0 pb-16">
        <div class="space-y-12">
            {{{mainHeaderWrapper}}}
            
            <div class="max-w-4xl mx-auto px-4 md:px-8">
                {{{articleContainer}}}
            </div>
            
            <div class="max-w-4xl mx-auto px-4 md:px-8 pt-4">
                {{{pageFooter}}}
            </div>
        </div>
    </main>`,
    mainHeaderWrapper: `
    <div id="hero-bg" class="bookai-hero px-6 py-12 md:px-12 md:py-20 text-white shadow-xl overflow-hidden">
        <div class="absolute top-6 right-12 opacity-20 hidden sm:block">
            <div class="grid grid-cols-4 gap-2">
                <div class="w-2 h-2 bg-white rounded-full"></div><div class="w-2 h-2 bg-white rounded-full"></div><div class="w-2 h-2 bg-white rounded-full"></div><div class="w-2 h-2 bg-white rounded-full"></div>
                <div class="w-2 h-2 bg-white rounded-full"></div><div class="w-2 h-2 bg-white rounded-full"></div><div class="w-2 h-2 bg-white rounded-full"></div><div class="w-2 h-2 bg-white rounded-full"></div>
                <div class="w-2 h-2 bg-white rounded-full"></div><div class="w-2 h-2 bg-white rounded-full"></div><div class="w-2 h-2 bg-white rounded-full"></div><div class="w-2 h-2 bg-white rounded-full"></div>
            </div>
        </div>

        <div class="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div class="lg:col-span-7 space-y-6 z-10" id="hero-title">
                <div class="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide border border-white/10">
                    <span>✨ Workspace</span>
                </div>
                <h1 class="text-4xl md:text-5xl font-bold tracking-tight leading-tight text-white">
                    {{bookTitle}}
                </h1>
                <p class="text-white/80 max-w-md text-sm md:text-base font-normal leading-relaxed">
                    Get organized. Stay creative. Welcome to your custom digital repository workspace board.
                </p>
                <div class="pt-2 flex flex-wrap gap-3">
                    <a href="#chapter-1" class="bg-white text-[#3b66df] hover:bg-slate-50 transition-all font-bold text-xs px-6 py-3 rounded-xl shadow-md shadow-blue-900/20">
                        Begin Reading
                    </a>
                </div>
            </div>

            <div class="lg:col-span-5 relative hidden lg:block" id="hero-decor">
                <div class="floating-ui bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 shadow-2xl relative w-full aspect-[4/3] flex flex-col justify-between">
                    <div class="flex items-center justify-between border-b border-white/10 pb-2">
                        <div class="flex space-x-1.5">
                            <div class="w-2.5 h-2.5 rounded-full bg-white/30"></div>
                            <div class="w-2.5 h-2.5 rounded-full bg-white/30"></div>
                            <div class="w-2.5 h-2.5 rounded-full bg-white/30"></div>
                        </div>
                        <div class="w-32 h-2.5 bg-white/20 rounded-full"></div>
                    </div>
                    <div class="grid grid-cols-2 gap-3 my-2 flex-1 pt-2">
                        <div class="bg-white p-2 rounded-lg shadow-sm flex flex-col justify-between">
                            <div class="w-full h-10 bg-blue-100 rounded-md mb-2"></div>
                            <div class="space-y-1"><div class="w-12 h-1.5 bg-slate-400 rounded"></div><div class="w-8 h-1 bg-slate-300 rounded"></div></div>
                        </div>
                        <div class="bg-yellow-50 p-2 rounded-lg shadow-sm flex flex-col justify-between border border-yellow-200/50">
                            <span class="text-[8px] text-yellow-800 font-bold">💡 Note</span>
                            <div class="space-y-1 mt-2"><div class="w-full h-1 bg-yellow-400 rounded"></div><div class="w-14 h-1 bg-yellow-400 rounded"></div></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div id="bunny-quick-routing" class="max-w-4xl mx-auto px-4 md:px-8 mt-[-30px] scroll-mt-24">
        <div class="bg-gradient-to-br from-[#4376f6] to-[#3b66df] rounded-2xl p-6 md:p-8 shadow-xl shadow-blue-500/10 border border-blue-400/20">
            <span class="text-[10px] font-bold text-white/80 tracking-widest uppercase block mb-4">Collected Chapters & Workspace Units</span>
            <div id="index-links-container" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {{{mainIndexHtml}}}
            </div>
        </div>
    </div>`,
    articleContainer: `<article class="space-y-12">{{{chaptersHtml}}}</article>`,
  },
  component: {
    sidebarLinkItem: `
    <li>
      <a href="#chapter-{{chapterNumber}}" class="flex items-center space-x-3 px-3 py-2.5 rounded-xl text-slate-600 hover:bg-blue-50/60 hover:text-[#4376f6] font-medium text-sm transition-all group">
         <span class="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-[#4376f6] transition-colors"></span>
         <span class="truncate group-hover:translate-x-0.5 transition-transform">{{chapterTitle}}</span>
      </a>
    </li>`,
    mainIndexLinkItem: `
    <a href="#chapter-{{chapterNumber}}" class="index-card flex items-center justify-between p-4 rounded-xl border border-white/20 bg-white/10 backdrop-blur-md text-white transition-all text-sm group animate-card">
        <div class="flex items-center space-x-3 overflow-hidden">
            <span class="w-6 h-6 bg-white/20 rounded-md text-white font-mono text-xs font-bold flex items-center justify-center shrink-0 group-hover:bg-[#4376f6] group-hover:text-white transition-colors">{{chapterNumber}}</span>
            <span class="font-bold truncate transition-colors">{{chapterTitle}}</span>
        </div>
        <span class="text-xs text-white/60 group-hover:text-[#4376f6] font-mono transition-transform group-hover:translate-x-1">→</span>
    </a>`,
    chapterHeader: `
    <header class="mb-6 bg-gradient-to-r from-[#4376f6] to-[#3b66df] -mx-6 -mt-6 md:-mx-10 md:-mt-10 p-6 md:p-8 rounded-t-2xl text-white shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <span class="inline-block text-[10px] font-bold tracking-widest text-white/80 bg-white/20 px-3 py-1 rounded-full uppercase mb-2">SECTION // MODULE 0{{chapterNumber}}</span>
        <h2 class="text-2xl md:text-3xl font-bold tracking-tight text-white">{{chapterTitle}}</h2>
      </div>
      <a href="#bunny-quick-routing" class="inline-flex items-center gap-1.5 text-xs font-semibold text-white/90 hover:text-[#4376f6] bg-white/10 hover:bg-white border border-white/10 px-4 py-2 rounded-xl transition-all no-print self-start sm:self-center">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
        Index Canvas
      </a>
    </header>`,
    chapterBodyWrapper: `
    <section id="chapter-{{chapterNumber}}" class="chapter-section scroll-mt-24 bg-white rounded-2xl border border-slate-200/80 p-6 md:p-10 shadow-sm shadow-slate-100/40 overflow-hidden">
        {{{chapterHeader}}}
        <div class="prose prose-slate max-w-none text-slate-600 leading-relaxed prose-headings:text-slate-900 prose-headings:font-bold prose-p:mb-4 prose-a:text-[#4376f6] prose-a:font-semibold prose-strong:text-slate-900 prose-code:bg-slate-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-blue-600 prose-code:text-xs">
            {{{parsedContent}}}
        </div>
    </section>`,
    pageFooter: `
    <footer class="bg-white border border-slate-200/80 rounded-xl p-4 flex flex-col sm:flex-row gap-2 justify-between items-center text-xs font-medium text-slate-400 no-print shadow-xs">
        <div class="flex items-center space-x-2">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Live Workspace Sync Active</span>
        </div>
        <span class="font-mono text-[10px] uppercase text-slate-400/80">&copy; {{currentYear}} BOOK AI CORE ENGINE</span>
    </footer>`,
  },
};
