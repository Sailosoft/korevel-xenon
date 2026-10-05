// BDShell.config.ts — configuration types + bluish theme for the BDShell.
//
// BDShell is the single shell component reused by both BunnyDev layouts: the
// outer project-list layout and the inner project workspace layout.

import type { LucideIcon } from "lucide-react";

export interface BDShellTheme {
  bgWindow: string;
  bgSidebar: string;
  border: string;
  textPrimary: string;
  textMuted: string;
  gradient: string;
  shadow: string;
  btnPrimary: string;
  btnSecondary: string;
  navActive: string;
  navHover: string;
  avatarBg: string;
  avatarText: string;
  headerSurface: string;
  headerText: string;
  headerMuted: string;
  headerBtn: string;
}

/** Default bluish / MUI-inspired theme (locked decision #10). */
export const BD_SHELL_THEME: BDShellTheme = {
  bgWindow: "bg-[#f4f7fb]",
  bgSidebar: "bd-shell-sidebar",
  border: "border-white/10",
  textPrimary: "text-white",
  textMuted: "text-blue-200/80",
  gradient: "from-white to-blue-200",
  shadow: "shadow-blue-900/30",
  btnPrimary:
    "bg-white/15 text-white border border-white/20 hover:bg-white/25 backdrop-blur-sm transition-colors",
  btnSecondary:
    "text-white bg-white/15 hover:bg-white/25 backdrop-blur-sm transition-colors",
  navActive: "bg-white/15 text-white font-semibold ring-1 ring-white/20 shadow-sm",
  navHover:
    "text-blue-100 hover:bg-white/10 hover:text-white transition-colors",
  avatarBg: "bg-white/15",
  avatarText: "text-white",
  headerSurface: "bd-shell-header",
  headerText: "text-white",
  headerMuted: "text-blue-100",
  headerBtn:
    "bg-white/15 text-white hover:bg-white/25 backdrop-blur-sm transition-colors",
};

export interface BDNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  section?: string;
  variant?: string;
  badge?: string | number;
}

export interface BDShellWizard {
  label: string;
  href: string;
}

export interface BDShellProfile {
  initials: string;
  name: string;
  subtitle: string;
}

export interface BDShellConfig {
  title: string;
  brand: string;
  theme?: Partial<BDShellTheme>;
  navItems: BDNavItem[];
  wizard?: BDShellWizard;
  profile?: BDShellProfile;
  logoutHref?: string;
  /** Optional dismissable banner rendered above the page content. */
  banner?: string;
}
