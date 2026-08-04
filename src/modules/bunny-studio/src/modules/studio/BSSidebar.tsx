// BSSidebar — Sidebar navigation for Bunny AI Studio.
//
// Representation (from PLAN.md):
//   (Bunny Main Title Sidebar)
//   (Chat: Default)
//   (SidebarTitle: Agent)
//   (Agents)
//   (AgentPools)
//   (SidebarTitle: Settings)
//   (AI Settings)
//   (Configurations)
//
// Design (feature: stunning sidebar): a deep red-glass panel that ties into
// the beating-red chat hero — glossy beating logo, breathing red glow,
// red-gradient active pill with a sweeping sheen, themed scrollbars, and a
// subtle "studio ready" footer.

"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Rabbit,
  MessageSquare,
  History,
  Users,
  Layers,
  Settings2,
  Wrench,
  BookOpen,
  FolderOpen,
  Star,
  Tags,
} from "lucide-react";

// ─── Nav model ──────────────────────────────────────────────────────────

interface BSSidebarSection {
  title?: string;
  items: Array<{
    href: string;
    label: string;
    icon: React.ReactNode;
    matchPrefix?: boolean;
  }>;
}

const SECTIONS: BSSidebarSection[] = [
  {
    items: [
      {
        href: "/modules/bunny-studio",
        label: "Chat",
        icon: <MessageSquare className="w-4 h-4" />,
        matchPrefix: true,
      },
      {
        href: "/modules/bunny-studio/history",
        label: "Chat History",
        icon: <History className="w-4 h-4" />,
      },
    ],
  },
  {
    title: "Agents",
    items: [
      {
        href: "/modules/bunny-studio/agents",
        label: "Agents",
        icon: <Users className="w-4 h-4" />,
      },
      {
        href: "/modules/bunny-studio/agent-pools",
        label: "Agent Pools",
        icon: <Layers className="w-4 h-4" />,
        // Stay highlighted when drilling into a pool's agents page.
        matchPrefix: true,
      },
    ],
  },
  {
    title: "Instructions",
    items: [
      {
        href: "/modules/bunny-studio/instructions",
        label: "Instructions",
        icon: <BookOpen className="w-4 h-4" />,
      },
      {
        href: "/modules/bunny-studio/instruction-groups",
        label: "Instruction Groups",
        icon: <FolderOpen className="w-4 h-4" />,
      },
    ],
  },
  {
    title: "Favorites",
    items: [
      {
        href: "/modules/bunny-studio/chat-favorites",
        label: "Chat Favorites",
        icon: <Star className="w-4 h-4" />,
      },
      {
        href: "/modules/bunny-studio/chat-categories",
        label: "Chat Categories",
        icon: <Tags className="w-4 h-4" />,
      },
    ],
  },
  {
    title: "Settings",
    items: [
      {
        href: "/modules/bunny-studio/ai-settings",
        label: "AI Settings",
        icon: <Settings2 className="w-4 h-4" />,
      },
      {
        href: "/modules/bunny-studio/configurations",
        label: "Configurations",
        icon: <Wrench className="w-4 h-4" />,
      },
    ],
  },
];

// ─── Component ─────────────────────────────────────────────────────────

export interface BSSidebarProps {
  /** Extra classes (e.g. hidden lg:flex for desktop, drawer variants) */
  className?: string;
  /** Called after a nav link is clicked (e.g. to close a mobile drawer) */
  onNavigate?: () => void;
}

export function BSSidebar({ className = "", onNavigate }: BSSidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string, matchPrefix?: boolean) => {
    if (href === "/modules/bunny-studio") {
      // The Chat item is only active on the chat home or a chat detail page —
      // NOT on every Bunny Studio sub-page (fix: sidebar chat item always
      // highlighted). Uses a "/chat/" prefix so sibling routes like
      // "/chat-favorites" and "/chat-categories" are not highlighted.
      return (
        pathname === "/modules/bunny-studio" ||
        pathname === "/modules/bunny-studio/chat" ||
        pathname.startsWith("/modules/bunny-studio/chat/")
      );
    }
    if (matchPrefix) {
      return pathname.startsWith(href);
    }
    return pathname === href;
  };

  return (
    <aside
      className={`bs-sidebar w-60 shrink-0 border-r border-white/10 flex flex-col ${className}`}
    >
      {/* Bunny Main Title Sidebar */}
      <div className="relative z-10 flex items-center gap-2.5 px-4 h-16 shrink-0 border-b border-white/10">
        <div className="bs-sidebar-logo w-9 h-9 rounded-xl text-white flex items-center justify-center shrink-0">
          <Rabbit className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold text-white leading-tight">
            Bunny AI Studio
          </div>
          <div className="text-[10px] text-white/50 truncate">
            Multi-modal AI workspace
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 bs-sidebar-scroll flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {SECTIONS.map((section, idx) => (
          <div key={idx}>
            {section.title && (
              <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/35 flex items-center gap-2">
                {section.title}
                <span className="flex-1 h-px bg-gradient-to-r from-white/15 to-transparent" />
              </div>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const active = isActive(item.href, item.matchPrefix);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={`group relative flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all duration-200 overflow-hidden ${
                      active
                        ? "bs-sidebar-link-active text-white font-medium"
                        : "text-gray-300 hover:text-white hover:bg-white/5 hover:translate-x-0.5"
                    }`}
                  >
                    <span className="relative z-10">{item.icon}</span>
                    <span className="relative z-10">{item.label}</span>
                    {active && (
                      <span className="absolute right-2.5 z-10 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer status */}
      <div className="relative z-10 px-4 py-3 border-t border-white/10 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400 shadow-[0_0_8px_rgba(255,60,40,0.9)] animate-pulse" />
        <span className="text-[10px] text-white/40 uppercase tracking-wider">
          Studio ready
        </span>
      </div>
    </aside>
  );
}

export default BSSidebar;
