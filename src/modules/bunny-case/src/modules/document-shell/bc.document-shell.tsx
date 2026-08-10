// bc.document-shell.tsx
//
// BCDocumentShell — composable layout shell (header + sidebar + main) for the
// BunnyCase app. Referenced from the Bunny Studio studio shell pattern; each
// app owns its header + sidebar.

"use client";

import React, { useCallback, useMemo, useState } from "react";
import BCDocumentShellSidebar from "./bc.document-shell.sidebar";
import BCDocumentShellHeader from "./bc.document-shell.header";
import {
  type BCDocumentShellConfig,
  DEFAULT_BC_THEME,
} from "./bc.document-shell.config";

export interface BCDocumentShellProps {
  config: BCDocumentShellConfig;
  children: React.ReactNode;
}

export default function BCDocumentShell({
  config,
  children,
}: BCDocumentShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const theme = useMemo(
    () => ({ ...DEFAULT_BC_THEME, ...config.theme }),
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
        id="bc-sidebar-overlay"
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-20 transition-opacity duration-300 md:hidden ${
          sidebarOpen ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
        onClick={closeSidebar}
      />

      {/* Sidebar */}
      <BCDocumentShellSidebar
        theme={theme}
        brand={config.brand}
        navItems={config.navItems}
        isOpen={sidebarOpen}
        onClose={closeSidebar}
        profile={config.profile}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <BCDocumentShellHeader
          theme={theme}
          title={config.title}
          onToggleSidebar={toggleSidebar}
          logoutHref={config.logoutHref}
        />

        <main className="flex-1 min-w-0 overflow-y-auto p-2 md:p-4 bg-[#f8fafc]">
          {children}
        </main>
      </div>
    </div>
  );
}
