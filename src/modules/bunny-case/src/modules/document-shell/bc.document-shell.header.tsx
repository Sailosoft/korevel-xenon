// bc.document-shell.header.tsx
//
// BCDocumentShellHeader — sticky top header with sidebar toggle, brand title
// and an optional logout link.

"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@heroui/react";
import { Menu, Rabbit, LogOut } from "lucide-react";
import type { BCDocumentShellTheme } from "./bc.document-shell.config";

export interface BCDocumentShellHeaderProps {
  theme: BCDocumentShellTheme;
  title: string;
  onToggleSidebar: () => void;
  logoutHref?: string;
}

export default function BCDocumentShellHeader({
  theme,
  title,
  onToggleSidebar,
  logoutHref,
}: BCDocumentShellHeaderProps) {
  return (
    <header className="glass-header h-16 flex items-center justify-between px-4 md:px-8 flex-shrink-0 z-10 sticky top-0">
      <div className="flex items-center space-x-4">
        <Button
          onPress={onToggleSidebar}
          className={`p-2 min-w-10 h-10 rounded-xl transition-colors ${theme.btnSecondary}`}
          aria-label="Toggle sidebar"
        >
          <Menu className="w-6 h-6" />
        </Button>
        <div className="flex items-center space-x-3">
          <div
            className={`w-10 h-10 bg-gradient-to-br ${theme.gradient} rounded-xl flex items-center justify-center shadow-lg ${theme.shadow}`}
          >
            <Rabbit color="white" />
          </div>
          <span
            className={`text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${theme.gradient}`}
          >
            {title}
          </span>
        </div>
      </div>

      {logoutHref && (
        <Link
          href={logoutHref}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${theme.btnSecondary}`}
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
          <span className="hidden sm:inline">Logout</span>
        </Link>
      )}
    </header>
  );
}
