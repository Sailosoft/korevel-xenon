"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// CatalogTheme Interface — all color tokens used across the Catalog component
// All values are raw CSS values (hex, rgba, etc.) — NOT Tailwind classes.
// ---------------------------------------------------------------------------
export interface CatalogTheme {
  name: "light" | "dark";

  // --- Page ----------------------------------------------------------------
  pageBg: string;
  pageText: string;

  // --- Background grid -----------------------------------------------------
  gridColor: string;

  // --- Floating orbs -------------------------------------------------------
  orbPrimary: string;
  orbSecondary: string;

  // --- Navigation ----------------------------------------------------------
  navBg: string;
  navBorder: string;
  navLinkActiveText: string;
  navLinkInactiveText: string;

  // --- Logo ----------------------------------------------------------------
  logoIconFrom: string;
  logoIconTo: string;
  logoIconShadow: string;
  logoText: string;
  logoAccent: string;

  // --- Search input --------------------------------------------------------
  inputBg: string;
  inputBorder: string;
  inputText: string;
  inputPlaceholder: string;
  inputFocusBorder: string;

  // --- Hero ----------------------------------------------------------------
  heroHeadingText: string;
  heroGradientFrom: string;
  heroGradientVia: string;
  heroGradientTo: string;
  heroDescriptionText: string;

  // --- Filter buttons ------------------------------------------------------
  filterActiveBg: string;
  filterActiveText: string;
  filterActiveShadow: string;
  filterInactiveBg: string;
  filterInactiveText: string;
  filterInactiveHoverBg: string;
  filterInactiveBorder: string;

  // --- Cards ---------------------------------------------------------------
  cardBg: string;
  cardBorder: string;
  cardHoverBorder: string;
  cardHoverShadow: string;
  cardIconInnerBg: string;
  cardIconText: string;
  cardBadgeBg: string;
  cardBadgeText: string;
  cardBadgeBorder: string;
  cardTitleText: string;
  cardTitleHover: string;
  cardDescriptionText: string;
  cardFooterBorder: string;
  cardStatusText: string;
  cardLaunchText: string;
  cardLaunchHover: string;
  cardGlowOpacity: string;

  // --- Empty state ---------------------------------------------------------
  emptyIconCircleBg: string;
  emptyIconColor: string;
  emptyHeadingText: string;
  emptyDescriptionText: string;
  emptyButtonBg: string;
  emptyButtonBorder: string;
  emptyButtonText: string;
  emptyButtonHoverBg: string;

  // --- Footer --------------------------------------------------------------
  footerBg: string;
  footerBorder: string;
  footerText: string;
  footerLinkHover: string;

  // --- Loading overlay -----------------------------------------------------
  overlayBg: string;
  overlayLoaderBg: string;
  overlayLoaderFrom: string;
  overlayLoaderTo: string;
  overlayText: string;
  overlaySubText: string;

  // --- Status dots ---------------------------------------------------------
  statusActive: string;
  statusMaintenance: string;
  statusInactive: string;
}

// ---------------------------------------------------------------------------
// Theme Presets
// ---------------------------------------------------------------------------

export const darkTheme: CatalogTheme = {
  name: "dark",

  pageBg: "#0f172a",
  pageText: "#e2e8f0",

  gridColor: "rgba(255,255,255,0.03)",

  orbPrimary: "rgba(79,70,229,0.2)",
  orbSecondary: "rgba(147,51,234,0.2)",

  navBg: "rgba(15,23,42,0.8)",
  navBorder: "rgba(255,255,255,0.05)",
  navLinkActiveText: "#ffffff",
  navLinkInactiveText: "#94a3b8",

  logoIconFrom: "#6366f1",
  logoIconTo: "#a855f7",
  logoIconShadow: "rgba(99,102,241,0.3)",
  logoText: "#ffffff",
  logoAccent: "#818cf8",

  inputBg: "rgba(30,41,59,0.5)",
  inputBorder: "#334155",
  inputText: "#e2e8f0",
  inputPlaceholder: "#64748b",
  inputFocusBorder: "#6366f1",

  heroHeadingText: "#ffffff",
  heroGradientFrom: "#818cf8",
  heroGradientVia: "#c084fc",
  heroGradientTo: "#f472b6",
  heroDescriptionText: "#94a3b8",

  filterActiveBg: "#4f46e5",
  filterActiveText: "#ffffff",
  filterActiveShadow: "rgba(99,102,241,0.25)",
  filterInactiveBg: "#1e293b",
  filterInactiveText: "#94a3b8",
  filterInactiveHoverBg: "#334155",
  filterInactiveBorder: "#334155",

  cardBg: "rgba(30,41,59,0.7)",
  cardBorder: "rgba(255,255,255,0.05)",
  cardHoverBorder: "rgba(99,102,241,0.5)",
  cardHoverShadow: "0 20px 40px -10px rgba(0,0,0,0.5), 0 0 20px rgba(99,102,241,0.2)",
  cardIconInnerBg: "#0f172a",
  cardIconText: "#ffffff",
  cardBadgeBg: "#1e293b",
  cardBadgeText: "#cbd5e1",
  cardBadgeBorder: "#334155",
  cardTitleText: "#ffffff",
  cardTitleHover: "#818cf8",
  cardDescriptionText: "#94a3b8",
  cardFooterBorder: "rgba(255,255,255,0.05)",
  cardStatusText: "#64748b",
  cardLaunchText: "#818cf8",
  cardLaunchHover: "#a5b4fc",
  cardGlowOpacity: "0.2",

  emptyIconCircleBg: "#1e293b",
  emptyIconColor: "#64748b",
  emptyHeadingText: "#ffffff",
  emptyDescriptionText: "#94a3b8",
  emptyButtonBg: "#1e293b",
  emptyButtonBorder: "#334155",
  emptyButtonText: "#ffffff",
  emptyButtonHoverBg: "#334155",

  footerBg: "rgba(15,23,42,0.5)",
  footerBorder: "rgba(255,255,255,0.05)",
  footerText: "#64748b",
  footerLinkHover: "#818cf8",

  overlayBg: "rgba(15,23,42,0.9)",
  overlayLoaderBg: "#1e293b",
  overlayLoaderFrom: "#6366f1",
  overlayLoaderTo: "#a855f7",
  overlayText: "#ffffff",
  overlaySubText: "#94a3b8",

  statusActive: "#10b981",
  statusMaintenance: "#f59e0b",
  statusInactive: "#64748b",
};

