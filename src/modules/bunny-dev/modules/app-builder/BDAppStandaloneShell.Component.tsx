"use client";

// BDAppStandaloneShell — SPA chrome for a generated app opened as a standalone
// application (/modules/bunny-dev/render/[appId]): fixed top header (brand +
// breadcrumb + actions), a responsive resource sidebar (collapsible to an icon
// rail on md+, an overlay drawer below md), and a single scrollable content
// pane. Presentational only — behavior and data come from props.

import { type CSSProperties, type ReactNode } from "react";
import {
  ChevronRight,
  LayoutGrid,
  Menu,
  PanelLeft,
  X,
} from "lucide-react";
import { cn } from "@heroui/react";

export interface BDAppStandaloneResourceItem {
  slug: string;
  label: string;
}

export interface BDAppStandaloneShellProps {
  brand: { name: string; logo?: string };
  /** Trail above the content, e.g. `[appName, resourceLabel]`. */
  breadcrumb: string[];
  resources: BDAppStandaloneResourceItem[];
  activeSlug?: string;
  onSelect: (slug: string) => void;
  sidebarCollapsed: boolean;
  onToggleCollapse: () => void;
  /** Overlay drawer state (below md only). */
  drawerOpen: boolean;
  onToggleDrawer: () => void;
  onCloseDrawer: () => void;
  /** Sidebar footer content (record count, path…). */
  stats?: ReactNode;
  /** Right-aligned header controls (e.g. the Designer button). */
  actions?: ReactNode;
  /** Theme CSS variables (`--bd-primary`, `--bd-color-*`). */
  style?: CSSProperties;
  theme?: string;
  children?: ReactNode;
}

function resourceInitials(label: string): string {
  return label.trim().slice(0, 2).toUpperCase() || "?";
}

export function BDAppStandaloneShell({
  brand,
  breadcrumb,
  resources,
  activeSlug,
  onSelect,
  sidebarCollapsed,
  onToggleCollapse,
  drawerOpen,
  onToggleDrawer,
  onCloseDrawer,
  stats,
  actions,
  style,
  theme,
  children,
}: BDAppStandaloneShellProps) {
  const select = (slug: string) => {
    onSelect(slug);
    onCloseDrawer();
  };

  const listItems = (dense: boolean) =>
    resources.map((resource) => {
      const active = resource.slug === activeSlug;
      if (dense) {
        return (
          <button
            key={resource.slug}
            type="button"
            onClick={() => select(resource.slug)}
            aria-label={resource.label}
            title={resource.label}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded text-[11px] font-semibold uppercase transition-colors",
              active
                ? "bg-[var(--bd-primary-soft)] text-[var(--bd-primary-strong)]"
                : "text-slate-500 hover:bg-white hover:text-slate-700",
            )}
          >
            {resourceInitials(resource.label)}
          </button>
        );
      }
      return (
        <button
          key={resource.slug}
          type="button"
          onClick={() => select(resource.slug)}
          title={resource.label}
          className={cn(
            "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors",
            active
              ? "bg-[var(--bd-primary-soft)] font-semibold text-[var(--bd-primary-strong)]"
              : "text-slate-700 hover:bg-white",
          )}
        >
          <LayoutGrid className="h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 flex-1 truncate">{resource.label}</span>
        </button>
      );
    });

  const emptyNote = (
    <p className="px-2.5 py-1 text-[11px] text-slate-400">
      No resources defined.
    </p>
  );

  const sidebarBody = (dense: boolean) => (
    <>
      {dense ? (
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label="Expand sidebar"
          title="Expand sidebar"
          className="rounded p-1.5 text-slate-500 transition-colors hover:bg-white hover:text-slate-700"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
      ) : (
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Resources
          </span>
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
            className="rounded p-1 text-slate-400 transition-colors hover:bg-white hover:text-slate-600"
          >
            <PanelLeft className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      <div
        className={cn(
          "bd-scroll flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto",
          dense ? "items-center py-1" : "px-2 pb-2",
        )}
        >
          {resources.length === 0 && !dense ? emptyNote : listItems(dense)}
        </div>
      {!dense && stats && (
        <div className="border-t border-slate-200 px-3 py-2 text-[11px] text-slate-500">
          {stats}
        </div>
      )}
    </>
  );

  return (
    <div
      className="flex h-full flex-col"
      style={style}
      data-bd-theme={theme}
    >
      {/* Header */}
      <header className="bd-app-header flex h-12 shrink-0 items-center gap-2 border-b border-white/15 px-3">
        <button
          type="button"
          onClick={onToggleDrawer}
          aria-label="Open navigation"
          title="Open navigation"
          className="rounded p-1.5 text-current opacity-80 transition-colors hover:bg-white/15 hover:opacity-100 md:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>

        {brand.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={brand.logo}
            alt=""
            className="h-7 w-7 shrink-0 rounded object-contain"
          />
        ) : (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-white/15 text-current">
            <LayoutGrid className="h-4 w-4" />
          </span>
        )}
        <span
          className="max-w-[160px] shrink-0 truncate text-sm font-semibold text-current"
          title={brand.name}
        >
          {brand.name}
        </span>

        <nav
          aria-label="Breadcrumb"
          className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden"
        >
          {breadcrumb.map((crumb, index) => (
            <span key={`${crumb}-${index}`} className="flex min-w-0 items-center gap-1">
              {index > 0 && (
                <ChevronRight className="h-3 w-3 shrink-0 text-current opacity-50" />
              )}
              <span
                className={cn(
                  "min-w-0 truncate text-xs",
                  index === breadcrumb.length - 1
                    ? "font-medium text-current"
                    : "hidden text-current opacity-70 sm:inline",
                )}
                title={crumb}
              >
                {crumb}
              </span>
            </span>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "hidden rounded p-1.5 transition-colors hover:bg-white/15 md:block",
              sidebarCollapsed
                ? "text-current"
                : "text-current opacity-70 hover:opacity-100",
            )}
          >
            <PanelLeft className="h-4 w-4" />
          </button>
          {actions}
        </div>
      </header>

      {/* Body: sidebar + content */}
      <div className="flex min-h-0 flex-1">
        {sidebarCollapsed ? (
          <aside className="hidden w-12 shrink-0 flex-col items-center gap-1 border-r border-slate-200 bg-slate-50 py-2 md:flex">
            {sidebarBody(true)}
          </aside>
        ) : (
          <aside className="hidden w-56 shrink-0 flex-col border-r border-slate-200 bg-slate-50 md:flex">
            {sidebarBody(false)}
          </aside>
        )}

        {/* Overlay drawer (below md) */}
        {drawerOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <button
              type="button"
              aria-label="Close navigation"
              onClick={onCloseDrawer}
              className="absolute inset-0 h-full w-full bg-slate-900/40"
            />
            <aside className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-slate-200 bg-slate-50 shadow-xl">
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Resources
                </span>
                <button
                  type="button"
                  onClick={onCloseDrawer}
                  aria-label="Close navigation"
                  title="Close navigation"
                  className="rounded p-1 text-slate-400 transition-colors hover:bg-white hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="bd-scroll flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-2">
                {resources.length === 0 ? emptyNote : listItems(false)}
              </div>
              {stats && (
                <div className="border-t border-slate-200 px-3 py-2 text-[11px] text-slate-500">
                  {stats}
                </div>
              )}
            </aside>
          </div>
        )}

        {/* Content pane */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="bd-scroll min-h-0 flex-1 overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export default BDAppStandaloneShell;
