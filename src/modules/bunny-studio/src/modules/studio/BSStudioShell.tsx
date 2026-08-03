// BSStudioShell — Layout shell for Bunny AI Studio.
//
// Combines the sticky header + sidebar navigation around the page content.
// Mobile-friendly (feature: DocumentShell): on small screens the sidebar is
// hidden behind a hamburger in the header and slides in as a drawer. On
// desktop the same hamburger collapses / expands the sidebar (feature:
// sidebar desktop view).

"use client";

import React, { useCallback, useState } from "react";
import { BSHeader } from "./BSHeader";
import { BSSidebar } from "./BSSidebar";

export interface BSStudioShellProps {
  children: React.ReactNode;
}

export function BSStudioShell({ children }: BSStudioShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile drawer
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // desktop

  // The hamburger collapses the sidebar on desktop (≥ lg) and toggles the
  // drawer on mobile.
  const handleMenuClick = useCallback(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 1024px)").matches
    ) {
      setSidebarCollapsed((v) => !v);
    } else {
      setSidebarOpen((v) => !v);
    }
  }, []);

  return (
    <div className="bs-studio h-screen flex flex-col bg-gray-50">
      <BSHeader onMenuClick={handleMenuClick} />
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop sidebar (≥ lg) — collapsible via the header hamburger */}
        <BSSidebar
          className={
            sidebarCollapsed ? "hidden lg:hidden" : "hidden lg:flex"
          }
        />

        {/* Mobile drawer (hamburger toggles this) */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
            <div className="absolute inset-y-0 left-0 shadow-xl">
              <BSSidebar
                className="h-full"
                onNavigate={() => setSidebarOpen(false)}
              />
            </div>
          </div>
        )}

        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}

export default BSStudioShell;
