"use client";

// BDShell.header.tsx — sticky header with sidebar toggle, title, and logout.

import Link from "next/link";
import { Menu, Rabbit, LogOut } from "lucide-react";
import { cn } from "@heroui/react";
import type { BDShellTheme } from "./BDShell.config";

export interface BDShellHeaderProps {
  theme: BDShellTheme;
  title: string;
  onToggleSidebar: () => void;
  logoutHref?: string;
}

export function BDShellHeader({
  theme,
  title,
  onToggleSidebar,
  logoutHref,
}: BDShellHeaderProps) {
  return (
    <header
      className={cn(
        theme.headerSurface,
        "sticky top-0 z-10 flex h-16 flex-shrink-0 items-center justify-between px-4 md:px-8",
      )}
    >
      <div className="flex items-center space-x-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className={cn(
            "rounded-xl p-2 transition-colors",
            theme.headerBtn,
          )}
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center space-x-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 shadow-inner ring-1 ring-white/25 backdrop-blur-sm">
            <Rabbit className="h-5 w-5 text-white" />
          </div>
          <span
            className={cn(
              "text-lg font-bold tracking-wide",
              theme.headerText,
            )}
          >
            {title}
          </span>
        </div>
      </div>

      {logoutHref && (
        <Link
          href={logoutHref}
          className={cn(
            "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
            theme.headerBtn,
          )}
          title="Back to catalog"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Exit</span>
        </Link>
      )}
    </header>
  );
}

export default BDShellHeader;
