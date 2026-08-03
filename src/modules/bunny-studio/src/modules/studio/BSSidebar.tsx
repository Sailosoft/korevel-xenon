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
      // highlighted).
      return (
        pathname === "/modules/bunny-studio" ||
        pathname.startsWith("/modules/bunny-studio/chat")
      );
    }
    if (matchPrefix) {
      return pathname.startsWith(href);
    }
    return pathname === href;
  };

  return (
    <aside
      className={`w-60 shrink-0 border-r border-gray-200 bg-white flex flex-col ${className}`}
    >
      {/* Bunny Main Title Sidebar */}
      {/* <div className="h-14 flex items-center gap-2 px-4 border-b border-gray-100">
        <div className="w-7 h-7 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
          <Rabbit className="w-4 h-4" />
        </div>
        <span className="font-semibold text-gray-800 text-sm">Bunny Studio</span>
      </div> */}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {SECTIONS.map((section, idx) => (
          <div key={idx}>
            {section.title && (
              <div className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                {section.title}
              </div>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item.href, item.matchPrefix);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm transition ${
                      active
                        ? "bg-red-50 text-red-700 font-medium"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}

export default BSSidebar;
