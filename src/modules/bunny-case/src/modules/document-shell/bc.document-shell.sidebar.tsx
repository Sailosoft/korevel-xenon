// bc.document-shell.sidebar.tsx
//
// BCDocumentShellSidebar — grouped navigation (by section) with a brand header
// and an optional profile footer. Follows the Bunny Studio shell pattern.

"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, Rabbit } from "lucide-react";
import { Button } from "@heroui/react";
import {
  type BCDocumentShellTheme,
  type BCNavItem,
  type BCProfile,
} from "./bc.document-shell.config";

export interface BCDocumentShellSidebarProps {
  theme: BCDocumentShellTheme;
  brand: string;
  navItems: BCNavItem[];
  isOpen: boolean;
  onClose: () => void;
  profile?: BCProfile;
}

interface NavSection {
  label: string | null;
  items: BCNavItem[];
}

function groupBySection(items: BCNavItem[]): NavSection[] {
  const map = new Map<string | null, BCNavItem[]>();
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

export default function BCDocumentShellSidebar({
  theme,
  brand,
  navItems,
  isOpen,
  onClose,
  profile,
}: BCDocumentShellSidebarProps) {
  const pathname = usePathname();
  const sections = groupBySection(navItems);

  return (
    <aside
      id="bc-sidebar"
      className={`fixed inset-y-0 left-0 z-30 ${theme.bgSidebar} ${theme.border} flex flex-col sidebar-transition md:relative overflow-hidden ${
        isOpen
          ? "translate-x-0 w-72 opacity-100 border-r"
          : "-translate-x-full w-72 md:w-0 md:opacity-0 md:border-none"
      }`}
    >
      <div className="w-72 flex flex-col h-full flex-shrink-0">
        {/* ── Brand Header ─────────────────────────────────────── */}
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div
              className={`w-10 h-10 bg-gradient-to-br ${theme.gradient} rounded-xl flex items-center justify-center shadow-lg ${theme.shadow}`}
            >
              <Rabbit className="w-6 h-6 text-white" />
            </div>
            <span
              className={`text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${theme.gradient}`}
            >
              {brand}
            </span>
          </div>
          <Button
            variant="danger"
            onPress={onClose}
            className="p-2 min-w-8 h-8 md:hidden text-pink-400"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* ── Navigation ────────────────────────────────────────── */}
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {sections.map(
            (section, idx) =>
              section.items.length > 0 && (
                <React.Fragment key={section.label ?? `section-${idx}`}>
                  {section.label && (
                    <div
                      className={`text-xs font-semibold uppercase tracking-wider px-4 mb-2 ${
                        idx > 0 ? "mt-8" : ""
                      } ${theme.textMuted}`}
                    >
                      {section.label}
                    </div>
                  )}

                  {section.items.map((item) => {
                    const hasChildItems = navItems.some(
                      (other) =>
                        other !== item && other.href.startsWith(item.href + "/"),
                    );
                    const segments = item.href
                      .split("/")
                      .filter(Boolean).length;
                    const isActive = hasChildItems
                      ? pathname === item.href
                      : pathname === item.href ||
                        (segments >= 3 && pathname.startsWith(item.href + "/"));

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className={`
                          flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-colors group
                          ${
                            isActive
                              ? theme.navActive
                              : item.variant === "danger"
                                ? `${theme.textPrimary} hover:bg-red-50`
                                : theme.navHover
                          }`}
                      >
                        <item.icon className="w-5 h-5" />
                        <span className="font-medium">{item.label}</span>
                      </Link>
                    );
                  })}
                </React.Fragment>
              ),
          )}
        </nav>

        {/* ── Profile Footer ────────────────────────────────────── */}
        {profile && (
          <div className={`p-4 border-t ${theme.border}`}>
            <div className="bg-gray-50 rounded-2xl p-3 flex items-center space-x-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${theme.avatarBg} ${theme.avatarText}`}
              >
                {profile.initials}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {profile.name}
                </p>
                <p className="text-xs text-gray-500 truncate">
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
