"use client";

import {
  Button,
  Modal,
  RadioGroup,
  Radio,
} from "@heroui/react";
import { Input } from "@/src/shadcnui/components/ui/input";
import { Label } from "@/src/shadcnui/components/ui/label";
import { useState } from "react";

export interface LCNewItemModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string, type: "file" | "directory") => void;
  defaultPath: string;
}

export default function LCNewItemModal({
  isOpen,
  onOpenChange,
  onCreate,
  defaultPath,
}: LCNewItemModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"file" | "directory">("file");

  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Container>
        <Modal.Dialog className="sm:max-w-[360px]">
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>New File or Folder</Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label>Name</Label>
                <Input
                  autoFocus
                  placeholder="Enter name..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Type</Label>
                <RadioGroup
                  orientation="horizontal"
                  value={type}
                  {...{ onValueChange: (val: string) => setType(val as "file" | "directory") } as any}
                >
                  <Radio value="file">File</Radio>
                  <Radio value="directory">Folder</Radio>
                </RadioGroup>
              </div>
              <p className="text-xs text-gray-400">Location: {defaultPath}</p>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button slot="close" variant="secondary">
              Cancel
            </Button>
            <Button
              slot="close"
              onPress={() => {
                if (name) {
                  onCreate(name, type);
                  setName("");
                }
              }}
            >
              Create
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
