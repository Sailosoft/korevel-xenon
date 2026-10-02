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
    <header className="bd-glass-header sticky top-0 z-10 flex h-16 flex-shrink-0 items-center justify-between px-4 md:px-8">
      <div className="flex items-center space-x-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className={cn(
            "rounded-xl p-2 transition-colors",
            theme.btnSecondary,
          )}
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center space-x-3">
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br shadow",
              theme.gradient,
              theme.shadow,
            )}
          >
            <Rabbit className="h-5 w-5 text-white" />
          </div>
          <span
            className={cn(
              "bg-gradient-to-r bg-clip-text text-lg font-bold text-transparent",
              theme.gradient,
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
            theme.btnSecondary,
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