export const lightTheme: CatalogTheme = {
  name: "light",

  pageBg: "#ffffff",
  pageText: "#1e293b",

  gridColor: "rgba(0,0,0,0.04)",

  orbPrimary: "rgba(199,210,254,0.5)",
  orbSecondary: "rgba(233,213,255,0.5)",

  navBg: "rgba(255,255,255,0.9)",
  navBorder: "#e2e8f0",
  navLinkActiveText: "#0f172a",
  navLinkInactiveText: "#64748b",

  logoIconFrom: "#6366f1",
  logoIconTo: "#a855f7",
  logoIconShadow: "rgba(99,102,241,0.2)",
  logoText: "#0f172a",
  logoAccent: "#4f46e5",

  inputBg: "#f1f5f9",
  inputBorder: "#cbd5e1",
  inputText: "#1e293b",
  inputPlaceholder: "#94a3b8",
  inputFocusBorder: "#6366f1",

  heroHeadingText: "#0f172a",
  heroGradientFrom: "#4f46e5",
  heroGradientVia: "#9333ea",
  heroGradientTo: "#ec4899",
  heroDescriptionText: "#64748b",

  filterActiveBg: "#4f46e5",
  filterActiveText: "#ffffff",
  filterActiveShadow: "rgba(99,102,241,0.25)",
  filterInactiveBg: "#f1f5f9",
  filterInactiveText: "#475569",
  filterInactiveHoverBg: "#e2e8f0",
  filterInactiveBorder: "#cbd5e1",

  cardBg: "rgba(255,255,255,0.85)",
  cardBorder: "rgba(0,0,0,0.08)",
  cardHoverBorder: "rgba(99,102,241,0.4)",
  cardHoverShadow: "0 20px 40px -10px rgba(0,0,0,0.12), 0 0 20px rgba(99,102,241,0.15)",
  cardIconInnerBg: "#ffffff",
  cardIconText: "#0f172a",
  cardBadgeBg: "#f1f5f9",
  cardBadgeText: "#475569",
  cardBadgeBorder: "#e2e8f0",
  cardTitleText: "#0f172a",
  cardTitleHover: "#4f46e5",
  cardDescriptionText: "#64748b",
  cardFooterBorder: "#e2e8f0",
  cardStatusText: "#94a3b8",
  cardLaunchText: "#4f46e5",
  cardLaunchHover: "#6366f1",
  cardGlowOpacity: "0.1",

  emptyIconCircleBg: "#f1f5f9",
  emptyIconColor: "#94a3b8",
  emptyHeadingText: "#0f172a",
  emptyDescriptionText: "#64748b",
  emptyButtonBg: "#f1f5f9",
  emptyButtonBorder: "#e2e8f0",
  emptyButtonText: "#1e293b",
  emptyButtonHoverBg: "#e2e8f0",

  footerBg: "#f8fafc",
  footerBorder: "#e2e8f0",
  footerText: "#94a3b8",
  footerLinkHover: "#4f46e5",

  overlayBg: "rgba(255,255,255,0.95)",
  overlayLoaderBg: "#e2e8f0",
  overlayLoaderFrom: "#6366f1",
  overlayLoaderTo: "#a855f7",
  overlayText: "#0f172a",
  overlaySubText: "#64748b",

  statusActive: "#10b981",
  statusMaintenance: "#f59e0b",
  statusInactive: "#94a3b8",
};

