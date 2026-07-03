// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — LCLandingScreen Component
// Landing screen shown when no project is selected
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import LCMenu from "./LCMenu";
import type { LCProject } from "./LCInterface";

export interface LCLandingScreenProps {
  onOpenProject: () => void;
  recentProjects: LCProject[];
  onSelectRecentProject: (id: string) => void;
  onOpenHelixConfig: () => void;
}

export default function LCLandingScreen({
  onOpenProject,
  recentProjects,
  onSelectRecentProject,
  onOpenHelixConfig,
}: LCLandingScreenProps) {
  return (
    <div className="flex flex-col h-screen bg-[#1e1e1e] text-[#d4d4d4]">
      {/* Menu Bar — New Session is disabled on landing screen (no active project) */}
      <LCMenu
        onOpenProject={onOpenProject}
        onNewSession={undefined}
        onOpenHelixConfig={onOpenHelixConfig}
        recentProjects={recentProjects}
        onSelectRecentProject={onSelectRecentProject}
      />

      {/* Landing Content */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6">🍋</div>
          <h1 className="text-2xl font-bold text-[#e5c07b] mb-3">
            Welcome to Lemon Coder
          </h1>
          <p className="text-sm text-[#858585] mb-8">
            Your AI-powered code assistant. Open a project to get started.
          </p>

          <div className="space-y-3">
            <button
              onClick={onOpenProject}
              className="w-full max-w-xs mx-auto flex items-center justify-center gap-3 bg-[#e5c07b] text-[#1e1e1e] px-6 py-3 rounded-lg font-semibold hover:bg-[#d4a84b] transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              Open Project
            </button>

            {recentProjects.length > 0 && (
              <div className="pt-6 border-t border-[#333333]">
                <p className="text-xs text-[#858585] mb-3 uppercase tracking-wider font-semibold">
                  Recent Projects
                </p>
                <div className="space-y-1">
                  {recentProjects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => onSelectRecentProject(project.id)}
                      className="w-full text-left px-4 py-2 text-sm text-[#abb2bf] hover:bg-[#333333] rounded-lg transition-colors"
                    >
                      {project.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
