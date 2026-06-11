// bui.document-shell.tsx
//
// BUIDocumentShell — a composable layout shell that wraps your Next.js pages.
//
// Usage:
//   <BUIDocumentShell config={myConfig}>
//     {children}
//   </BUIDocumentShell>
//
// State management:
//   - Sidebar open/close uses `useState` (no query-param dependency).

"use client";

import React, { useState, useCallback, useMemo } from "react";
import BUISidebar from "./bui.document-shell.sidebar";
import BUIHeader from "./bui.document-shell.header";
import {
  type BUIDocumentShellConfig,
  DEFAULT_BUI_THEME,
} from "./bui.document-shell.config";

// ── Props ──────────────────────────────────────────────────────────────────────

export interface BUIDocumentShellProps {
  config: BUIDocumentShellConfig;
  children: React.ReactNode;
}

// ── Component ───────────────────────────────────────────────────────────────────

export default function BUIDocumentShell({
  config,
  children,
}: BUIDocumentShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const theme = useMemo(
    () => ({ ...DEFAULT_BUI_THEME, ...config.theme }),
    [config.theme],
  );

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  return (
    <div
      className={`h-screen flex overflow-hidden ${sidebarOpen ? "sidebar-open" : ""} ${theme.bgWindow}`}
    >
      {/* Mobile overlay */}
      <div
        id="bui-sidebar-overlay"
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-20 transition-opacity duration-300 md:hidden ${
          sidebarOpen ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
        onClick={closeSidebar}
      />

      {/* Sidebar */}
      <BUISidebar
        theme={theme}
        brand={config.brand}
        navItems={config.navItems}
        isOpen={sidebarOpen}
        onClose={closeSidebar}
        profile={config.profile}
        wizard={config.wizard}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <BUIHeader
          theme={theme}
          title={config.title}
          onToggleSidebar={toggleSidebar}
        />

        <main className="flex-1 min-w-0 overflow-y-auto p-2 md:p-4 bg-[#f8fafc]">
          {children}
        </main>
      </div>
    </div>
  );
}
