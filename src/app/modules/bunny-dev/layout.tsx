"use client";

// BunnyDev outer layout.
//
// Renders the main BDShell (project list + global settings) for outer routes.
// Project workspace routes (`/projects/{id}/…`) are owned by the inner layout
// in `projects/[projectId]/layout.tsx`, so this layout returns a bare wrapper
// for them — mirroring the bunny-flow outer/inner-shell pattern to avoid
// double-shelling.

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { FolderKanban, Brain } from "lucide-react";
import "@/src/modules/bunny-dev/BDStyle.css";
import BDShell from "@/src/modules/bunny-dev/modules/shell/BDShell";
import type { BDShellConfig } from "@/src/modules/bunny-dev/modules/shell/BDShell.config";
import { BDAISettingsProvider } from "@/src/modules/bunny-dev/modules/ai-settings/BDAISettings.Context";
import { BDToastProvider } from "@/src/modules/bunny-dev/components/BDToast";

const OUTER_SHELL_CONFIG: BDShellConfig = {
  title: "Bunny Developer",
  brand: "Bunny Dev",
  logoutHref: "/",
  profile: {
    initials: "BD",
    name: "Developer",
    subtitle: "Local-first workspace",
  },
  navItems: [
    {
      href: "/modules/bunny-dev",
      label: "Projects",
      icon: FolderKanban,
    },
    {
      href: "/modules/bunny-dev/settings",
      label: "AI Settings",
      icon: Brain,
      section: "Settings",
    },
  ],
};

export default function BunnyDevLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isInnerRoute = /^\/modules\/bunny-dev\/projects\/[^/]+(\/|$)/.test(
    pathname,
  );

  const content = (
    <BDAISettingsProvider>
      <BDToastProvider>{children}</BDToastProvider>
    </BDAISettingsProvider>
  );

  if (isInnerRoute) {
    return <Suspense fallback={null}>{content}</Suspense>;
  }

  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-[#f4f7fb]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1976d2] border-t-transparent" />
        </div>
      }
    >
      <BDShell config={OUTER_SHELL_CONFIG}>{content}</BDShell>
    </Suspense>
  );
}
