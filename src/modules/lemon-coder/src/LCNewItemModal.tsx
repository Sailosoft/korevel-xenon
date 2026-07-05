"use client";

import { Button, Modal } from "@heroui/react";
import { Input } from "@/src/shadcnui/components/ui/input";
import { Label } from "@/src/shadcnui/components/ui/label";
import { File, Folder } from "lucide-react";
import { useState } from "react";

export interface LCNewItemModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string, type: "file" | "directory") => void;
  defaultPath: string;
  defaultType?: "file" | "directory";
}

export default function LCNewItemModal({
  isOpen,
  onOpenChange,
  onCreate,
  defaultPath,
  defaultType = "file",
}: LCNewItemModalProps) {
  const [name, setName] = useState("");
  const isDir = defaultType === "directory";
  const noun = isDir ? "Folder" : "File";

  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Container className="bg-[#1e1e1e] border border-[#333]">
        <Modal.Dialog className="sm:max-w-[360px] bg-[#1e1e1e] text-white">
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading className="text-white flex items-center gap-2">
              {isDir ? (
                <Folder className="w-5 h-5 text-[#e5c07b]" />
              ) : (
                <File className="w-5 h-5 text-[#e5c07b]" />
              )}
              New {noun}
            </Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label>{noun} Name</Label>
                <Input
                  autoFocus
                  placeholder={`Enter ${noun.toLowerCase()} name...`}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <p className="text-xs text-gray-400">
                Location: {defaultPath || "/"}
              </p>
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
              className="bg-[#e5c07b] text-black hover:bg-[#d1a85e]"
              onPress={() => {
                if (name) {
                  onCreate(name, defaultType);
                  setName("");
                }
              }}
            >
              Create {noun}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
