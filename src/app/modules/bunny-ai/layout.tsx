"use client";

import { Button } from "@heroui/react";
import "./layout.css";
import {
  LucideRabbit,
  Menu,
  Plus,
  Rabbit,
  Settings,
  X,
  LayoutDashboard,
  Users,
  BookOpen,
  Zap,
  Layers,
} from "lucide-react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Suspense, useCallback } from "react";

// ==========================================
// ADJUST YOUR THEME CONFIGURATION HERE
// ==========================================
const THEME = {
  bgWindow: "bg-[#f8fafc]", // Laravel's light slate background
  bgSidebar: "bg-white", // Clean white sidebar
  border: "border-slate-100", // Subtle slate borders
  textPrimary: "text-[#ff2d20]", // Laravel Signature Red
  textMuted: "text-slate-400", // Clear, clean gray text headers
  gradient: "from-[#ff2d20] to-[#f43f5e]", // Beautiful crimson-to-rose brand gradient
  shadow: "shadow-red-100", // Soft red shadow accent

  // Buttons
  btnPrimary: "bg-[#ff2d20] text-white hover:bg-[#e0241b] transition-colors",
  btnSecondary: "text-[#ff2d20] bg-red-50 hover:bg-red-100 transition-colors",

  // Navigation Links
  navActive: "text-[#ff2d20] bg-red-50/70 font-semibold",
  navHover:
    "text-slate-600 hover:bg-slate-50 hover:text-[#ff2d20] transition-colors",

  // User Profile Widget
  avatarBg: "bg-red-100",
  avatarText: "text-[#ff2d20]",
};

export default function BunnyAILayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div className={`h-screen ${THEME.bgWindow}`} />}>
      <BunnyAILayoutContent>{children}</BunnyAILayoutContent>
    </Suspense>
  );
}

function BunnyAILayoutContent({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const isOpen = searchParams.get("open-sidebar") === "true";

  const toggleSidebar = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (isOpen) {
      params.delete("open-sidebar");
    } else {
      params.set("open-sidebar", "true");
    }
    router.push(`${pathname}?${params.toString()}`);
  }, [isOpen, pathname, router, searchParams]);

  const closeSidebar = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("open-sidebar");
    router.push(`${pathname}?${params.toString()}`);
  }, [pathname, router, searchParams]);

  return (
    <div
      className={`h-screen flex overflow-hidden ${isOpen ? "sidebar-open" : ""} ${THEME.bgWindow}`}
    >
      {/* Sidebar Mobile Overlay */}
      <div
        id="sidebarOverlay"
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-20 transition-opacity duration-300 md:hidden ${
          isOpen ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
        onClick={closeSidebar}
      />

      <Sidebar isOpen={isOpen} onClose={closeSidebar} pathname={pathname} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="glass-header h-16 flex items-center justify-between px-4 md:px-8 flex-shrink-0 z-10 sticky top-0">
          <div className="flex items-center space-x-4">
            <Button
              onPress={toggleSidebar}
              className={`p-2 min-w-10 h-10 rounded-xl transition-colors ${THEME.btnSecondary}`}
            >
              <Menu className="w-6 h-6" />
            </Button>
            <div className="p-6 flex items-center space-x-3">
              <div
                className={`w-10 h-10 bg-gradient-to-br ${THEME.gradient} rounded-xl flex items-center justify-center shadow-lg ${THEME.shadow}`}
              >
                <Rabbit color="white" />
              </div>
              <span
                className={`text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${THEME.gradient}`}
              >
                Bunny AI - Book Builder
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 min-w-0 overflow-y-auto p-2 md:p-4 bg-[#f8fafc]">
          {children}
        </main>
      </div>
    </div>
  );
}
// -------------------------------
// SIDEBAR
// -------------------------------
const Sidebar = ({
  isOpen,
  onClose,
  pathname,
}: {
  isOpen: boolean;
  onClose: () => void;
  pathname: string;
}) => {
  return (
    <aside
      id="sidebar"
      className={`fixed inset-y-0 left-0 z-30 ${THEME.bgSidebar} ${THEME.border} flex flex-col sidebar-transition md:relative overflow-hidden ${
        isOpen
          ? "translate-x-0 w-72 opacity-100 border-r"
          : "-translate-x-full w-72 md:w-0 md:opacity-0 md:border-none"
      }`}
    >
      <div className="w-72 flex flex-col h-full flex-shrink-0">
        {/* Sidebar Brand Header */}
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <LucideRabbit className={`w-10 h-10 ${THEME.textPrimary}`} />
            <span
              className={`text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${THEME.gradient}`}
            >
              Bunny AI
            </span>
          </div>
          <Button
            variant="danger"
            onPress={onClose}
            className={`p-2 min-w-8 h-8 md:hidden text-pink-400 hover:${THEME.textPrimary}`}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          <button
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all shadow-md ${THEME.btnPrimary} ${THEME.shadow} mb-6 group cursor-pointer`}
          >
            <Plus />
            <span className="font-medium">New Project</span>
          </button>

          <div
            className={`text-xs font-semibold uppercase tracking-wider px-4 mb-2 ${THEME.textMuted}`}
          >
            Main Menu
          </div>

          <Link
            href="/modules/bunny-ai"
            className={`flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-colors group ${
              pathname === "/modules/bunny-ai"
                ? THEME.navActive
                : THEME.navHover
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="font-medium">Dashboard</span>
          </Link>

          <Link
            href="/modules/bunny-ai/authors"
            className={`flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-colors group ${
              pathname === "/modules/bunny-ai/authors"
                ? THEME.navActive
                : THEME.navHover
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="font-medium">Authors</span>
          </Link>

          <Link
            href="/modules/bunny-ai/books"
            className={`flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-colors group ${THEME.navHover}`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="font-medium">Books</span>
          </Link>

          <Link
            href="/modules/bunny-ai/author-skills"
            className={`flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-colors group ${
              pathname === "/modules/bunny-ai/author-skills"
                ? THEME.navActive
                : THEME.navHover
            }`}
          >
            <Zap className="w-5 h-5" />
            <span className="font-medium">Skills</span>
          </Link>

          <Link
            href="#"
            className={`flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-colors group ${THEME.navHover}`}
          >
            <Layers className="w-5 h-5" />
            <span className="font-medium">Book Chapters</span>
          </Link>

          <div
            className={`text-xs font-semibold uppercase tracking-wider px-4 mt-8 mb-2 ${THEME.textMuted}`}
          >
            Settings
          </div>
          <Link
            href="/modules/bunny-ai/settings"
            className={`flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-colors group ${
              pathname === "/modules/bunny-ai/settings"
                ? THEME.navActive
                : THEME.navHover
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="font-medium">Preferences</span>
          </Link>
        </nav>

        {/* Profile Footer */}
        <div className={`p-4 border-t ${THEME.border}`}>
          <div className="bg-gray-50 rounded-2xl p-3 flex items-center space-x-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${THEME.avatarBg} ${THEME.avatarText}`}
            >
              BA
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold text-gray-800 truncate">
                Bunny Author
              </p>
              <p className="text-xs text-gray-500 truncate">Premium Tier</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
