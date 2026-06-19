// bui.document-shell.config.ts
//
// Configuration types, default theme, and nav-item definitions for the
// BUIDocumentShell. Consumers import `BUNNY_AI_SHELL_CONFIG` and pass it
// to `<BUIDocumentShell>` to get a themed sidebar + header + main area.

import type { LucideIcon } from "lucide-react";

// ── Theme ──────────────────────────────────────────────────────────────────────

export interface BUIDocumentShellTheme {
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

/** Default Laravel-inspired red theme — tweak to taste. */
export const DEFAULT_BUI_THEME: BUIDocumentShellTheme = {
  bgWindow: "bg-[#f8fafc]",
  bgSidebar: "bg-white",
  border: "border-slate-100",
  textPrimary: "text-[#ff2d20]",
  textMuted: "text-slate-400",
  gradient: "from-[#ff2d20] to-[#f43f5e]",
  shadow: "shadow-red-100",
  btnPrimary: "bg-[#ff2d20] text-white hover:bg-[#e0241b] transition-colors",
  btnSecondary: "text-[#ff2d20] bg-red-50 hover:bg-red-100 transition-colors",
  navActive: "text-[#ff2d20] bg-red-50/70 font-semibold",
  navHover:
    "text-slate-600 hover:bg-slate-50 hover:text-[#ff2d20] transition-colors",
  avatarBg: "bg-red-100",
  avatarText: "text-[#ff2d20]",
};

// ── Nav Items ──────────────────────────────────────────────────────────────────

export interface BUINavItem {
  /** Link href — use the full Next.js route path. */
  href: string;
  /** Display label in the sidebar. */
  label: string;
  /** Lucide icon component. */
  icon: LucideIcon;
  /** Optional section group label (e.g. "Main Menu", "Settings"). */
  section?: string;
  /** Optional variant to alter the appearance (e.g. "danger"). */
  variant?: string;
}

// ── Wizard ─────────────────────────────────────────────────────────────────────

export interface BUIWizardConfig {
  /** Display label on the call-to-action button (e.g. "Open Wizard"). */
  label: string;
  /** Route to navigate to when clicked. */
  href: string;
}

// ── Profile ────────────────────────────────────────────────────────────────────

export interface BUIProfile {
  initials: string;
  name: string;
  subtitle: string;
}

// ── Shell Config ───────────────────────────────────────────────────────────────

export interface BUIDocumentShellConfig {
  /** Application title shown in the header next to the brand icon. */
  title: string;
  /** Sidebar brand name. */
  brand: string;
  /** Theme overrides — deep-merges with DEFAULT_BUI_THEME. */
  theme?: Partial<BUIDocumentShellTheme>;
  /** Navigation items (in display order). */
  navItems: BUINavItem[];
  /** Optional call-to-action wizard button rendered at the top of the nav. */
  wizard?: BUIWizardConfig;
  /** Optional user profile widget in the sidebar footer. */
  profile?: BUIProfile;
}
