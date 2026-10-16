"use client";

// BDAppBuilderShell — VSCode-style layout wrapper for the app designer:
// slim title bar (menus + actions), body (sidebar + tabbed workspace), and a
// status bar. Presentational only — all behavior is driven by props.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, PanelLeft, type LucideIcon } from "lucide-react";
import { cn } from "@heroui/react";

export interface BDAppBuilderMenuItem {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
}

export interface BDAppBuilderMenu {
  label: string;
  items: BDAppBuilderMenuItem[];
}

export interface BDAppBuilderShellProps {
  icon?: LucideIcon;
  title: string;
  /** Menu labels in the title bar (File / Edit / View style dropdowns). */
  menus?: BDAppBuilderMenu[];
  /** Right-aligned title bar buttons (Save, Open as application, AI…). */
  actions?: ReactNode;
  /** Back arrow in the title bar (e.g. back to the app list). */
  onBack?: () => void;
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  /** Explorer sidebar slot (hidden when collapsed to a rail is handled by caller). */
  sidebar?: ReactNode;
  /** Row under the title bar: editor tabs + segmented mode toggle. */
  tabBar?: ReactNode;
  /** Slim bottom bar: resource count, save state, slug. */
  statusBar?: ReactNode;
  /** The active tab panel rendered in the workspace. */
  children?: ReactNode;
  /** Shell height; viewport-based by default so the chrome never scrolls. */
  heightClassName?: string;
}

export function BDAppBuilderShell({
  icon: Icon,
  title,
  menus,
  actions,
  onBack,
  sidebarCollapsed = false,
  onToggleSidebar,
  sidebar,
  tabBar,
  statusBar,
  children,
  heightClassName = "h-[calc(100vh-9rem)] min-h-[560px] md:h-[calc(100vh-10rem)]",
}: BDAppBuilderShellProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menusRef = useRef<HTMLDivElement>(null);

  // Close the open menu on outside click or Escape (VSCode menu behavior).
  useEffect(() => {
    if (openMenu === null) return;
    const onMouseDown = (e: MouseEvent) => {
      if (menusRef.current && !menusRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenu(null);
    };
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [openMenu]);

  return (
    <div
      className={cn(
        "flex w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm",
        heightClassName,
      )}
    >
      {/* Title bar */}
      <div className="flex h-10 shrink-0 items-center gap-1 border-b border-slate-200 px-2">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="rounded p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
        {Icon && (
          <span className="flex h-6 w-6 items-center justify-center rounded bg-[#e3f2fd] text-[#1976d2]">
            <Icon className="h-3.5 w-3.5" />
          </span>
        )}
        <span className="max-w-[180px] truncate text-xs font-semibold text-slate-700">
          {title}
        </span>

        {/* Menus */}
        <div ref={menusRef} className="relative ml-2 flex items-center gap-0.5">
          {menus?.map((menu) => (
            <div key={menu.label} className="relative">
              <button
                type="button"
                onClick={() =>
                  setOpenMenu(openMenu === menu.label ? null : menu.label)
                }
                className={cn(
                  "rounded px-2 py-1 text-xs text-slate-600 transition-colors hover:bg-slate-100",
                  openMenu === menu.label && "bg-slate-100",
                )}
              >
                {menu.label}
              </button>
              {openMenu === menu.label && (
                <div className="absolute left-0 top-full z-40 mt-1 min-w-56 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                  {menu.items.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      disabled={item.disabled}
                      onClick={() => {
                        setOpenMenu(null);
                        item.onClick();
                      }}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-40"
                    >
                      {item.icon && <item.icon className="h-3.5 w-3.5" />}
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              aria-label="Toggle sidebar"
              title="Toggle sidebar"
              className={cn(
                "rounded p-1.5 transition-colors hover:bg-slate-100",
                sidebarCollapsed
                  ? "text-[#1976d2]"
                  : "text-slate-500 hover:text-slate-700",
              )}
            >
              <PanelLeft className="h-3.5 w-3.5" />
            </button>
          )}
          {actions}
        </div>
      </div>

      {/* Body: sidebar + workspace */}
      <div className="flex min-h-0 flex-1">
        {sidebar}
        <div className="flex min-w-0 flex-1 flex-col">
          {tabBar}
          <div className="bd-scroll min-h-0 flex-1 overflow-y-auto">
            {children}
          </div>
        </div>
      </div>

      {/* Status bar */}
      {statusBar && (
        <div className="flex h-6 shrink-0 items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-3 text-[11px] text-slate-500">
          {statusBar}
        </div>
      )}
    </div>
  );
}

export default BDAppBuilderShell;
