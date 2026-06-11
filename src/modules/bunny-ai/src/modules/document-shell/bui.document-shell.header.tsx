// bui.document-shell.header.tsx
//
// Sticky top header with sidebar toggle button and brand title.

"use client";

import React from "react";
import { Button } from "@heroui/react";
import { Menu, Rabbit } from "lucide-react";
import type { BUIDocumentShellTheme } from "./bui.document-shell.config";

// ── Props ──────────────────────────────────────────────────────────────────────

export interface BUIHeaderProps {
  theme: BUIDocumentShellTheme;
  title: string;
  onToggleSidebar: () => void;
}

// ── Component ───────────────────────────────────────────────────────────────────

export default function BUIHeader({
  theme,
  title,
  onToggleSidebar,
}: BUIHeaderProps) {
  return (
    <header className="glass-header h-16 flex items-center justify-between px-4 md:px-8 flex-shrink-0 z-10 sticky top-0">
      <div className="flex items-center space-x-4">
        <Button
          onPress={onToggleSidebar}
          className={`p-2 min-w-10 h-10 rounded-xl transition-colors ${theme.btnSecondary}`}
        >
          <Menu className="w-6 h-6" />
        </Button>
        <div className="p-6 flex items-center space-x-3">
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
    </header>
  );
}
