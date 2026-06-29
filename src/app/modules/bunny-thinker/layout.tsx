"use client";

import React, { Suspense } from "react";
import {
  LayoutDashboard,
  Users,
  Brain,
  Lightbulb,
  GitBranch,
  MemoryStick,
  Link2,
  Workflow,
  Settings,
  Sparkles,
} from "lucide-react";
import BUIDocumentShell from "@/src/modules/bunny-ai/src/modules/document-shell/bui.document-shell";
import type { BUIDocumentShellConfig } from "@/src/modules/bunny-ai/src/modules/document-shell/bui.document-shell.config";
import { BKAISettingsProvider } from "@/src/modules/bunny-thinker/src/ai-settings/BKAISettings.Context";

// ── Shell Configuration ──────────────────────────────────────────────────

const THINKER_SHELL_CONFIG: BUIDocumentShellConfig = {
  title: "BunnyAI Thinker",
  brand: "Bunny Thinker",
  wizard: {
    label: "New Thought",
    href: "/modules/bunny-thinker/thoughts",
  },
  profile: {
    initials: "BT",
    name: "Bunny Thinker",
    subtitle: "Chain of Thought",
  },
  logoutHref: "/",
  navItems: [
    {
      href: "/modules/bunny-thinker",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      href: "/modules/bunny-thinker/think-studio",
      label: "Think Studio",
      icon: Sparkles,
    },
    {
      href: "/modules/bunny-thinker/thinkers",
      label: "Thinkers",
      icon: Users,
    },
    {
      href: "/modules/bunny-thinker/thought-patterns",
      label: "Patterns",
      icon: GitBranch,
    },
    {
      href: "/modules/bunny-thinker/thought-associations",
      label: "Associations",
      icon: Link2,
    },
    {
      href: "/modules/bunny-thinker/processes",
      label: "Processes",
      icon: Workflow,
      section: "Automation",
    },
    {
      href: "/modules/bunny-thinker/thoughts",
      label: "Thoughts",
      icon: Brain,
    },
    {
      href: "/modules/bunny-thinker/ideas",
      label: "Ideas",
      icon: Lightbulb,
    },
    {
      href: "/modules/bunny-thinker/memories",
      label: "Memories",
      icon: MemoryStick,
      section: "Data",
    },
    {
      href: "/modules/bunny-thinker/settings",
      label: "AI Settings",
      icon: Settings,
      section: "System",
    },
  ],
};

// ── Theme Override ──────────────────────────────────────────────────────

const THINKER_THEME = {
  textPrimary: "text-purple-600",
  gradient: "from-purple-600 to-violet-500",
  shadow: "shadow-purple-100",
  btnPrimary: "bg-purple-600 text-white hover:bg-purple-700 transition-colors",
  btnSecondary:
    "text-purple-600 bg-purple-50 hover:bg-purple-100 transition-colors",
  navActive: "text-purple-600 bg-purple-50/70 font-semibold",
  navHover:
    "text-slate-600 hover:bg-slate-50 hover:text-purple-600 transition-colors",
  avatarBg: "bg-purple-100",
  avatarText: "text-purple-600",
};

// ── Layout ───────────────────────────────────────────────────────────────

export default function BunnyThinkerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="h-screen bg-[#f8fafc] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <BKAISettingsProvider>
        <BUIDocumentShell
          config={{
            ...THINKER_SHELL_CONFIG,
            theme: THINKER_THEME,
          }}
        >
          {children}
        </BUIDocumentShell>
      </BKAISettingsProvider>
    </Suspense>
  );
}
