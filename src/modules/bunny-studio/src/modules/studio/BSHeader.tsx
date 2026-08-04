// BSHeader — Sticky header for Bunny AI Studio.
//
// Representation (from PLAN.md):
//   (BunnyIcon)(Bunny AI Studio)(SpaceInBetween)(Logout)

"use client";

import React from "react";
import { Rabbit, LogOut, Menu } from "lucide-react";
import { useRouter } from "next/navigation";

export interface BSHeaderProps {
  /** Called when the user clicks logout. Defaults to redirecting home. */
  onLogout?: () => void;
  /** Called when the mobile hamburger is clicked */
  onMenuClick?: () => void;
}

export function BSHeader({ onLogout, onMenuClick }: BSHeaderProps) {
  const router = useRouter();

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
      return;
    }
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-30 h-14 bg-red-600 text-white shadow-[0_6px_18px_-8px_rgba(220,38,38,0.45)] flex items-center px-4">
      {/* Glow — soft red light bleeding off the bottom edge of the header. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1.5 bg-gradient-to-b from-red-400/25 to-transparent" />

      {/* Hamburger — toggles the mobile drawer, and on desktop collapses /
          expands the sidebar (feature: sidebar desktop view). */}
      <button
        onClick={onMenuClick}
        title="Toggle sidebar"
        className="flex items-center justify-center w-9 h-9 rounded-xl text-white hover:bg-white/15 transition mr-1"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-white/15 text-white flex items-center justify-center ring-1 ring-white/25">
          <Rabbit className="w-4.5 h-4.5" />
        </div>
        <span className="text-base font-bold text-white">
          Bunny AI Studio
        </span>
      </div>

      <div className="flex-1" />

      <button
        onClick={handleLogout}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-white/85 hover:text-white hover:bg-white/15 transition"
      >
        <LogOut className="w-4 h-4" />
        Logout
      </button>
    </header>
  );
}

export default BSHeader;