// ---------------------------------------------------------------------------
// Theme registry
// ---------------------------------------------------------------------------
const themes: Record<string, CatalogTheme> = {
  light: lightTheme,
  dark: darkTheme,
};

// ---------------------------------------------------------------------------
// Helper: build a React.CSSProperties object from theme tokens
// ---------------------------------------------------------------------------
export function themeToCSSVars(theme: CatalogTheme): React.CSSProperties {
  return {
    "--page-bg": theme.pageBg,
    "--page-text": theme.pageText,
    "--grid-color": theme.gridColor,
    "--orb-primary": theme.orbPrimary,
    "--orb-secondary": theme.orbSecondary,
    "--nav-bg": theme.navBg,
    "--nav-border": theme.navBorder,
    "--nav-link-active": theme.navLinkActiveText,
    "--nav-link-inactive": theme.navLinkInactiveText,
    "--logo-icon-from": theme.logoIconFrom,
    "--logo-icon-to": theme.logoIconTo,
    "--logo-icon-shadow": theme.logoIconShadow,
    "--logo-text": theme.logoText,
    "--logo-accent": theme.logoAccent,
    "--input-bg": theme.inputBg,
    "--input-border": theme.inputBorder,
    "--input-text": theme.inputText,
    "--input-placeholder": theme.inputPlaceholder,
    "--input-focus-border": theme.inputFocusBorder,
    "--hero-heading": theme.heroHeadingText,
    "--hero-gradient-from": theme.heroGradientFrom,
    "--hero-gradient-via": theme.heroGradientVia,
    "--hero-gradient-to": theme.heroGradientTo,
    "--hero-desc": theme.heroDescriptionText,
    "--filter-active-bg": theme.filterActiveBg,
    "--filter-active-text": theme.filterActiveText,
    "--filter-active-shadow": theme.filterActiveShadow,
    "--filter-inactive-bg": theme.filterInactiveBg,
    "--filter-inactive-text": theme.filterInactiveText,
    "--filter-inactive-hover-bg": theme.filterInactiveHoverBg,
    "--filter-inactive-border": theme.filterInactiveBorder,
    "--card-bg": theme.cardBg,
    "--card-border": theme.cardBorder,
    "--card-hover-border": theme.cardHoverBorder,
    "--card-hover-shadow": theme.cardHoverShadow,
    "--card-icon-inner-bg": theme.cardIconInnerBg,
    "--card-icon-text": theme.cardIconText,
    "--card-badge-bg": theme.cardBadgeBg,
    "--card-badge-text": theme.cardBadgeText,
    "--card-badge-border": theme.cardBadgeBorder,
    "--card-title": theme.cardTitleText,
    "--card-title-hover": theme.cardTitleHover,
    "--card-desc": theme.cardDescriptionText,
    "--card-footer-border": theme.cardFooterBorder,
    "--card-status-text": theme.cardStatusText,
    "--card-launch": theme.cardLaunchText,
    "--card-launch-hover": theme.cardLaunchHover,
    "--card-glow-opacity": theme.cardGlowOpacity,
    "--empty-icon-circle-bg": theme.emptyIconCircleBg,
    "--empty-icon-color": theme.emptyIconColor,
    "--empty-heading": theme.emptyHeadingText,
    "--empty-desc": theme.emptyDescriptionText,
    "--empty-btn-bg": theme.emptyButtonBg,
    "--empty-btn-border": theme.emptyButtonBorder,
    "--empty-btn-text": theme.emptyButtonText,
    "--empty-btn-hover-bg": theme.emptyButtonHoverBg,
    "--footer-bg": theme.footerBg,
    "--footer-border": theme.footerBorder,
    "--footer-text": theme.footerText,
    "--footer-link-hover": theme.footerLinkHover,
    "--overlay-bg": theme.overlayBg,
    "--overlay-loader-bg": theme.overlayLoaderBg,
    "--overlay-loader-from": theme.overlayLoaderFrom,
    "--overlay-loader-to": theme.overlayLoaderTo,
    "--overlay-text": theme.overlayText,
    "--overlay-sub-text": theme.overlaySubText,
    "--status-active": theme.statusActive,
    "--status-maintenance": theme.statusMaintenance,
    "--status-inactive": theme.statusInactive,
  } as React.CSSProperties;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const STORAGE_KEY = "korevel-catalog-theme";

interface ThemeContextValue {
  theme: CatalogTheme;
  setTheme: (name: "light" | "dark") => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: lightTheme,
  setTheme: () => {},
  toggleTheme: () => {},
});

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function CatalogThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeName, setThemeName] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "light" || stored === "dark") return stored;
    }
    return "light"; // default to light
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, themeName);
  }, [themeName]);

  const setTheme = useCallback((name: "light" | "dark") => {
    setThemeName(name);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeName((prev) => (prev === "light" ? "dark" : "light"));
  }, []);

  const value: ThemeContextValue = {
    theme: themes[themeName] ?? lightTheme,
    setTheme,
    toggleTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useCatalogTheme() {
  return useContext(ThemeContext);
}
