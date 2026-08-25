"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { catalogApps, type CatalogApp } from "./CatalogList";
import {
  CatalogThemeProvider,
  useCatalogTheme,
  themeToCSSVars,
} from "./Catalog.Theme";
import CatalogHeader from "./CatalogHeader";

// ---------------------------------------------------------------------------
// SVG Icon Components (self-contained)
// ---------------------------------------------------------------------------
const Icons = {
  ChevronRight: ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  ),
  Loader: ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
    </svg>
  ),
  Smile: ({ className = "w-8 h-8", style }: { className?: string; style?: React.CSSProperties }) => (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  ),
  Twitter: ({ className = "h-5 w-5" }: { className?: string }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" /></svg>
  ),
  GitHub: ({ className = "h-5 w-5" }: { className?: string }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" /></svg>
  ),
};

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------
const CATEGORY_LABELS: Record<string, string> = {
  all: "All Apps",
  productivity: "Productivity",
  analytics: "Analytics",
  design: "Design",
  security: "Security",
  ai: "AI",
  frontend: "Frontend",
  backend: "Backend",
};

const CATEGORY_ORDER = [
  "all",
  "productivity",
  "analytics",
  "design",
  "security",
  "ai",
  "frontend",
  "backend",
];

const StatusDot = ({ status }: { status: CatalogApp["status"] }) => (
  <span
    className="inline-block w-1.5 h-1.5 rounded-full shadow-lg"
    style={{
      backgroundColor: `var(--status-${status === "Active" ? "active" : status === "Maintenance" ? "maintenance" : "inactive"})`,
      boxShadow: `0 0 6px var(--status-${status === "Active" ? "active" : status === "Maintenance" ? "maintenance" : "inactive"})`,
    }}
    title={status}
  />
);

