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
//
// Section titles (feature: collapsible sidebar sections) act as disclosure
// headers — click to collapse / expand their sub-menu items. Collapsed state
// is persisted per-section in localStorage. An active item always forces its
// section open.

"use client";

import React, { useCallback, useEffect, useState } from "react";
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
  ImagePlus,
  Images,
  Clapperboard,
  Film,
  AudioLines,
  Library,
  FileText,
  Database,
  FolderTree,
  ChevronRight,
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
    title: "Image",
    items: [
      {
        href: "/modules/bunny-studio/image-generator",
        label: "Image Generator",
        icon: <ImagePlus className="w-4 h-4" />,
        matchPrefix: true,
      },
      {
        href: "/modules/bunny-studio/image-library",
        label: "Image Library",
        icon: <Images className="w-4 h-4" />,
        matchPrefix: true,
      },
    ],
  },
  {
    title: "Video",
    items: [
      {
        href: "/modules/bunny-studio/video-generator",
        label: "Video Generator",
        icon: <Clapperboard className="w-4 h-4" />,
        matchPrefix: true,
      },
      {
        href: "/modules/bunny-studio/video-library",
        label: "Video Library",
        icon: <Film className="w-4 h-4" />,
        matchPrefix: true,
      },
    ],
  },
  {
    title: "Speech",
    items: [
      {
        href: "/modules/bunny-studio/speech-generator",
        label: "Speech Generator",
        icon: <AudioLines className="w-4 h-4" />,
        matchPrefix: true,
      },
      {
        href: "/modules/bunny-studio/speech-library",
        label: "Speech Library",
        icon: <Library className="w-4 h-4" />,
        matchPrefix: true,
      },
      {
        href: "/modules/bunny-studio/transcription",
        label: "Transcription",
        icon: <FileText className="w-4 h-4" />,
        matchPrefix: true,
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
    title: "Knowledge",
    items: [
      {
        href: "/modules/bunny-studio/knowledge-groups",
        label: "Knowledge Groups",
        icon: <FolderTree className="w-4 h-4" />,
      },
      {
        href: "/modules/bunny-studio/knowledges",
        label: "Knowledges",
        icon: <Database className="w-4 h-4" />,
        matchPrefix: true,
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

// ─── Collapsed-state persistence ─────────────────────────────────────────
// Per-section disclosure state lives in localStorage so the user's layout
// survives reloads. Keyed by section title so renames degrade gracefully.

const STORAGE_KEY = "bs-sidebar-collapsed-sections";

function loadCollapsed(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

// ─── Component ─────────────────────────────────────────────────────────

export interface BSSidebarProps {
  /** Extra classes (e.g. hidden lg:flex for desktop, drawer variants) */
  className?: string;
  /** Called after a nav link is clicked (e.g. to close a mobile drawer) */
  onNavigate?: () => void;
}

export function BSSidebar({ className = "", onNavigate }: BSSidebarProps) {
  const pathname = usePathname();
  // IMPORTANT: Do NOT seed this state from localStorage. Reading localStorage
  // during the initial render makes the client HTML (which has persisted
  // collapsed sections) differ from the server HTML (no localStorage), which
  // triggers a React hydration mismatch on the disclosure buttons
  // (aria-expanded / chevron rotation). The persisted value is applied in an
  // effect after mount instead, so both sides render the same first tree.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  // True once the persisted state has been read into `collapsed`. Guards the
  // persistence effect so it doesn't overwrite localStorage with the empty
  // initial state before the loaded value lands.
  const [hydrated, setHydrated] = useState(false);

  // Load persisted section disclosure state only after mount (client-only).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCollapsed(loadCollapsed());
    setHydrated(true);
  }, []);

  // Persist section disclosure state on change.
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(collapsed));
    } catch {
      /* localStorage unavailable (private mode) — ignore */
    }
  }, [collapsed, hydrated]);

  const toggleSection = useCallback((title: string) => {
    setCollapsed((prev) => ({ ...prev, [title]: !prev[title] }));
  }, []);

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
        {SECTIONS.map((section, idx) => {
          // A section with an active item must stay open so users always see
          // where they are, even if they manually collapsed it earlier.
          const anyActive = section.items.some((item) =>
            isActive(item.href, item.matchPrefix),
          );
          const isCollapsed = section.title
            ? collapsed[section.title] === true && !anyActive
            : false;

          return (
            <div key={idx}>
              {section.title ? (
                <button
                  type="button"
                  onClick={() => toggleSection(section.title!)}
                  aria-expanded={!isCollapsed}
                  className="group/section w-full px-3 mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/35 hover:text-white/60 flex items-center gap-1.5 transition-colors outline-none"
                >
                  <span
                    className={`shrink-0 transition-transform duration-200 ${
                      isCollapsed ? "rotate-0" : "rotate-90"
                    }`}
                  >
                    <ChevronRight className="w-3 h-3" />
                  </span>
                  {section.title}
                  <span className="flex-1 h-px bg-gradient-to-r from-white/15 to-transparent" />
                </button>
              ) : null}

              {!isCollapsed && (
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
              )}
            </div>
          );
        })}
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
