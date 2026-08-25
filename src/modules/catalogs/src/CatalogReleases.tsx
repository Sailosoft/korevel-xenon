"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import {
  CatalogThemeProvider,
  useCatalogTheme,
  themeToCSSVars,
} from "./Catalog.Theme";
import CatalogHeader from "./CatalogHeader";
import { catalogReleases } from "./CatalogReleases.Dictionary";
import type { CatalogRelease } from "./CatalogReleases.Interface";

// ---------------------------------------------------------------------------
// SVG Icon Components (self-contained)
// ---------------------------------------------------------------------------
const Icons = {
  ArrowLeft: ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 19-7-7 7-7" /><path d="M19 12H5" />
    </svg>
  ),
  Calendar: ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="4" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  ),
  Tag: ({ className = "w-4 h-4", style }: { className?: string; style?: React.CSSProperties }) => (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" /><circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
    </svg>
  ),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/** Latest (max) date for a release — used for descending ordering. */
function releaseLatestDate(release: CatalogRelease): string {
  if (release.dates.length === 0) return "";
  return [...release.dates].sort().reverse()[0] ?? "";
}

function formatDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ---------------------------------------------------------------------------
// CatalogReleasesInner — reads theme context
// ---------------------------------------------------------------------------
function CatalogReleasesInner() {
  const { theme } = useCatalogTheme();

  // Releases displayed newest-first (descending by latest date).
  const releases = useMemo(() => {
    return [...catalogReleases].sort((a, b) =>
      releaseLatestDate(b).localeCompare(releaseLatestDate(a)),
    );
  }, []);

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
      <CatalogHeader />

      {/* ========== Main Content ========== */}
      <main className="relative z-10 pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* ---- Hero ---- */}
        <div className="text-center mb-16 animate-[slideUpFade_0.6s_cubic-bezier(0.16,1,0.3,1)_forwards] opacity-0">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium mb-6 transition-colors"
            style={{ color: theme.navLinkInactiveText }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = theme.navLinkActiveText)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = theme.navLinkInactiveText)
            }
          >
            <Icons.ArrowLeft className="w-4 h-4" />
            Back to Catalog
          </Link>
          <h1
            className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4"
            style={{ color: theme.heroHeadingText }}
          >
            Release{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: `linear-gradient(to right, ${theme.heroGradientFrom}, ${theme.heroGradientVia}, ${theme.heroGradientTo})`,
              }}
            >
              Notes
            </span>
          </h1>
          <p
            className="text-lg max-w-2xl mx-auto"
            style={{ color: theme.heroDescriptionText }}
          >
            A changelog of every update shipped to the Korevel Xenon
            application suite — newest release first.
          </p>
        </div>

        {/* ---- Release Timeline ---- */}
        {releases.length > 0 ? (
          <div className="relative">
            {/* Vertical line */}
            <div
              className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px"
              style={{ backgroundColor: theme.navBorder }}
            />
            <div className="space-y-10">
              {releases.map((release, index) => (
                <ReleaseCard
                  key={`${release.version}-${index}`}
                  release={release}
                  index={index}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <div
              className="inline-block p-4 rounded-full mb-4"
              style={{ backgroundColor: theme.emptyIconCircleBg }}
            >
              <Icons.Tag
                className="w-8 h-8"
                style={{ color: theme.emptyIconColor }}
              />
            </div>
            <h3
              className="text-xl font-medium"
              style={{ color: theme.emptyHeadingText }}
            >
              No releases yet
            </h3>
            <p
              className="mt-2"
              style={{ color: theme.emptyDescriptionText }}
            >
              Release documentation will appear here as changes are made.
            </p>
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
          <p className="text-sm" style={{ color: theme.footerText }}>
            &copy; {new Date().getFullYear()} Korevel Xenon. All rights
            reserved.
          </p>
          <Link
            href="/"
            className="text-sm font-medium transition-colors mt-4 md:mt-0"
            style={{ color: theme.footerText }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = theme.footerLinkHover)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = theme.footerText)
            }
          >
            Back to Catalog
          </Link>
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
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ReleaseCard — single timeline entry
// ---------------------------------------------------------------------------
function ReleaseCard({
  release,
  index,
}: {
  release: CatalogRelease;
  index: number;
}) {
  const { theme } = useCatalogTheme();
  const alignLeft = index % 2 === 0;

  return (
    <div
      className="relative flex flex-col md:flex-row items-start gap-6 animate-[slideUpFade_0.6s_cubic-bezier(0.16,1,0.3,1)_forwards] opacity-0"
      style={{ animationDelay: `${index * 0.08}s` }}
    >
      {/* Timeline node */}
      <div className="absolute left-4 md:left-1/2 top-2 -translate-x-1/2 w-4 h-4 rounded-full shadow-lg"
        style={{
          backgroundColor: theme.logoIconFrom,
          boxShadow: `0 0 0 4px ${theme.cardBg}, 0 0 12px ${theme.logoIconShadow}`,
        }}
      />

      {/* Card */}
      <div
        className="w-full md:w-[calc(50%-2.5rem)] ml-10 md:ml-0 rounded-2xl p-6 relative overflow-hidden"
        style={{
          backgroundColor: theme.cardBg,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: `1px solid ${theme.cardBorder}`,
          ...(alignLeft
            ? { marginRight: "auto" }
            : { marginLeft: "auto" }),
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <span
              className="px-3 py-1 rounded-full text-xs font-bold tracking-wide"
              style={{
                backgroundColor: theme.filterActiveBg,
                color: theme.filterActiveText,
                boxShadow: `0 10px 15px -3px ${theme.filterActiveShadow}`,
              }}
            >
              {release.version}
            </span>
            <span
              className="px-3 py-1 rounded-full text-xs font-medium"
              style={{
                backgroundColor: theme.cardBadgeBg,
                color: theme.cardBadgeText,
                border: `1px solid ${theme.cardBadgeBorder}`,
              }}
            >
              {release.title}
            </span>
          </div>
        </div>

        {/* Dates */}
        <div className="flex flex-wrap gap-2 mb-4">
          {release.dates.map((date, i) => (
            <span
              key={`${date}-${i}`}
              className="inline-flex items-center gap-1.5 text-xs"
              style={{ color: theme.cardStatusText }}
            >
              <Icons.Calendar className="w-3.5 h-3.5" />
              {formatDate(date)}
            </span>
          ))}
        </div>

        {/* Content */}
        <ul className="space-y-2 mb-5">
          {release.content.map((line, i) => (
            <li
              key={i}
              className="text-sm leading-relaxed flex gap-2"
              style={{ color: theme.cardDescriptionText }}
            >
              <span
                className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: theme.logoIconFrom }}
              />
              {line}
            </li>
          ))}
        </ul>

        {/* Affected apps */}
        <div
          className="pt-4 flex flex-wrap gap-2"
          style={{ borderTop: `1px solid ${theme.cardFooterBorder}` }}
        >
          {release.apps.map((app) => (
            <span
              key={app}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
              style={{
                backgroundColor: theme.cardBadgeBg,
                color: theme.cardBadgeText,
                border: `1px solid ${theme.cardBadgeBorder}`,
              }}
            >
              <Icons.Tag className="w-3 h-3" />
              {app}
            </span>
          ))}
        </div>

        {/* Hover glow */}
        <div
          className="absolute -bottom-10 -right-10 w-32 h-32 blur-2xl transition-opacity duration-500 pointer-events-none"
          style={{
            background: `linear-gradient(135deg, ${theme.logoIconFrom}, ${theme.logoIconTo})`,
            opacity: 0,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.2")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "0")}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CatalogReleases — wrapped with theme provider
// ---------------------------------------------------------------------------
export default function CatalogReleases() {
  return (
    <CatalogThemeProvider>
      <CatalogReleasesInner />
    </CatalogThemeProvider>
  );
}