// ---------------------------------------------------------------------------
// CatalogInner — the actual component that reads theme context
// ---------------------------------------------------------------------------
function CatalogInner() {
  const router = useRouter();
  const { theme } = useCatalogTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [navigatingId, setNavigatingId] = useState<number | null>(null);

  const categories = useMemo(() => {
    const seen = new Set(catalogApps.map((a) => a.category));
    return CATEGORY_ORDER.filter(
      (c) => c === "all" || seen.has(c as CatalogApp["category"]),
    );
  }, []);

  const filteredApps = useMemo(() => {
    return catalogApps.filter((app) => {
      const matchesSearch =
        app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        activeCategory === "all" || app.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, activeCategory]);

  const handleLaunch = useCallback(
    (app: CatalogApp) => {
      if (navigatingId) return;
      setNavigatingId(app.id);
      router.push(app.url);
      setTimeout(() => setNavigatingId(null), 1200);
    },
    [navigatingId, router],
  );

  return (
    <div
      className="min-h-screen font-sans relative overflow-x-hidden"
      style={{
        backgroundColor: theme.pageBg,
        color: theme.pageText,
        ...themeToCSSVars(theme),
      }}
    >
      {/* ========== Background Effects ========== */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            backgroundSize: "50px 50px",
            backgroundImage: `linear-gradient(to right, ${theme.gridColor} 1px, transparent 1px), linear-gradient(to bottom, ${theme.gridColor} 1px, transparent 1px)`,
            maskImage:
              "radial-gradient(circle at center, black 40%, transparent 100%)",
            WebkitMaskImage:
              "radial-gradient(circle at center, black 40%, transparent 100%)",
          }}
        />
        <div
          className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-[100px] animate-[float_6s_ease-in-out_infinite]"
          style={{ backgroundColor: theme.orbPrimary }}
        />
        <div
          className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-[100px] animate-[float_6s_ease-in-out_infinite]"
          style={{ backgroundColor: theme.orbSecondary, animationDelay: "2s" }}
        />
      </div>

      {/* ========== Navigation ========== */}
      <CatalogHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* ========== Main Content ========== */}
      <main className="relative z-10 pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* ---- Hero ---- */}
        <div className="text-center mb-16 animate-[slideUpFade_0.6s_cubic-bezier(0.16,1,0.3,1)_forwards] opacity-0">
          <h1
            className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4"
            style={{ color: theme.heroHeadingText }}
          >
            Discover Our{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: `linear-gradient(to right, ${theme.heroGradientFrom}, ${theme.heroGradientVia}, ${theme.heroGradientTo})`,
              }}
            >
              Application Suite
            </span>
          </h1>
          <p
            className="text-lg max-w-2xl mx-auto mb-8"
            style={{ color: theme.heroDescriptionText }}
          >
            Explore our curated collection of powerful tools designed to
            streamline your workflow and boost productivity.
          </p>

          {/* Category Filter */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {categories.map((cat) => {
              const active = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className="px-4 py-2 rounded-full text-sm font-medium transition-all border"
                  style={{
                    backgroundColor: active
                      ? theme.filterActiveBg
                      : theme.filterInactiveBg,
                    color: active
                      ? theme.filterActiveText
                      : theme.filterInactiveText,
                    borderColor: active
                      ? "transparent"
                      : theme.filterInactiveBorder,
                    boxShadow: active
                      ? `0 10px 15px -3px ${theme.filterActiveShadow}`
                      : "none",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.backgroundColor =
                        theme.filterInactiveHoverBg;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.backgroundColor =
                        theme.filterInactiveBg;
                    }
                  }}
                >
                  {CATEGORY_LABELS[cat] ?? cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* ---- App Grid / Empty State ---- */}
        {filteredApps.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredApps.map((app, index) => (
              <div
                key={app.id}
                onClick={() => handleLaunch(app)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && handleLaunch(app)}
                className="app-card rounded-2xl p-6 relative overflow-hidden group cursor-pointer animate-[slideUpFade_0.6s_cubic-bezier(0.16,1,0.3,1)_forwards] opacity-0"
                style={{
                  animationDelay: `${index * 0.08}s`,
                  backgroundColor: theme.cardBg,
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  border: `1px solid ${theme.cardBorder}`,
                  transform: "perspective(1000px) translateY(0) scale(1) rotateX(0) rotateY(0)",
                  transition: "transform 0.15s ease-out, border-color 0.3s ease, box-shadow 0.3s ease",
                  transformStyle: "preserve-3d",
                  willChange: "transform",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget;
                  el.style.borderColor = theme.cardHoverBorder;
                  el.style.boxShadow = theme.cardHoverShadow;
                }}
                onMouseMove={(e) => {
                  const el = e.currentTarget;
                  const rect = el.getBoundingClientRect();
                  const centerX = rect.left + rect.width / 2;
                  const centerY = rect.top + rect.height / 2;
                  const mouseX = e.clientX - centerX;
                  const mouseY = e.clientY - centerY;
                  const tiltX = (mouseY / (rect.height / 2)) * -15;
                  const tiltY = (mouseX / (rect.width / 2)) * 15;
                  el.style.transform = `perspective(1000px) translateY(-10px) scale(1.03) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget;
                  el.style.transform = "perspective(1000px) translateY(0) scale(1) rotateX(0) rotateY(0)";
                  el.style.borderColor = theme.cardBorder;
                  el.style.boxShadow = "";
                }}
              >
                {/* Top row: icon + category badge */}
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-14 h-14 rounded-xl bg-gradient-to-br p-0.5 shadow-lg relative overflow-hidden"
                    style={{
                      background: `linear-gradient(135deg, ${app.gradientFrom}, ${app.gradientTo})`,
                    }}
                  >
                    <div
                      className="w-full h-full rounded-[10px] flex items-center justify-center"
                      style={{ backgroundColor: theme.cardIconInnerBg }}
                    >
                      {app.icon ? (
                        <app.icon className="w-6 h-6" style={{ color: theme.cardIconText }} />
                      ) : (
                        <span
                          className="font-bold text-xl select-none"
                          style={{ color: theme.cardIconText }}
                        >
                          {app.name.charAt(0)}
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className="px-3 py-1 rounded-full text-xs font-medium capitalize"
                    style={{
                      backgroundColor: theme.cardBadgeBg,
                      color: theme.cardBadgeText,
                      border: `1px solid ${theme.cardBadgeBorder}`,
                    }}
                  >
                    {CATEGORY_LABELS[app.category] ?? app.category}
                  </span>
                </div>

                {/* Name + Description */}
                <h3
                  className="text-xl font-bold mb-2 transition-colors"
                  style={{ color: theme.cardTitleText }}
                >
                  {app.name}
                </h3>
                <p
                  className="text-sm leading-relaxed mb-6 line-clamp-2"
                  style={{ color: theme.cardDescriptionText }}
                >
                  {app.description}
                </p>

                {/* Footer */}
                <div
                  className="flex items-center justify-between mt-auto pt-4"
                  style={{ borderTop: `1px solid ${theme.cardFooterBorder}` }}
                >
                  <div className="flex items-center gap-2">
                    <StatusDot status={app.status} />
                    <span
                      className="text-[10px] font-semibold uppercase tracking-widest"
                      style={{ color: theme.cardStatusText }}
                    >
                      {app.status}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLaunch(app);
                    }}
                    disabled={navigatingId === app.id}
                    className="text-sm font-medium flex items-center gap-1 transition-all group/btn"
                    style={{ color: theme.cardLaunchText }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = theme.cardLaunchHover)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = theme.cardLaunchText)
                    }
                  >
                    {navigatingId === app.id ? (
                      <>
                        Loading <Icons.Loader className="w-3.5 h-3.5" />
                      </>
                    ) : (
                      <>
                        Launch{" "}
                        <Icons.ChevronRight className="w-4 h-4 transform group-hover/btn:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </div>

                {/* Hover glow */}
                <div
                  className="absolute -bottom-10 -right-10 w-32 h-32 blur-2xl transition-opacity duration-500 pointer-events-none"
                  style={{
                    background: `linear-gradient(135deg, ${app.gradientFrom}, ${app.gradientTo})`,
                    opacity: 0,
                  }}
                  onMouseEnter={(e) => {
                    // parent hover triggers this via group-hover
                  }}
                />
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-20">
            <div
              className="inline-block p-4 rounded-full mb-4"
              style={{ backgroundColor: theme.emptyIconCircleBg }}
            >
              <Icons.Smile
                className="w-8 h-8"
                style={{ color: theme.emptyIconColor }}
              />
            </div>
            <h3
              className="text-xl font-medium"
              style={{ color: theme.emptyHeadingText }}
            >
              No apps found
            </h3>
            <p
              className="mt-2"
              style={{ color: theme.emptyDescriptionText }}
            >
              Try adjusting your search or filter criteria.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setActiveCategory("all");
              }}
              className="mt-6 text-sm font-semibold px-5 py-2.5 rounded-full transition-all"
              style={{
                backgroundColor: theme.emptyButtonBg,
                border: `1px solid ${theme.emptyButtonBorder}`,
                color: theme.emptyButtonText,
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor =
                  theme.emptyButtonHoverBg)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = theme.emptyButtonBg)
              }
            >
              Clear all filters
            </button>
          </div>
        )}
      </main>

      {/* ========== Footer ========== */}
      <footer
        className="relative z-10 backdrop-blur-sm mt-12"
        style={{
          backgroundColor: theme.footerBg,
          borderTop: `1px solid ${theme.footerBorder}`,
        }}
      >
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center">
          <p
            className="text-sm"
            style={{ color: theme.footerText }}
          >
            &copy; {new Date().getFullYear()} Korevel Xenon. All rights
            reserved.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a
              href="#"
              className="transition-colors"
              style={{ color: theme.footerText }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = theme.footerLinkHover)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = theme.footerText)
              }
            >
              <span className="sr-only">Twitter</span>
              <Icons.Twitter />
            </a>
            <a
              href="#"
              className="transition-colors"
              style={{ color: theme.footerText }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = theme.footerLinkHover)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = theme.footerText)
              }
            >
              <span className="sr-only">GitHub</span>
              <Icons.GitHub />
            </a>
          </div>
        </div>
      </footer>

      {/* ========== Keyframe animations ========== */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes loading {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(0%); }
          100% { transform: translateX(100%); }
        }
        .app-card:hover .card-icon {
          transform: scale(1.1) rotate(5deg);
          filter: drop-shadow(0 0 10px rgba(99, 102, 241, 0.6));
        }
      `}</style>

      {/* ========== Full-screen Loading Overlay ========== */}
      {navigatingId !== null && (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center backdrop-blur-xl transition-all duration-300"
          style={{ backgroundColor: theme.overlayBg }}
        >
          <div className="flex flex-col items-center gap-6 animate-[slideUpFade_0.4s_cubic-bezier(0.16,1,0.3,1)_forwards]">
            {/* App icon monogram */}
            <div
              className="w-20 h-20 rounded-2xl bg-gradient-to-br p-0.5 shadow-2xl"
              style={{
                background: `linear-gradient(135deg, ${catalogApps.find((a) => a.id === navigatingId)?.gradientFrom ?? "#6366f1"}, ${catalogApps.find((a) => a.id === navigatingId)?.gradientTo ?? "#a855f7"})`,
                boxShadow: `0 25px 50px -12px ${theme.logoIconShadow}`,
              }}
            >
              <div
                className="w-full h-full rounded-[14px] flex items-center justify-center"
                style={{ backgroundColor: theme.cardIconInnerBg }}
              >
                <span
                  className="font-bold text-3xl select-none"
                  style={{ color: theme.overlayText }}
                >
                  {catalogApps.find((a) => a.id === navigatingId)?.name.charAt(0) ?? "?"}
                </span>
              </div>
            </div>

            {/* App name */}
            <div className="text-center">
              <h2
                className="text-2xl font-bold tracking-tight"
                style={{ color: theme.overlayText }}
              >
                {catalogApps.find((a) => a.id === navigatingId)?.name ?? "Loading"}
              </h2>
              <p
                className="text-sm mt-1"
                style={{ color: theme.overlaySubText }}
              >
                Launching application…
              </p>
            </div>

            {/* Animated loader bar */}
            <div
              className="w-48 h-1.5 rounded-full overflow-hidden"
              style={{ backgroundColor: theme.overlayLoaderBg }}
            >
              <div
              className="h-full w-full rounded-full animate-[loading_1.2s_ease-in-out_infinite]"
                style={{
                  background: `linear-gradient(to right, ${theme.overlayLoaderFrom}, ${theme.overlayLoaderTo})`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Inject hover glow via global style — target child of app-card group */}
      <style>{`
        .app-card:hover .hover-glow {
          opacity: ${theme.cardGlowOpacity} !important;
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Catalog — wrapped with theme provider
// ---------------------------------------------------------------------------
export default function Catalog() {
  return (
    <CatalogThemeProvider>
      <CatalogInner />
    </CatalogThemeProvider>
  );
}
