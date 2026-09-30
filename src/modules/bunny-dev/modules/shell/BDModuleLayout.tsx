"use client";

// BDModuleLayout — the deep "module" layout shell.
//
// Used by the sub-entity routes (`/projects/[projectId]/{feature}/{id}`) for
// Schema, App Builder, and Architecture. Gives each feature a focused,
// standalone-app feel while keeping the Bunny Developer branding: sidebar
// brand "Bunny Dev" and header title "Bunny Developer".

import type { ReactNode } from "react";
import BDShell from "./BDShell";
import type { BDShellConfig } from "./BDShell.config";
import { useBDProject } from "../core/BDProject.Hooks";
import {
  BD_PROJECT_MODULES,
  buildProjectNavItems,
} from "../core/BDProject.Module";

export type BDModuleFeature = "schema" | "app" | "architecture" | "api";

export interface BDModuleLayoutProps {
  projectId: string;
  feature: BDModuleFeature;
  children: ReactNode;
}

export function BDModuleLayout({
  projectId,
  feature,
  children,
}: BDModuleLayoutProps) {
  const project = useBDProject(projectId);
  const moduleDef = BD_PROJECT_MODULES.find((m) => m.path === `/${feature}`);
  const label = moduleDef?.label ?? feature;
  const rootHref = `/modules/bunny-dev/projects/${projectId}${
    moduleDef?.path ?? `/${feature}`
  }`;

  const config: BDShellConfig = {
    title: "Bunny Developer",
    brand: "Bunny Dev",
    logoutHref: "/modules/bunny-dev",
    profile: {
      initials: "BD",
      name: project?.name ?? "Project",
      subtitle: "Local-first workspace",
    },
    wizard: { label: `Back to ${label}`, href: rootHref },
    navItems: buildProjectNavItems(projectId),
  };

  return <BDShell config={config}>{children}</BDShell>;
}

export default BDModuleLayout;
