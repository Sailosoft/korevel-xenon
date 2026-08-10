// bc.document-shell.config.ts
//
// Theme, navigation and layout config for the BunnyCase document shell.
// Consumers import `BC_SHELL_CONFIG` and pass it to `<BCDocumentShell>`.

import type { LucideIcon } from "lucide-react";
import {
  Users,
  Briefcase,
  PlayCircle,
  MessagesSquare,
  Swords,
  Library,
  LineChart,
  Settings,
  History,
  Bot,
  BookOpen,
  ScrollText,
} from "lucide-react";

// ── Theme ──────────────────────────────────────────────────────────────────────

export interface BCDocumentShellTheme {
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

/** Emerald "training / certification" theme. */
export const DEFAULT_BC_THEME: BCDocumentShellTheme = {
  bgWindow: "bg-[#f6f8f9]",
  bgSidebar: "bg-white",
  border: "border-slate-100",
  textPrimary: "text-emerald-600",
  textMuted: "text-slate-400",
  gradient: "from-emerald-500 to-teal-400",
  shadow: "shadow-emerald-100",
  btnPrimary:
    "bg-emerald-600 text-white hover:bg-emerald-500 transition-colors",
  btnSecondary:
    "text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors",
  navActive: "text-emerald-700 bg-emerald-50 font-semibold",
  navHover:
    "text-slate-600 hover:bg-slate-50 hover:text-emerald-700 transition-colors",
  avatarBg: "bg-emerald-100",
  avatarText: "text-emerald-700",
};

// ── Nav Items ──────────────────────────────────────────────────────────────────

export interface BCNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  section?: string;
  variant?: string;
}

/** The Conversational AI Training Ecosystem navigation (casual sections + settings). */
export const BC_SHELF_NAV_ITEMS: BCNavItem[] = [
  {
    href: "/modules/bunny-case",
    label: "Dashboard",
    icon: PlayCircle,
    section: "Overview",
  },
  {
    href: "/modules/bunny-case/personas",
    label: "Persona Architect",
    icon: Users,
    section: "Configure",
  },
  {
    href: "/modules/bunny-case/agent-personas",
    label: "Agent Persona",
    icon: Bot,
    section: "Configure",
  },
  {
    href: "/modules/bunny-case/cases",
    label: "Case Base",
    icon: Briefcase,
    section: "Configure",
  },
  {
    href: "/modules/bunny-case/simulator",
    label: "Conversation Simulator",
    icon: MessagesSquare,
    section: "Observe",
  },
  {
    href: "/modules/bunny-case/simulator-history",
    label: "Simulator History",
    icon: History,
    section: "Observe",
  },
  {
    href: "/modules/bunny-case/study",
    label: "Study",
    icon: BookOpen,
    section: "Learn",
  },
  {
    href: "/modules/bunny-case/trainer",
    label: "Conversation Trainer",
    icon: PlayCircle,
    section: "Interact",
  },
  {
    href: "/modules/bunny-case/gauntlet",
    label: "Stress-Test Gauntlet",
    icon: Swords,
    section: "Interact",
  },
  {
    href: "/modules/bunny-case/session-history",
    label: "Session History",
    icon: ScrollText,
    section: "Interact",
  },
  {
    href: "/modules/bunny-case/analytics",
    label: "Sentiment Analytics",
    icon: LineChart,
    section: "Optimize",
  },
  {
    href: "/modules/bunny-case/playbook",
    label: "Playbook Library",
    icon: Library,
    section: "Optimize",
  },
  {
    href: "/modules/bunny-case/settings",
    label: "Settings",
    icon: Settings,
    section: "Settings",
  },
];

export interface BCProfile {
  initials: string;
  name: string;
  subtitle: string;
}

export interface BCDocumentShellConfig {
  /** App title shown in the header. */
  title: string;
  /** Sidebar brand name. */
  brand: string;
  /** Theme overrides — deep-merged with DEFAULT_BC_THEME. */
  theme?: Partial<BCDocumentShellTheme>;
  /** Navigation items (display order). */
  navItems: BCNavItem[];
  /** Optional user profile widget in the sidebar footer. */
  profile?: BCProfile;
  /** Optional logout href. */
  logoutHref?: string;
}

export const BC_SHELL_CONFIG: BCDocumentShellConfig = {
  title: "Bunny Case",
  brand: "Bunny Case",
  navItems: BC_SHELF_NAV_ITEMS,
  profile: {
    initials: "BC",
    name: "Bunny Case",
    subtitle: "Conversational AI Training",
  },
};
