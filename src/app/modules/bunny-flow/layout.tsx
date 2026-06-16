"use client";

import { Suspense } from "react";
import {
  LayoutDashboard,
  GitBranch,
  Workflow,
  Container,
  Users,
  Play,
  FileBarChart,
  Settings,
} from "lucide-react";
import BUIDocumentShell from "@/src/modules/bunny-ai/src/modules/document-shell/bui.document-shell";
import type { BUIDocumentShellConfig } from "@/src/modules/bunny-ai/src/modules/document-shell/bui.document-shell.config";

// ── Shell Configuration ───────────────────────────────────────────

const BFLOW_SHELL_CONFIG: BUIDocumentShellConfig = {
  title: "Bunny Flow - Pipeline Manager",
  brand: "BFlow",
  profile: {
    initials: "BF",
    name: "Flow Manager",
    subtitle: "Enterprise Tier",
  },
  navItems: [
    {
      href: "/modules/bunny-flow",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      href: "/modules/bunny-flow/definitions",
      label: "Definitions",
      icon: GitBranch,
    },
    {
      href: "/modules/bunny-flow/workflows",
      label: "Workflows",
      icon: Workflow,
    },
    {
      href: "/modules/bunny-flow/pipelines",
      label: "Pipelines",
      icon: Container,
    },
    {
      href: "/modules/bunny-flow/agent-pools",
      label: "Agent Pools",
      icon: Users,
    },
    {
      href: "/modules/bunny-flow/runs",
      label: "Runs",
      icon: Play,
    },
    {
      href: "/modules/bunny-flow/reports",
      label: "Reports",
      icon: FileBarChart,
    },
    {
      href: "/modules/bunny-flow/settings",
      label: "Settings",
      icon: Settings,
      section: "Settings",
    },
  ],
};

// ── Layout ────────────────────────────────────────────────────────

export default function BFlowLayout({
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
      <BUIDocumentShell config={BFLOW_SHELL_CONFIG}>
        {children}
      </BUIDocumentShell>
    </Suspense>
  );
}
