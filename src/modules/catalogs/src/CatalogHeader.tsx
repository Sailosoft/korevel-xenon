"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import pkg from "../../../../package.json";
import { useCatalogTheme } from "./Catalog.Theme";

// ---------------------------------------------------------------------------
// SVG Icon Components (self-contained)
// ---------------------------------------------------------------------------
const Icons = {
  Zap: ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  ),
  Search: ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
    </svg>
  ),
  Sun: ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  ),
  Moon: ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  ),
};

// ---------------------------------------------------------------------------
// Shared navigation links
// ---------------------------------------------------------------------------
const NAV_LINKS = [
  { label: "Catalog", href: "/" },
  { label: "Releases", href: "/modules/catalogs/releases" },
  { label: "Documentation", href: "#" },
  { label: "Support", href: "#" },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface CatalogHeaderProps {
  /** Current search value. When provided along with `onSearchChange`, the search input renders. */
  searchQuery?: string;
  /** Search change handler. When provided, the search input renders in the header. */
  onSearchChange?: (value: string) => void;
}

// ---------------------------------------------------------------------------
// CatalogHeader — shared navigation bar for Catalog and CatalogReleases
// ---------------------------------------------------------------------------
export default function CatalogHeader({
  searchQuery,
  onSearchChange,
}: CatalogHeaderProps) {
  const { theme, toggleTheme } = useCatalogTheme();
  const pathname = usePathname();
  const isDark = theme.name === "dark";
  const showSearch = typeof onSearchChange === "function";

  const isActive = (label: string, href: string): boolean => {
    if (label === "Catalog") return pathname === "/";
    return href !== "#" && pathname.startsWith(href);
  };

  return (
    <nav
      className="fixed top-0 w-full z-50 backdrop-blur-md"
      style={{
        backgroundColor: theme.navBg,
        borderBottom: `1px solid ${theme.navBorder}`,
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shadow-lg"
              style={{
                background: `linear-gradient(135deg, ${theme.logoIconFrom}, ${theme.logoIconTo})`,
                boxShadow: `0 10px 15px -3px ${theme.logoIconShadow}`,
              }}
            >
              <Icons.Zap className="w-5 h-5 text-white" />
            </div>
            <span
              className="font-bold text-xl tracking-tight"
              style={{ color: theme.logoText }}
            >
              Korevel
              <span style={{ color: theme.logoAccent }}>Xenon</span>
            </span>
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide border"
              style={{
                color: theme.logoText,
                borderColor: theme.navBorder,
                backgroundColor: theme.cardBadgeBg,
              }}
            >
              v{pkg.version}
            </span>
          </Link>

          {/* Nav links (desktop) */}
          <div className="hidden md:flex items-center space-x-8">
            {NAV_LINKS.map((link) => {
              const active = isActive(link.label, link.href);
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-sm font-medium transition-colors"
                  style={{
                    color: active
                      ? theme.navLinkActiveText
                      : theme.navLinkInactiveText,
                  }}
                  onMouseEnter={(e) => {
                    if (!active)
                      e.currentTarget.style.color = theme.navLinkActiveText;
                  }}
                  onMouseLeave={(e) => {
                    if (!active)
                      e.currentTarget.style.color = theme.navLinkInactiveText;
                  }}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Right side: Search (optional) + Theme Toggle */}
          <div className="flex items-center gap-3">
            {showSearch && (
              <div className="relative group">
                <input
                  type="text"
                  placeholder="Search apps..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  className="text-sm rounded-full pl-4 pr-10 py-1.5 outline-none w-48 transition-all group-hover:w-64"
                  style={{
                    backgroundColor: theme.inputBg,
                    border: `1px solid ${theme.inputBorder}`,
                    color: theme.inputText,
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor =
                      theme.inputFocusBorder;
                    e.currentTarget.style.boxShadow = `0 0 0 1px ${theme.inputFocusBorder}`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = theme.inputBorder;
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
                <div
                  className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none w-4 h-4"
                  style={{ color: theme.inputPlaceholder }}
                >
                  <Icons.Search />
                </div>
              </div>
            )}

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full transition-all border hover:scale-110 active:scale-95"
              style={{
                borderColor: theme.navBorder,
                color: theme.navLinkInactiveText,
              }}
              title={`Switch to ${isDark ? "light" : "dark"} theme`}
            >
              {isDark ? (
                <Icons.Sun className="w-4 h-4" />
              ) : (
                <Icons.Moon className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
