"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { LayoutDashboard, GitBranch, Globe, Brain } from "lucide-react";
import BUIDocumentShell from "@/src/modules/bunny-ai/src/modules/document-shell/bui.document-shell";
import type { BUIDocumentShellConfig } from "@/src/modules/bunny-ai/src/modules/document-shell/bui.document-shell.config";
import { BFlowEditorSettingsProvider } from "@/src/modules/bunny-flow/src/settings/BFlowEditorSettings";

// ── Shell Configuration (outer) ────────────────────────────────────

const BFLOW_SHELL_CONFIG: BUIDocumentShellConfig = {
  title: "BunnyAI - Flow Manager",
  brand: "BunnyAI - Flow",
  logoutHref: "/",
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
      label: "Flows",
      icon: GitBranch,
    },
    {
      href: "/modules/bunny-flow/global-variables",
      label: "Global Variables",
      icon: Globe,
    },
    {
      href: "/modules/bunny-flow/ai-config",
      label: "AI Config",
      icon: Brain,
    },
  ],
};

// ── Layout ────────────────────────────────────────────────────────

export default function BFlowLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Detect if we're inside a flow-detail route (/modules/bunny-flow/flow/{id}/...)
  // In that case the INNER layout (in flow/[id]/layout.tsx) already provides its own
  // BUIDocumentShell — we must NOT render the outer shell here to avoid nesting.
  const isInnerRoute =
    /^\/modules\/bunny-flow\/flow\/[^/]+(\/|$)/.test(pathname) &&
    !pathname.startsWith("/modules/bunny-flow/definitions");

  // Wrap everything in the editor settings provider so the hook is available
  // throughout the bunny-flow module (including the workflow studio and settings page).
  const content = (
    <BFlowEditorSettingsProvider>{children}</BFlowEditorSettingsProvider>
  );

  // Inner routes get a bare wrapper — the [id]/layout.tsx provides its own shell.
  if (isInnerRoute) {
    return <Suspense fallback={null}>{content}</Suspense>;
  }

  // Outer routes (Dashboard, Definitions) get the document shell.
  return (
    <Suspense
      fallback={
        <div className="h-screen bg-[#f8fafc] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#ff2d20] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <BUIDocumentShell config={BFLOW_SHELL_CONFIG}>
        {content}
      </BUIDocumentShell>
    </Suspense>
  );
}
