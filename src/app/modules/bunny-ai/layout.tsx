"use client";

import { Button } from "@heroui/react";
import "./layout.css";
import { LucideRabbit, Menu, Plus, Rabbit, Settings, X } from "lucide-react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Suspense, useCallback } from "react";

export default function BunnyAILayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div className="h-screen bg-[#fdf6f9]" />}>
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
      className={`h-screen flex overflow-hidden ${isOpen ? "sidebar-open" : ""}`}
      style={{
        backgroundColor: "#fdf6f9",
      }}
    >
      <div
        id="sidebarOverlay"
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-20 transition-opacity duration-300 md:hidden ${isOpen ? "opacity-100 visible" : "opacity-0 invisible"
          }`}
        onClick={closeSidebar}
      ></div>
      <Sidebar isOpen={isOpen} onClose={closeSidebar} pathname={pathname} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="glass-header h-16 flex items-center justify-between px-4 md:px-8 flex-shrink-0 z-10 sticky top-0">
          <div className="flex items-center space-x-4">
            <Button
              // variant="flat"
              onPress={toggleSidebar}
              className="p-2 min-w-unit-10 h-10 text-pink-600 bg-pink-100/50 hover:bg-pink-100 rounded-xl transition-colors"
            >
              <Menu className="w-6 h-6" />
            </Button>
            <div className="p-6 flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-rose-400 rounded-xl flex items-center justify-center shadow-lg shadow-pink-200">
                <Rabbit color="white" />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-600 to-rose-500">
                Bunny AI - Book Builder
              </span>
            </div>
          </div>
        </header>
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

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
      className={`fixed inset-y-0 left-0 z-30 bg-white border-pink-100 flex flex-col sidebar-transition md:relative overflow-hidden ${isOpen
        ? "translate-x-0 w-72 opacity-100 border-r"
        : "-translate-x-full w-72 md:w-0 md:opacity-0 md:border-none"
        }`}
    >
      <div className="w-72 flex flex-col h-full flex-shrink-0">
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <LucideRabbit className="w-10 h-10 text-pink-500" />
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-600 to-rose-500">
              Bunny AI
            </span>
          </div>
          <Button
            variant="secondary"
            onPress={onClose}
            className="p-2 min-w-unit-8 h-8 text-pink-400 hover:text-pink-600 md:hidden"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          <button className="w-full flex items-center space-x-3 px-4 py-3 bg-pink-500 text-white rounded-2xl hover:bg-pink-600 transition-all shadow-md shadow-pink-100 mb-6 group cursor-pointer">
            <Plus />
            <span className="font-medium">New Project</span>
          </button>

          <div className="text-xs font-semibold text-pink-300 uppercase tracking-wider px-4 mb-2">
            Main Menu
          </div>

          <Link
            href="/modules/bunny-ai"
            className={`flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-colors group ${pathname === "/modules/bunny-ai" ? "text-pink-600 bg-pink-50/50" : "text-gray-600 hover:bg-pink-50 hover:text-pink-600"}`}
          >
            <i data-lucide="layout-dashboard" className="w-5 h-5"></i>
            <span className="font-medium">Dashboard</span>
          </Link>
          <Link
            href="/modules/bunny-ai/authors"
            className={`flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-colors group ${pathname === "/modules/bunny-ai/authors" ? "text-pink-600 bg-pink-50/50" : "text-gray-600 hover:bg-pink-50 hover:text-pink-600"}`}
          >
            <i data-lucide="users" className="w-5 h-5"></i>
            <span className="font-medium">Authors</span>
          </Link>
          <Link
            href="#"
            className="flex items-center space-x-3 px-4 py-2.5 text-gray-600 hover:bg-pink-50 hover:text-pink-600 rounded-xl transition-colors group"
          >
            <i data-lucide="book-open" className="w-5 h-5"></i>
            <span className="font-medium">Books</span>
          </Link>
          <Link
            href="#"
            className="flex items-center space-x-3 px-4 py-2.5 text-gray-600 hover:bg-pink-50 hover:text-pink-600 rounded-xl transition-colors group"
          >
            <i data-lucide="zap" className="w-5 h-5"></i>
            <span className="font-medium">Skills</span>
          </Link>
          <Link
            href="#"
            className="flex items-center space-x-3 px-4 py-2.5 text-gray-600 hover:bg-pink-50 hover:text-pink-600 rounded-xl transition-colors group"
          >
            <i data-lucide="layers" className="w-5 h-5"></i>
            <span className="font-medium">Book Chapters</span>
          </Link>

          <div className="text-xs font-semibold text-pink-300 uppercase tracking-wider px-4 mt-8 mb-2">
            Settings
          </div>
          <Link
            href="#"
            className="flex items-center space-x-3 px-4 py-2.5 text-gray-600 hover:bg-pink-50 hover:text-pink-600 rounded-xl transition-colors group"
          >
            <Settings className="w-5 h-5" />
            <span className="font-medium">Preferences</span>
          </Link>
        </nav>

        <div className="p-4 border-t border-pink-50">
          <div className="bg-gray-50 rounded-2xl p-3 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-pink-200 flex items-center justify-center font-bold text-pink-700">
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
