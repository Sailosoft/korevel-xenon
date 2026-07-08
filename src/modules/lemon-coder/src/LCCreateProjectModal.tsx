// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — LCCreateProjectModal Component
// Modal for creating a new project with name and folder selection
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import { useState, useRef } from "react";
import { Button, Input, Label, Modal } from "@heroui/react";
import { FolderPlus, FolderOpen, FileCode } from "lucide-react";
import { LCTheme } from "./LCTheme";

export interface LCCreateProjectModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateProject: (name: string, dirHandle: FileSystemDirectoryHandle) => void;
}

export default function LCCreateProjectModal({
  isOpen,
  onOpenChange,
  onCreateProject,
}: LCCreateProjectModalProps) {
  const [projectName, setProjectName] = useState("");
  const [folderPath, setFolderPath] = useState("");
  const [isSelectingFolder, setIsSelectingFolder] = useState(false);
  const dirHandleRef = useRef<FileSystemDirectoryHandle | null>(null);

  const handleSelectFolder = async () => {
    setIsSelectingFolder(true);
    try {
      let dirHandle: FileSystemDirectoryHandle;

      if (typeof (window as any).showDirectoryPicker === "function") {
        dirHandle = await (window as any).showDirectoryPicker({
          mode: "readwrite",
        });
      } else {
        const { directoryOpen } = await import("browser-fs-access");
        const result = await directoryOpen({ recursive: true, mode: "readwrite" });
        // Extract the directory handle from result
        if (result && result.length > 0) {
          const first = (result as any[])[0];
          if (first && typeof first.kind === "string" && first.kind === "directory") {
            dirHandle = first as FileSystemDirectoryHandle;
          } else if (first?.directoryHandle) {
            dirHandle = first.directoryHandle as FileSystemDirectoryHandle;
          } else {
            throw new Error("Could not obtain directory handle");
          }
        } else {
          throw new Error("No directory selected");
        }
      }

      dirHandleRef.current = dirHandle;
      setFolderPath(dirHandle.name);
    } catch (error: any) {
      if (error.name !== "AbortError" && error.name !== "SecurityError") {
        console.error("Failed to select folder:", error);
      }
    } finally {
      setIsSelectingFolder(false);
    }
  };

  const handleCreate = () => {
    if (projectName.trim() && dirHandleRef.current) {
      onCreateProject(projectName.trim(), dirHandleRef.current);
      setProjectName("");
      setFolderPath("");
      dirHandleRef.current = null;
    }
  };

  const isValid = projectName.trim().length > 0 && dirHandleRef.current !== null;

  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Container>
        <Modal.Dialog className="sm:max-w-[420px] bg-[#1e1e1e] text-white">
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading className="text-white flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-[#e5c07b]" />
              Create Project
            </Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label>Project Name</Label>
                <Input
                  autoFocus
                  placeholder="Enter project name..."
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  onKeyDown={(e: React.KeyboardEvent) => {
                    if (e.key === "Enter" && isValid) handleCreate();
                  }}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label>Folder Location</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Select a folder..."
                    value={folderPath}
                    readOnly
                    className="flex-1 bg-[#2d2d2d] cursor-pointer"
                    onClick={handleSelectFolder}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    isDisabled={isSelectingFolder}
                    onPress={handleSelectFolder}
                    className="bg-[#e5c07b] text-[#1e1e1e] hover:bg-[#d4a84b] shrink-0"
                  >
                    <FolderOpen className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-[10px] text-[#858585]">
                  {isSelectingFolder
                    ? "Opening folder picker..."
                    : folderPath
                      ? `Selected: ${folderPath}`
                      : "Click the folder icon or input to choose a directory"}
                </p>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button
              slot="close"
              variant="ghost"
              className="bg-transparent text-gray-300 hover:bg-[#333]"
            >
              Cancel
            </Button>
            <Button
              slot="close"
              isDisabled={!isValid}
              className={`${isValid ? "bg-[#e5c07b] text-black hover:bg-[#d1a85e]" : "bg-[#333] text-[#666]"}`}
              onPress={handleCreate}
            >
              <FileCode className="w-4 h-4" />
              Create Project
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
