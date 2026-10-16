"use client";

// BDAppBuilderSidebar — VSCode-style explorer sidebar for the app designer:
// a Resources section (click to open the resource tab, hover for edit/delete)
// and an App section (Overview / Settings). Collapses to a narrow icon rail.

import { useState, type ReactNode } from "react";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  LayoutGrid,
  PanelLeft,
  Plus,
  Settings,
  Trash2,
} from "lucide-react";
import { cn } from "@heroui/react";
import type { BDAppResource } from "../../BDDomain.Types";
import { collectAppFields } from "./BDApp.Types";

export interface BDAppBuilderSidebarProps {
  resources: BDAppResource[];
  /** Slug of the active resource tab (or "overview" / new-resource id). */
  activeTab: string | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onSelectResource: (slug: string) => void;
  onNewResource: () => void;
  onDeleteResource: (index: number) => void;
  onOpenOverview: () => void;
  onOpenSettings: () => void;
}

function ExplorerSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="px-2 py-1">
      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 transition-colors hover:text-slate-700"
        >
          {open ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
          {title}
        </button>
        {action}
      </div>
      {open && <div className="flex flex-col gap-0.5">{children}</div>}
    </div>
  );
}

export function BDAppBuilderSidebar({
  resources,
  activeTab,
  collapsed,
  onToggleCollapse,
  onSelectResource,
  onNewResource,
  onDeleteResource,
  onOpenOverview,
  onOpenSettings,
}: BDAppBuilderSidebarProps) {
  if (collapsed) {
    return (
      <div className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-slate-200 bg-slate-50 py-2">
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label="Expand sidebar"
          title="Expand sidebar"
          className="rounded p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
        <div className="my-1 h-px w-6 bg-slate-200" />
        <button
          type="button"
          onClick={onOpenOverview}
          aria-label="Overview"
          title="Overview"
          className="rounded p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
        >
          <FileText className="h-4 w-4" />
        </button>
        {resources.map((resource, index) => (
          <button
            key={resource.slug || index}
            type="button"
            onClick={() => onSelectResource(resource.slug)}
            aria-label={resource.label ?? resource.name}
            title={resource.label ?? resource.name}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded text-[11px] font-semibold uppercase",
              activeTab === resource.slug
                ? "bg-[#e3f2fd] text-[#1565c0]"
                : "text-slate-500 hover:bg-slate-200 hover:text-slate-700",
            )}
          >
            {(resource.label ?? resource.name ?? "?").slice(0, 2)}
          </button>
        ))}
        <button
          type="button"
          onClick={onNewResource}
          aria-label="New resource"
          title="New resource"
          className="rounded p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Settings"
          title="Settings"
          className="mt-auto rounded p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-slate-50">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Explorer
        </span>
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label="Collapse sidebar"
          title="Collapse sidebar"
          className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
        >
          <PanelLeft className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="bd-scroll min-h-0 flex-1 overflow-y-auto">
        <ExplorerSection
          title="Resources"
          action={
            <button
              type="button"
              onClick={onNewResource}
              aria-label="New resource"
              title="New resource"
              className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          }
        >
          {resources.length === 0 ? (
            <p className="px-2 py-1 text-[11px] text-slate-400">
              No resources yet.
            </p>
          ) : (
            resources.map((resource, index) => {
              const label = resource.label ?? resource.name;
              const fieldCount = collectAppFields(
                resource.form?.components,
              ).length;
              return (
                <div
                  key={resource.slug || index}
                  className={cn(
                    "group flex items-center gap-1.5 rounded px-2 py-1 transition-colors",
                    activeTab === resource.slug
                      ? "bg-[#e3f2fd] text-[#1565c0]"
                      : "text-slate-600 hover:bg-slate-200/70",
                  )}
                >
                  <LayoutGrid className="h-3.5 w-3.5 shrink-0" />
                  <button
                    type="button"
                    onClick={() => onSelectResource(resource.slug)}
                    className="min-w-0 flex-1 text-left"
                    title={`${label} · ${fieldCount} fields`}
                  >
                    <span className="block truncate text-xs">{label}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteResource(index)}
                    aria-label={`Delete ${label}`}
                    title="Delete resource"
                    className="hidden shrink-0 rounded p-0.5 text-slate-400 hover:bg-red-50 hover:text-red-500 group-hover:block"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              );
            })
          )}
          <button
            type="button"
            onClick={onNewResource}
            className="flex items-center gap-1.5 rounded px-2 py-1 text-left text-xs text-slate-500 transition-colors hover:bg-slate-200/70 hover:text-slate-700"
          >
            <Plus className="h-3.5 w-3.5" />
            New resource
          </button>
        </ExplorerSection>

        <ExplorerSection title="App">
          <button
            type="button"
            onClick={onOpenOverview}
            className={cn(
              "flex items-center gap-1.5 rounded px-2 py-1 text-left text-xs transition-colors",
              activeTab === "overview"
                ? "bg-[#e3f2fd] text-[#1565c0]"
                : "text-slate-600 hover:bg-slate-200/70",
            )}
          >
            <FileText className="h-3.5 w-3.5" />
            Overview
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 rounded px-2 py-1 text-left text-xs text-slate-600 transition-colors hover:bg-slate-200/70"
          >
            <Settings className="h-3.5 w-3.5" />
            Settings
          </button>
        </ExplorerSection>
      </div>
    </div>
  );
}

export default BDAppBuilderSidebar;
