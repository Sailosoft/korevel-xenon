"use client";

// BDShell.sidebar.tsx — grouped navigation sidebar with active highlighting.

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, Plus, Rabbit } from "lucide-react";
import { cn } from "@heroui/react";
import type {
  BDNavItem,
  BDShellProfile,
  BDShellTheme,
  BDShellWizard,
} from "./BDShell.config";

export interface BDShellSidebarProps {
  theme: BDShellTheme;
  brand: string;
  navItems: BDNavItem[];
  isOpen: boolean;
  onClose: () => void;
  profile?: BDShellProfile;
  wizard?: BDShellWizard;
}

interface NavSection {
  label: string | null;
  items: BDNavItem[];
}

function groupBySection(items: BDNavItem[]): NavSection[] {
  const map = new Map<string | null, BDNavItem[]>();
  for (const item of items) {
    const key = item.section ?? "__root__";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  const result: NavSection[] = [];
  if (map.has("__root__")) {
    result.push({ label: null, items: map.get("__root__")! });
    map.delete("__root__");
  }
  for (const [label, groupItems] of map) {
    result.push({ label, items: groupItems });
  }
  return result;
}

export function BDShellSidebar({
  theme,
  brand,
  navItems,
  isOpen,
  onClose,
  profile,
  wizard,
}: BDShellSidebarProps) {
  const pathname = usePathname();
  const sections = groupBySection(navItems);

  return (
    <aside
      className={cn(
        "bd-sidebar-transition fixed inset-y-0 left-0 z-30 flex flex-col overflow-hidden md:relative",
        theme.bgSidebar,
        isOpen
          ? "w-72 translate-x-0 border-r opacity-100"
          : "w-72 -translate-x-full md:w-0 md:border-none md:opacity-0",
        theme.border,
      )}
    >
      <div className="flex h-full w-72 flex-shrink-0 flex-col">
        {/* Brand */}
        <div className="flex items-center justify-between p-5">
          <div className="flex items-center space-x-3">
            <Rabbit className={cn("h-9 w-9", theme.textPrimary)} />
            <span
              className={cn(
                "bg-gradient-to-r bg-clip-text text-lg font-bold text-transparent",
                theme.gradient,
              )}
            >
              {brand}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-blue-100 hover:bg-white/10 hover:text-white md:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="bd-scroll flex-1 space-y-1 overflow-y-auto px-4 py-3">
          {wizard && (
            <Link
              href={wizard.href}
              onClick={onClose}
              className={cn(
                "mb-5 flex w-full items-center space-x-3 rounded-2xl px-4 py-3 shadow-md",
                theme.btnPrimary,
                theme.shadow,
              )}
            >
              <Plus className="h-4 w-4" />
              <span className="font-medium">{wizard.label}</span>
            </Link>
          )}

          {sections.map(
            (section, idx) =>
              section.items.length > 0 && (
                <React.Fragment key={section.label ?? `section-${idx}`}>
                  {section.label && (
                    <div
                      className={cn(
                        "mb-2 px-4 text-xs font-semibold uppercase tracking-wider",
                        idx > 0 && "mt-6",
                        theme.textMuted,
                      )}
                    >
                      {section.label}
                    </div>
                  )}

                  {section.items.map((item) => {
                    const hasChildItems = navItems.some(
                      (other) =>
                        other !== item &&
                        other.href.startsWith(item.href + "/"),
                    );
                    const segments = item.href
                      .split("/")
                      .filter(Boolean).length;
                    const isActive = hasChildItems
                      ? pathname === item.href
                      : pathname === item.href ||
                        (segments >= 3 &&
                          pathname.startsWith(item.href + "/"));

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          "group flex items-center space-x-3 rounded-xl px-4 py-2.5 transition-colors",
                          isActive
                            ? theme.navActive
                            : item.variant === "danger"
                              ? "text-blue-100 hover:bg-red-500/20 hover:text-red-200"
                              : theme.navHover,
                        )}
                      >
                        <item.icon className="h-5 w-5" />
                        <span className="flex-1 font-medium">{item.label}</span>
                        {item.badge !== undefined && (
                          <span className="rounded-full bg-white/15 px-1.5 text-xs text-blue-50">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </React.Fragment>
              ),
          )}
        </nav>

        {/* Profile */}
        {profile && (
          <div className={cn("border-t p-4", theme.border)}>
            <div className="flex items-center space-x-3 rounded-2xl bg-white/10 p-3">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl font-bold",
                  theme.avatarBg,
                  theme.avatarText,
                )}
              >
                {profile.initials}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-semibold text-white">
                  {profile.name}
                </p>
                <p className="truncate text-xs text-blue-100/80">
                  {profile.subtitle}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

export default BDShellSidebar;
