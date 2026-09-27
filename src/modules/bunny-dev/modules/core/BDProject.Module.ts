// BDProject.Module.ts — the project workspace module registry.
//
// Declares every project-scoped sub-module (label, relative path, icon) and
// builds the BDShell nav items for the inner project layout. Adding a
// sub-module is a single entry here plus its route page.

import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Database,
  AppWindow,
  Webhook,
  ListTree,
  Workflow,
  FolderTree,
  Building2,
  KanbanSquare,
  Bot,
  Settings,
} from "lucide-react";
import type { BDNavItem } from "../shell/BDShell.config";

export interface BDProjectModuleDef {
  key: string;
  label: string;
  /** Path relative to `/modules/bunny-dev/projects/{projectId}`. */
  path: string;
  icon: LucideIcon;
  description: string;
  section?: string;
}

export const BD_PROJECT_MODULES: BDProjectModuleDef[] = [
  {
    key: "overview",
    label: "Overview",
    path: "",
    icon: LayoutDashboard,
    description: "Project dashboard and quick stats.",
  },
  {
    key: "schema",
    label: "Schema",
    path: "/schema",
    icon: Database,
    description: "Design database schemas, groups, and relationships.",
  },
  {
    key: "app",
    label: "App Builder",
    path: "/app",
    icon: AppWindow,
    description: "Compose Filament-style resources and render CRUD apps.",
  },
  {
    key: "api",
    label: "API Design",
    path: "/api",
    icon: Webhook,
    description: "Document and mock API operations.",
  },
  {
    key: "outline",
    label: "Outline",
    path: "/outline",
    icon: ListTree,
    description: "Author knowledge bases, guides, and documentation.",
  },
  {
    key: "diagram",
    label: "Diagram",
    path: "/diagram",
    icon: Workflow,
    description: "Build and render Mermaid diagrams.",
  },
  {
    key: "files",
    label: "Files",
    path: "/files",
    icon: FolderTree,
    description: "Virtual project file system with an inline editor.",
  },
  {
    key: "architecture",
    label: "Architecture",
    path: "/architecture",
    icon: Building2,
    description: "Architecture docs, ADRs, plans, and variants.",
  },
  {
    key: "board",
    label: "Board",
    path: "/board",
    icon: KanbanSquare,
    description: "JIRA-style kanban project management.",
  },
  {
    key: "agents",
    label: "Agents",
    path: "/agents",
    icon: Bot,
    description: "Manage AI agents and one-shot batch generation.",
  },
  {
    key: "settings",
    label: "Settings",
    path: "/settings",
    icon: Settings,
    description: "Project AI and agent settings.",
    section: "Settings",
  },
];

/** Build the inner-shell nav items for a specific project. */
export function buildProjectNavItems(projectId: string): BDNavItem[] {
  return BD_PROJECT_MODULES.map((mod) => ({
    href: `/modules/bunny-dev/projects/${projectId}${mod.path}`,
    label: mod.label,
    icon: mod.icon,
    section: mod.section,
  }));
}
