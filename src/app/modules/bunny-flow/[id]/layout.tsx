"use client";

import { Suspense, use } from "react";
import {
  LayoutDashboard,
  Workflow,
  Container,
  Users,
  Play,
  FileBarChart,
  Settings,
} from "lucide-react";
import BUIDocumentShell from "@/src/modules/bunny-ai/src/modules/document-shell/bui.document-shell";
import type { BUIDocumentShellConfig } from "@/src/modules/bunny-ai/src/modules/document-shell/bui.document-shell.config";
import { BFlowFlowProvider } from "@/src/modules/bunny-flow/src/context/BFlowFlowContext";

// ── Props ──────────────────────────────────────────────────────────────────────

interface BFlowInnerLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

// ── Layout ─────────────────────────────────────────────────────────────────────

export default function BFlowInnerLayout({
  children,
  params,
}: BFlowInnerLayoutProps) {
  const { id } = use(params);

  // Build the inner shell config — definitionId is baked into every href
  const innerConfig: BUIDocumentShellConfig = {
    title: "Flow Details",
    brand: "BFlow",
    profile: {
      initials: "BF",
      name: "Flow Manager",
      subtitle: "Enterprise Tier",
    },
    navItems: [
      {
        href: `/modules/bunny-flow/${id}`,
        label: "Dashboard",
        icon: LayoutDashboard,
      },
      {
        href: `/modules/bunny-flow/${id}/workflows`,
        label: "Workflows",
        icon: Workflow,
      },
      {
        href: `/modules/bunny-flow/${id}/pipelines`,
        label: "Pipelines",
        icon: Container,
      },
      {
        href: `/modules/bunny-flow/${id}/agent-pools`,
        label: "Agent Pools",
        icon: Users,
      },
      {
        href: `/modules/bunny-flow/${id}/runs`,
        label: "Runs",
        icon: Play,
      },
      {
        href: `/modules/bunny-flow/${id}/reports`,
        label: "Reports",
        icon: FileBarChart,
      },
      {
        href: `/modules/bunny-flow/${id}/settings`,
        label: "Settings",
        icon: Settings,
        section: "Settings",
      },
    ],
  };

  return (
    <Suspense
      fallback={
        <div className="h-screen bg-[#f8fafc] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#ff2d20] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <BFlowFlowProvider flowId={id}>
        <BUIDocumentShell config={innerConfig}>{children}</BUIDocumentShell>
      </BFlowFlowProvider>
    </Suspense>
  );
}
