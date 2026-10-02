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
}

/** Default bluish / MUI-inspired theme (locked decision #10). */
export const BD_SHELL_THEME: BDShellTheme = {
  bgWindow: "bg-[#f4f7fb]",
  bgSidebar: "bg-white",
  border: "border-slate-200",
  textPrimary: "text-[#1976d2]",
  textMuted: "text-slate-400",
  gradient: "from-[#1976d2] to-[#42a5f5]",
  shadow: "shadow-blue-100",
  btnPrimary:
    "bg-[#1976d2] text-white hover:bg-[#1565c0] transition-colors",
  btnSecondary:
    "text-[#1565c0] bg-blue-50 hover:bg-blue-100 transition-colors",
  navActive: "text-[#1565c0] bg-blue-50 font-semibold",
  navHover:
    "text-slate-600 hover:bg-slate-50 hover:text-[#1976d2] transition-colors",
  avatarBg: "bg-blue-100",
  avatarText: "text-[#1565c0]",
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
