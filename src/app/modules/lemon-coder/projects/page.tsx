"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { lcDB } from "@/src/modules/lemon-coder/src/LCDatabase";
import { LCTheme } from "@/src/modules/lemon-coder/src/LCTheme";
import { Button, Modal } from "@heroui/react";
import {
  ArrowLeft,
  FolderOpen,
  ExternalLink,
  Pencil,
  Trash2,
  Calendar,
  Clock,
} from "lucide-react";

const s = {
  brand: LCTheme.colors.brand,
  background: LCTheme.colors.background,
  text: LCTheme.colors.text,
  textSecondary: LCTheme.colors.textSecondary,
  border: LCTheme.colors.border,
  hover: LCTheme.colors.hover,
};

export default function LemonCoderProjectsPage() {
  const router = useRouter();
  const projects = useLiveQuery(() => lcDB.getAllProjects()) || [];
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleView = useCallback(
    (projectId: string) => {
      router.push(`/modules/lemon-coder/projects/${encodeURIComponent(projectId)}`);
    },
    [router],
  );

  const handleOpen = useCallback(
    (projectId: string) => {
      router.push(`/modules/lemon-coder/studio?projectId=${encodeURIComponent(projectId)}`);
    },
    [router],
  );

  const handleEditName = useCallback(
    async (projectId: string) => {
      const project = projects.find((p) => p.id === projectId);
      if (!project) return;
      const newName = window.prompt("Enter new project name:", project.name);
      if (newName && newName.trim() && newName.trim() !== project.name) {
        await lcDB.updateProjectName(projectId, newName.trim());
      }
    },
    [projects],
  );

  const handleDelete = useCallback(
    async (projectId: string) => {
      await lcDB.deleteProject(projectId);
      setDeleteConfirmId(null);
    },
    [],
  );

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{ backgroundColor: s.background, color: s.text }}
    >
      {/* Header */}
      <header
        className="flex items-center justify-between px-6 h-14 border-b shrink-0"
        style={{ backgroundColor: s.background, borderColor: s.border }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/modules/lemon-coder")}
            className="flex items-center gap-2 text-sm hover:opacity-80 transition-opacity"
            style={{ color: s.brand }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="w-px h-6" style={{ backgroundColor: s.border }} />
          <h1 className="text-lg font-bold" style={{ color: s.brand }}>
            Projects
          </h1>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: s.brand + "22",
              color: s.brand,
            }}
          >
            {projects.length} project{projects.length !== 1 ? "s" : ""}
          </span>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <FolderOpen className="w-16 h-16 mb-4" style={{ color: s.textSecondary }} />
            <p className="text-sm mb-2" style={{ color: s.textSecondary }}>
              No projects yet.
            </p>
            <p className="text-xs" style={{ color: s.textSecondary }}>
              Create a project from the landing page to get started.
            </p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-3">
            {projects.map((project) => (
              <div
                key={project.id}
                className="rounded-lg border p-4 flex items-center justify-between transition-colors hover:opacity-90"
                style={{
                  backgroundColor: s.background,
                  borderColor: s.border,
                }}
              >
                {/* Project Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <FolderOpen className="w-4 h-4 shrink-0" style={{ color: s.brand }} />
                    <h3
                      className="text-sm font-semibold truncate"
                      style={{ color: s.text }}
                    >
                      {project.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3 text-xs" style={{ color: s.textSecondary }}>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Created: {formatDate(project.createdAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Last opened: {formatDate(project.lastOpened)} {formatTime(project.lastOpened)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs h-7"
                    style={{ color: s.brand }}
                    onPress={() => handleView(project.id)}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs h-7"
                    style={{ color: s.textSecondary }}
                    onPress={() => handleEditName(project.id)}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs h-7 text-red-400 hover:bg-red-400/10"
                    onPress={() => setDeleteConfirmId(project.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </Button>
                  <Button
                    size="sm"
                    className="text-xs h-7"
                    style={{
                      backgroundColor: s.brand,
                      color: s.background,
                    }}
                    onPress={() => handleOpen(project.id)}
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    Open
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal.Backdrop
        isOpen={deleteConfirmId !== null}
        onOpenChange={(open: boolean) => { if (!open) setDeleteConfirmId(null); }}
      >
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-sm bg-[#1e1e1e] text-white">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading className="text-white flex items-center gap-2 text-sm">
                <Trash2 className="w-4 h-4 text-red-400" />
                Delete Project
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <p className="text-sm text-gray-300">
                Are you sure you want to delete this project? This will permanently remove
                the project entry, associated chat sessions, and all messages.
              </p>
              <p className="text-xs text-red-400 mt-2">
                This action cannot be undone. The folder on disk will not be affected.
              </p>
            </Modal.Body>
            <Modal.Footer>
              <Button
                slot="close"
                variant="ghost"
                className="bg-transparent text-gray-300 hover:bg-[#333] text-xs"
              >
                Cancel
              </Button>
              <Button
                slot="close"
                onPress={() => deleteConfirmId && handleDelete(deleteConfirmId)}
                className="bg-red-500 text-white hover:bg-red-600 text-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </div>
  );
}
