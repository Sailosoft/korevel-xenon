"use client";

import React, { useMemo, useState, useCallback } from "react";
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
  ChevronDown: ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  ),
  Box: ({ className = "w-4 h-4", style }: { className?: string; style?: React.CSSProperties }) => (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
    </svg>
  ),
  GitBranch: ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" x2="6" y1="3" y2="15" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M18 9a9 9 0 0 1-9 9" />
    </svg>
  ),
};

// ---------------------------------------------------------------------------
// Version Parsing & Grouping
// ---------------------------------------------------------------------------
interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
  raw: string;
}

/** Parse a version string like "v4.4.1" → { major: 4, minor: 4, patch: 1 } */
function parseVersion(version: string): ParsedVersion | null {
  const match = version.match(/^v?(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    raw: version,
  };
}

interface MinorGroup {
  minor: number;
  label: string;
  releases: CatalogRelease[];
}

interface MajorGroup {
  major: number;
  label: string;
  minors: MinorGroup[];
  totalReleases: number;
}

/** Group releases by major → minor version for hierarchical display. */
function groupReleasesByVersion(releases: CatalogRelease[]): MajorGroup[] {
  const map = new Map<number, Map<number, CatalogRelease[]>>();

  for (const release of releases) {
    const parsed = parseVersion(release.version);
    if (!parsed) continue;

    if (!map.has(parsed.major)) map.set(parsed.major, new Map());
    const minorMap = map.get(parsed.major)!;
    if (!minorMap.has(parsed.minor)) minorMap.set(parsed.minor, []);
    minorMap.get(parsed.minor)!.push(release);
  }

  const groups: MajorGroup[] = [];

  // Sort major versions descending
  const sortedMajors = [...map.keys()].sort((a, b) => b - a);

  for (const major of sortedMajors) {
    const minorMap = map.get(major)!;
    const sortedMinors = [...minorMap.keys()].sort((a, b) => b - a);

    const minors: MinorGroup[] = sortedMinors.map((minor) => ({
      minor,
      label: `${major}.${minor}`,
      releases: minorMap.get(minor)!.sort((a, b) =>
        releaseLatestDate(b).localeCompare(releaseLatestDate(a)),
      ),
    }));

    const totalReleases = minors.reduce((sum, m) => sum + m.releases.length, 0);

    groups.push({
      major,
      label: `Version ${major}`,
      minors,
      totalReleases,
    });
  }

  return groups;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
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

  const [expandedMajor, setExpandedMajor] = useState<Set<number>>(() => {
    // Expand the first (newest) major group by default
    const groups = groupReleasesByVersion(catalogReleases);
    return groups.length > 0 ? new Set([groups[0].major]) : new Set();
  });

  const [expandedMinor, setExpandedMinor] = useState<Set<string>>(() => {
    // Expand all minor groups within the newest major by default
    const groups = groupReleasesByVersion(catalogReleases);
    if (groups.length === 0) return new Set();
    const keys = new Set<string>();
    for (const m of groups[0].minors) keys.add(`${groups[0].major}.${m.minor}`);
    return keys;
  });

  const toggleMajor = useCallback((major: number) => {
    setExpandedMajor((prev) => {
      const next = new Set(prev);
      if (next.has(major)) next.delete(major);
      else next.add(major);
      return next;
    });
  }, []);

  const toggleMinor = useCallback((key: string) => {
    setExpandedMinor((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const versionGroups = useMemo(
    () => groupReleasesByVersion(catalogReleases),
    [],
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
      <CatalogHeader />

      {/* ========== Main Content ========== */}
      <main className="relative z-10 pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
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
            application suite — grouped by version hierarchy.
          </p>
        </div>

        {/* ---- Version Groups ---- */}
        {versionGroups.length > 0 ? (
          <div className="space-y-6">
            {versionGroups.map((group, gIdx) => (
              <MajorVersionSection
                key={group.major}
                group={group}
                index={gIdx}
                isExpanded={expandedMajor.has(group.major)}
                expandedMinor={expandedMinor}
                onToggleMajor={() => toggleMajor(group.major)}
                onToggleMinor={toggleMinor}
              />
            ))}
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
        <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center">
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
// MajorVersionSection — top-level collapsible group (e.g. "Version 4")
// ---------------------------------------------------------------------------
function MajorVersionSection({
  group,
  index,
  isExpanded,
  expandedMinor,
  onToggleMajor,
  onToggleMinor,
}: {
  group: MajorGroup;
  index: number;
  isExpanded: boolean;
  expandedMinor: Set<string>;
  onToggleMajor: () => void;
  onToggleMinor: (key: string) => void;
}) {
  const { theme } = useCatalogTheme();

  return (
    <div
      className="rounded-2xl overflow-hidden animate-[slideUpFade_0.6s_cubic-bezier(0.16,1,0.3,1)_forwards] opacity-0"
      style={{
        animationDelay: `${index * 0.1}s`,
        backgroundColor: theme.cardBg,
        border: `1px solid ${theme.cardBorder}`,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      {/* Major version header — clickable toggle */}
      <button
        type="button"
        onClick={onToggleMajor}
        className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left transition-colors"
        style={{
          cursor: "pointer",
          backgroundColor: "transparent",
          border: "none",
          outline: "none",
        }}
      >
        <div className="flex items-center gap-4">
          {/* Icon badge */}
          <div
            className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0"
            style={{
              background: `linear-gradient(135deg, ${theme.logoIconFrom}, ${theme.logoIconTo})`,
              boxShadow: `0 4px 14px ${theme.logoIconShadow}`,
            }}
          >
            <Icons.Box className="w-6 h-6" style={{ color: "#fff" }} />
          </div>
          <div>
            <h2
              className="text-2xl font-extrabold tracking-tight"
              style={{ color: theme.heroHeadingText }}
            >
              {group.label}
            </h2>
            <p
              className="text-sm mt-0.5"
              style={{ color: theme.heroDescriptionText }}
            >
              {group.totalReleases} release{group.totalReleases !== 1 ? "s" : ""} across{" "}
              {group.minors.length} minor version{group.minors.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Chevron */}
        <div
          className="transition-transform duration-300"
          style={{
            transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
            color: theme.heroDescriptionText,
          }}
        >
          <Icons.ChevronDown className="w-6 h-6" />
        </div>
      </button>

      {/* Expanded content */}
      <div
        style={{
          maxHeight: isExpanded ? "2000px" : "0px",
          opacity: isExpanded ? 1 : 0,
          overflow: "hidden",
          transition: "max-height 0.4s cubic-bezier(0.16,1,0.3,1), opacity 0.3s ease",
        }}
      >
        <div
          className="px-6 pb-6 space-y-4"
          style={{ borderTop: `1px solid ${theme.cardFooterBorder}` }}
        >
          {group.minors.map((minorGroup) => {
            const minorKey = `${group.major}.${minorGroup.minor}`;
            const isMinorExpanded = expandedMinor.has(minorKey);

            return (
              <MinorVersionGroup
                key={minorKey}
                group={minorGroup}
                major={group.major}
                isExpanded={isMinorExpanded}
                onToggle={() => onToggleMinor(minorKey)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MinorVersionGroup — second-level collapsible (e.g. "4.4")
// ---------------------------------------------------------------------------
function MinorVersionGroup({
  group,
  major,
  isExpanded,
  onToggle,
}: {
  group: MinorGroup;
  major: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const { theme } = useCatalogTheme();

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: theme.pageBg,
        border: `1px solid ${theme.cardBorder}`,
      }}
    >
      {/* Minor version header */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 px-5 py-3.5 text-left transition-colors"
        style={{ cursor: "pointer", backgroundColor: "transparent", border: "none", outline: "none" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
            style={{
              backgroundColor: theme.filterActiveBg,
              color: theme.filterActiveText,
            }}
          >
            <Icons.GitBranch className="w-4 h-4" />
          </div>
          <div>
            <span
              className="text-base font-bold tracking-tight"
              style={{ color: theme.heroHeadingText }}
            >
              {group.label}
            </span>
            <span
              className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: theme.cardBadgeBg,
                color: theme.cardBadgeText,
                border: `1px solid ${theme.cardBadgeBorder}`,
              }}
            >
              {group.releases.length} patch{group.releases.length !== 1 ? "es" : ""}
            </span>
          </div>
        </div>
        <div
          className="transition-transform duration-300"
          style={{
            transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
            color: theme.heroDescriptionText,
          }}
        >
          <Icons.ChevronDown className="w-4 h-4" />
        </div>
      </button>

      {/* Expanded patch releases */}
      <div
        style={{
          maxHeight: isExpanded ? "2000px" : "0px",
          opacity: isExpanded ? 1 : 0,
          overflow: "hidden",
          transition: "max-height 0.35s cubic-bezier(0.16,1,0.3,1), opacity 0.25s ease",
        }}
      >
        <div className="px-5 pb-4 space-y-3">
          {group.releases.map((release, i) => (
            <PatchReleaseCard
              key={`${release.version}-${i}`}
              release={release}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PatchReleaseCard — leaf-level individual release card
// ---------------------------------------------------------------------------
function PatchReleaseCard({ release }: { release: CatalogRelease }) {
  const { theme } = useCatalogTheme();
  const parsed = parseVersion(release.version);

  return (
    <div
      className="rounded-xl p-5 relative group"
      style={{
        backgroundColor: theme.cardBg,
        border: `1px solid ${theme.cardBorder}`,
        transition: "border-color 0.2s ease, box-shadow 0.2s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = theme.logoIconFrom;
        e.currentTarget.style.boxShadow = `0 0 20px ${theme.logoIconShadow}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = theme.cardBorder;
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Version + Title header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="px-3 py-1 rounded-lg text-sm font-extrabold tracking-wider font-mono"
            style={{
              background: `linear-gradient(135deg, ${theme.logoIconFrom}, ${theme.logoIconTo})`,
              color: "#fff",
              boxShadow: `0 2px 8px ${theme.logoIconShadow}`,
            }}
          >
            {release.version}
          </span>
          <span
            className="px-3 py-1 rounded-full text-xs font-semibold"
            style={{
              backgroundColor: theme.filterActiveBg,
              color: theme.filterActiveText,
            }}
          >
            {release.title}
          </span>
        </div>

        {/* Version breakdown pill */}
        {parsed && (
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono"
            style={{
              backgroundColor: theme.cardBadgeBg,
              color: theme.cardBadgeText,
              border: `1px solid ${theme.cardBadgeBorder}`,
            }}
          >
            <span className="font-bold" style={{ color: theme.logoIconFrom }}>
              {parsed.major}
            </span>
            <span style={{ color: theme.heroDescriptionText }}>.</span>
            <span className="font-semibold" style={{ color: theme.logoIconTo }}>
              {parsed.minor}
            </span>
            <span style={{ color: theme.heroDescriptionText }}>.</span>
            <span>{parsed.patch}</span>
          </div>
        )}
      </div>

      {/* Dates */}
      <div className="flex flex-wrap gap-3 mb-3">
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
      <ul className="space-y-2 mb-4">
        {release.content.map((line, i) => (
          <li
            key={i}
            className="text-sm leading-relaxed flex gap-2.5"
            style={{ color: theme.cardDescriptionText }}
          >
            <span
              className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
              style={{
                background: `linear-gradient(135deg, ${theme.logoIconFrom}, ${theme.logoIconTo})`,
              }}
            />
            {line}
          </li>
        ))}
      </ul>

      {/* Affected apps */}
      <div
        className="pt-3 flex flex-wrap gap-2"
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
