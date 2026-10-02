"use client";

// BDShell — the BunnyDev layout shell (sidebar + header + scrollable main).
//
// Reused by both layouts: outer (project list) and inner (project workspace).

import { useCallback, useMemo, useState, type ReactNode } from "react";
import BDShellSidebar from "./BDShell.sidebar";
import BDShellHeader from "./BDShell.header";
import { BD_SHELL_THEME, type BDShellConfig } from "./BDShell.config";

export interface BDShellProps {
  config: BDShellConfig;
  children: ReactNode;
}

export function BDShell({ config, children }: BDShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const theme = useMemo(
    () => ({ ...BD_SHELL_THEME, ...config.theme }),
    [config.theme],
  );

  const toggleSidebar = useCallback(() => setSidebarOpen((prev) => !prev), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className={`flex h-screen overflow-hidden ${theme.bgWindow}`}>
      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 z-20 bg-black/40 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          sidebarOpen ? "visible opacity-100" : "invisible opacity-0"
        }`}
        onClick={closeSidebar}
        aria-hidden
      />

      <BDShellSidebar
        theme={theme}
        brand={config.brand}
        navItems={config.navItems}
        isOpen={sidebarOpen}
        onClose={closeSidebar}
        profile={config.profile}
        wizard={config.wizard}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <BDShellHeader
          theme={theme}
          title={config.title}
          onToggleSidebar={toggleSidebar}
          logoutHref={config.logoutHref}
        />

        {config.banner && (
          <div className="border-b border-blue-100 bg-blue-50 px-4 py-2 text-sm text-blue-700 md:px-8">
            {config.banner}
          </div>
        )}

        <main
          className={`bd-scroll min-w-0 flex-1 overflow-y-auto p-3 md:p-6 ${theme.bgWindow}`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

export default BDShell;
