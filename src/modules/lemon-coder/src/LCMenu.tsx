// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — LCMenu Component (Top Menu Bar)
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import { Button, Dropdown } from "@heroui/react";
import { useRouter } from "next/navigation";
import {
  FolderOpen,
  History,
  Plus,
  FileCode,
  Bot,
  LayoutList,
} from "lucide-react";

export interface LCMenuProps {
  onOpenProject: () => void;
  onNewSession?: () => void;
  /** Opens the Helix AI provider configuration modal */
  onOpenHelixConfig?: () => void;
  projectName?: string;
  recentProjects: Array<{ id: string; name: string }>;
  onSelectRecentProject: (id: string) => void;
}

export default function LCMenu({
  onOpenProject,
  onNewSession,
  onOpenHelixConfig,
  projectName,
  recentProjects,
  onSelectRecentProject,
}: LCMenuProps) {
  const router = useRouter();

  return (
    <header className="flex flex-wrap items-center justify-between px-2 sm:px-4 h-auto sm:h-12 py-2 sm:py-0 bg-[#1e1e1e] border-b border-[#333333] select-none shrink-0">
      {/* Left - Brand */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <FileCode className="w-5 h-5 text-[#e5c07b]" />
          <span className="hidden sm:inline text-sm font-semibold text-[#e5c07b] tracking-wide">
            Lemon Coder
          </span>
        </div>
        {projectName && (
          <>
            <div className="w-px h-5 bg-[#333333]" />
            <span className="text-xs text-[#abb2bf] truncate max-w-[100px] sm:max-w-[200px]">
              {projectName}
            </span>
          </>
        )}
      </div>

      {/* Center - Menu Actions */}
      <div className="flex items-center gap-1 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          onPress={onOpenProject}
          className="text-[#abb2bf] hover:text-white hover:bg-[#333333] text-xs h-8 hidden sm:inline-flex"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          Open Project
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onPress={() => router.push("/modules/lemon-coder/projects")}
          className="text-[#abb2bf] hover:text-white hover:bg-[#333333] text-xs h-8 hidden sm:inline-flex"
        >
          <LayoutList className="w-3.5 h-3.5" />
          Projects
        </Button>

        {recentProjects.length > 0 ? (
          <Dropdown>
            <Dropdown.Trigger>
              <span className="inline-flex items-center gap-1 px-3 h-8 rounded-md text-xs text-[#abb2bf] hover:text-white hover:bg-[#333333] cursor-pointer transition-colors">
                <History className="w-3.5 h-3.5" />
                Recent
              </span>
            </Dropdown.Trigger>
            <Dropdown.Popover>
              <Dropdown.Menu
                aria-label="Recent projects"
                onAction={(key) => onSelectRecentProject(key as string)}
                className="bg-[#252526] border border-[#333333]"
              >
                {recentProjects.map((project) => (
                  <Dropdown.Item
                    key={project.id}
                    className="text-[#abb2bf] hover:bg-[#333333] hover:text-white"
                  >
                    {project.name}
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        ) : (
          <span className="inline-flex items-center gap-1 px-3 h-8 rounded-md text-xs text-[#555] cursor-not-allowed transition-colors">
            <History className="w-3.5 h-3.5" />
            Recent
          </span>
        )}

        <Button
          variant="ghost"
          size="sm"
          onPress={onOpenHelixConfig}
          className="text-[#abb2bf] hover:text-white hover:bg-[#333333] text-xs h-8 hidden sm:inline-flex"
        >
          <Bot className="w-3.5 h-3.5" />
          AI Config
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onPress={onNewSession}
          isDisabled={!onNewSession}
          className="text-[#abb2bf] hover:text-white hover:bg-[#333333] text-xs h-8"
        >
          <Plus className="w-3.5 h-3.5" />
          New Session
        </Button>
      </div>

      {/* Right - spacer (hidden on small screens) */}
      <div className="hidden sm:block w-[140px]" />
    </header>
  );
}
