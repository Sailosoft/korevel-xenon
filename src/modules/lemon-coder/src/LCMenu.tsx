// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — LCMenu Component (Top Menu Bar) with mobile hamburger menu
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import { Button, Dropdown } from "@heroui/react";
import { useRouter } from "next/navigation";
import {
  FolderOpen,
  Plus,
  FileCode,
  Bot,
  LayoutList,
  Menu,
  Settings,
  LogOut,
} from "lucide-react";
import { useState } from "react";

export interface LCMenuProps {
  onOpenProject: () => void;
  onNewSession?: () => void;
  /** Opens the Helix AI provider configuration modal */
  onOpenHelixConfig?: () => void;
  /** Opens the app settings modal */
  onOpenSettings?: () => void;
  projectName?: string;
  recentProjects: Array<{ id: string; name: string }>;
  onSelectRecentProject: (id: string) => void;
}

export default function LCMenu({
  onOpenProject,
  onNewSession,
  onOpenHelixConfig,
  onOpenSettings,
  projectName,
  recentProjects,
  onSelectRecentProject,
}: LCMenuProps) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    router.push("/");
  };

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

      {/* Center - Menu Actions (desktop) */}
      <div className="hidden sm:flex items-center gap-1 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          onPress={onOpenProject}
          className="text-[#abb2bf] hover:text-white hover:bg-[#333333] text-xs h-8"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          Open Project
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onPress={() => router.push("/modules/lemon-coder/projects")}
          className="text-[#abb2bf] hover:text-white hover:bg-[#333333] text-xs h-8"
        >
          <LayoutList className="w-3.5 h-3.5" />
          Projects
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onPress={onOpenHelixConfig}
          className="text-[#abb2bf] hover:text-white hover:bg-[#333333] text-xs h-8"
        >
          <Bot className="w-3.5 h-3.5" />
          AI Config
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onPress={onOpenSettings}
          className="text-[#abb2bf] hover:text-white hover:bg-[#333333] text-xs h-8"
        >
          <Settings className="w-3.5 h-3.5" />
          Settings
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

      {/* Mobile hamburger menu */}
      <div className="sm:hidden flex items-center">
        <Dropdown>
          <Dropdown.Trigger>
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-md text-[#abb2bf] hover:text-white hover:bg-[#333333] cursor-pointer transition-colors">
              <Menu className="w-5 h-5" />
            </span>
          </Dropdown.Trigger>
          <Dropdown.Popover>
            <Dropdown.Menu
              aria-label="Mobile menu"
              className="bg-[#252526] border border-[#333333]"
            >
              <Dropdown.Item
                key="open-project"
                onAction={onOpenProject}
                className="text-[#abb2bf] hover:bg-[#333333] hover:text-white"
              >
                <FolderOpen className="w-3.5 h-3.5 inline mr-2" />
                Open Project
              </Dropdown.Item>
              <Dropdown.Item
                key="projects"
                onAction={() => router.push("/modules/lemon-coder/projects")}
                className="text-[#abb2bf] hover:bg-[#333333] hover:text-white"
              >
                <LayoutList className="w-3.5 h-3.5 inline mr-2" />
                Projects
              </Dropdown.Item>
              <Dropdown.Item
                key="ai-config"
                onAction={onOpenHelixConfig}
                className="text-[#abb2bf] hover:bg-[#333333] hover:text-white"
              >
                <Bot className="w-3.5 h-3.5 inline mr-2" />
                AI Config
              </Dropdown.Item>
              <Dropdown.Item
                key="settings"
                onAction={onOpenSettings}
                className="text-[#abb2bf] hover:bg-[#333333] hover:text-white"
              >
                <Settings className="w-3.5 h-3.5 inline mr-2" />
                Settings
              </Dropdown.Item>
              <Dropdown.Item
                key="new-session"
                onAction={onNewSession}
                className="text-[#abb2bf] hover:bg-[#333333] hover:text-white"
              >
                <Plus className="w-3.5 h-3.5 inline mr-2" />
                New Session
              </Dropdown.Item>
              <Dropdown.Item
                key="logout"
                onAction={handleLogout}
                className="text-[#e06c75] hover:bg-[#333333] hover:text-[#e06c75]"
              >
                <LogOut className="w-3.5 h-3.5 inline mr-2" />
                Logout
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      </div>

      {/* Right - Logout (desktop only) */}
      <div className="hidden sm:block">
        <Button
          variant="ghost"
          size="sm"
          onPress={handleLogout}
          className="text-[#e06c75] hover:text-[#e06c75] hover:bg-[#333333] text-xs h-8"
        >
          <LogOut className="w-3.5 h-3.5" />
          Logout
        </Button>
      </div>
    </header>
  );
}
