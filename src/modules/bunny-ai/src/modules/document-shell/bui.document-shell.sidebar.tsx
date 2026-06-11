// bui.document-shell.sidebar.tsx
//
// Sidebar component — uses `useState` for mobile open/close (no query params).
// Renders brand header, grouped navigation links, and an optional profile footer.

"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, LucideIcon, LucideRabbit } from "lucide-react";
import { Button } from "@heroui/react";
import {
  type BUIDocumentShellTheme,
  type BUINavItem,
  type BUIProfile,
} from "./bui.document-shell.config";

// ── Props ──────────────────────────────────────────────────────────────────────

export interface BUISidebarProps {
  theme: BUIDocumentShellTheme;
  brand: string;
  navItems: BUINavItem[];
  isOpen: boolean;
  onClose: () => void;
  profile?: BUIProfile;
}

// ── Component ───────────────────────────────────────────────────────────────────

export default function BUISidebar({
  theme,
  brand,
  navItems,
  isOpen,
  onClose,
  profile,
}: BUISidebarProps) {
  const pathname = usePathname();

  // Group nav items by section
  const sections = groupBySection(navItems);

  return (
    <aside
      id="bui-sidebar"
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
            <LucideRabbit className={`w-10 h-10 ${theme.textPrimary}`} />
            <span
              className={`text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${theme.gradient}`}
            >
              {brand}
            </span>
          </div>
          <Button
            variant="danger"
            onPress={onClose}
            className={`p-2 min-w-8 h-8 md:hidden text-pink-400 hover:${theme.textPrimary}`}
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
                  {/* Section header label */}
                  {section.label && (
                    <div
                      className={`text-xs font-semibold uppercase tracking-wider px-4 mb-2 ${
                        idx > 0 ? "mt-8" : ""
                      } ${theme.textMuted}`}
                    >
                      {section.label}
                    </div>
                  )}

                  {/* Nav links */}
                  {section.items.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      (item.href !== "/modules/bunny-ai" &&
                        pathname.startsWith(item.href));
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-colors group ${
                          isActive ? theme.navActive : theme.navHover
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

// ── Helpers ─────────────────────────────────────────────────────────────────────

interface NavSection {
  label: string | null;
  items: BUINavItem[];
}

/**
 * Groups nav items by their `section` property.
 * Items without a section are placed under `{ label: null, items: [...] }`.
 */
function groupBySection(items: BUINavItem[]): NavSection[] {
  const map = new Map<string | null, BUINavItem[]>();

  for (const item of items) {
    const key = item.section ?? "__root__";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }

  // Flatten in order: un-sectioned items first, then alphabetical by section label
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
