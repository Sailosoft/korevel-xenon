"use client";

import "./layout.css";
import { Suspense } from "react";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Zap,
  FileText,
  Settings,
} from "lucide-react";
import BUIDocumentShell from "@/src/modules/bunny-ai/src/modules/document-shell/bui.document-shell";
import type { BUIDocumentShellConfig } from "@/src/modules/bunny-ai/src/modules/document-shell/bui.document-shell.config";

// ── Shell Configuration ─────────────────────────────────────────────────────────

const BUNNY_AI_SHELL_CONFIG: BUIDocumentShellConfig = {
  title: "Bunny AI - Book Builder",
  brand: "Bunny AI",
  wizard: {
    label: "Open Wizard",
    href: "/modules/bunny-ai/wizard",
  },
  profile: {
    initials: "BA",
    name: "Bunny Author",
    subtitle: "Premium Tier",
  },
  logoutHref: "/",
  navItems: [
    {
      href: "/modules/bunny-ai",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      href: "/modules/bunny-ai/authors",
      label: "Authors",
      icon: Users,
    },
    {
      href: "/modules/bunny-ai/books",
      label: "Books",
      icon: BookOpen,
    },
    {
      href: "/modules/bunny-ai/author-skills",
      label: "Skills",
      icon: Zap,
    },
    {
      href: "/modules/bunny-ai/prompt-viewer",
      label: "Prompts",
      icon: FileText,
    },
    {
      href: "/modules/bunny-ai/settings",
      label: "Preferences",
      icon: Settings,
      section: "Settings",
    },
  ],
};

// ── Layout ──────────────────────────────────────────────────────────────────────

export default function BunnyAILayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="h-screen bg-[#f8fafc] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#ff2d20] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <BUIDocumentShell config={BUNNY_AI_SHELL_CONFIG}>
        {children}
      </BUIDocumentShell>
    </Suspense>
  );
}
