"use client";

// BunnyDev project workspace layout.
//
// Owns the project-scoped BDShell: project id is baked into every nav href, and
// BDProjectProvider supplies the active project to all child pages. Uses React
// 19's `use(params)` to unwrap the async route params.

import { Suspense, use } from "react";
import BDShell from "@/src/modules/bunny-dev/modules/shell/BDShell";
import type { BDShellConfig } from "@/src/modules/bunny-dev/modules/shell/BDShell.config";
import { buildProjectNavItems } from "@/src/modules/bunny-dev/modules/core/BDProject.Module";
import { BDProjectProvider } from "@/src/modules/bunny-dev/modules/core/BDProject.Context";
import { useBDProject } from "@/src/modules/bunny-dev/modules/core/BDProject.Hooks";

interface BDProjectLayoutProps {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}

/** Inner shell — reads the live project so the header reflects its name. */
function BDProjectShell({
  projectId,
  children,
}: {
  projectId: string;
  children: React.ReactNode;
}) {
  const project = useBDProject(projectId);

  const config: BDShellConfig = {
    title: "Bunny Developer - Workspace",
    brand: "Bunny Dev",
    logoutHref: "/modules/bunny-dev",
    profile: {
      initials: "BD",
      name: project?.name ?? "Project",
      subtitle: "Local-first workspace",
    },
    wizard: {
      label: "Back to projects",
      href: "/modules/bunny-dev",
    },
    navItems: buildProjectNavItems(projectId),
  };

  return <BDShell config={config}>{children}</BDShell>;
}

export default function BDProjectLayout({
  children,
  params,
}: BDProjectLayoutProps) {
  const { projectId } = use(params);

  return (
    <Suspense fallback={null}>
      <BDProjectProvider projectId={projectId}>
        <BDProjectShell projectId={projectId}>{children}</BDProjectShell>
      </BDProjectProvider>
    </Suspense>
  );
}
