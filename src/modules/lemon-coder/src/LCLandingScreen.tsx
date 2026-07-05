// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — LCLandingScreen Component
// Landing screen shown when no project is selected
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import LCMenu from "./LCMenu";
import type { LCProject } from "./LCInterface";
import { LCTheme } from "./LCTheme";

export interface LCLandingScreenProps {
  onOpenProject: () => void;
  onOpenCreateProject?: () => void;
  recentProjects: LCProject[];
  onSelectRecentProject: (id: string) => void;
  onOpenHelixConfig: () => void;
  onClearRecentProjects?: () => void;
}

const s = {
  brand: LCTheme.colors.brand,
  background: LCTheme.colors.background,
  text: LCTheme.colors.text,
  textSecondary: LCTheme.colors.textSecondary,
  border: LCTheme.colors.border,
  hover: LCTheme.colors.hover,
};

export default function LCLandingScreen({
  onOpenProject,
  onOpenCreateProject,
  recentProjects,
  onSelectRecentProject,
  onOpenHelixConfig,
  onClearRecentProjects,
}: LCLandingScreenProps) {
  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{ backgroundColor: s.background, color: s.text }}
    >
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
          <h1
            className="text-2xl font-bold mb-3"
            style={{ color: s.brand }}
          >
            Welcome to Lemon Coder
          </h1>
          <p
            className="text-sm mb-8"
            style={{ color: s.textSecondary }}
          >
            Your AI-powered code assistant. Open a project to get started.
          </p>

          {/* "View Projects" link */}
          <div className="mb-4">
            <a
              href="/modules/lemon-coder/projects"
              className="inline-flex items-center gap-1.5 text-xs hover:underline"
              style={{ color: s.brand }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
              </svg>
              View All Projects
            </a>
          </div>

          <div className="space-y-3">
            {onOpenCreateProject && (
              <button
                onClick={onOpenCreateProject}
                className="w-full max-w-xs mx-auto flex items-center justify-center gap-3 px-6 py-3 rounded-lg font-semibold transition-colors"
                style={{
                  backgroundColor: s.brand,
                  color: s.background,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = s.hover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = s.brand;
                }}
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
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Create Project
              </button>
            )}
            <button
              onClick={onOpenProject}
              className="w-full max-w-xs mx-auto flex items-center justify-center gap-3 px-6 py-3 rounded-lg font-semibold transition-colors"
              style={{
                backgroundColor: "transparent",
                color: s.brand,
                border: `1px solid ${s.brand}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = s.brand + "22";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
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
              Open Existing Folder
            </button>

            {recentProjects.length > 0 && (
              <div
                className="pt-6 border-t"
                style={{ borderColor: s.border }}
              >
                <p
                  className="text-xs mb-3 uppercase tracking-wider font-semibold"
                  style={{ color: s.textSecondary }}
                >
                  Recent Projects
                </p>
                <div className="space-y-1">
                  {recentProjects.slice(0, 5).map((project) => (
                    <button
                      key={project.id}
                      onClick={() => onSelectRecentProject(project.id)}
                      className="w-full text-left px-4 py-2 text-sm rounded-lg transition-colors"
                      style={{
                        color: s.text,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = s.border;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      {project.name}
                    </button>
                  ))}
                  {onClearRecentProjects && (
                    <button
                      onClick={onClearRecentProjects}
                      className="w-full text-left px-4 py-2 text-xs rounded-lg transition-colors opacity-60 hover:opacity-100"
                      style={{
                        color: s.textSecondary,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = s.border;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      Clear Recent Projects
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
