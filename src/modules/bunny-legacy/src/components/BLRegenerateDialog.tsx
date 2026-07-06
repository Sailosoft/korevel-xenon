/**
 * BLRegenerateDialog - Chapter regeneration options dialog.
 *
 * Single Responsibility: Present regeneration strategy options.
 * Uses heroUI Modal components and lucide-react icons.
 */

"use client";

import React from "react";
import { Modal, Button } from "@heroui/react";
import { RefreshCw, FileX2, AlertTriangle } from "lucide-react";

export interface IBLRegenerateDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (mode: "all" | "empty") => void;
}

export const BLRegenerateDialog: React.FC<IBLRegenerateDialogProps> = ({
  isOpen,
  onOpenChange,
  onConfirm,
}) => {
  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Container size="md">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading className="text-lg font-semibold flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              Regenerate Chapters
            </Modal.Heading>
          </Modal.Header>
          <Modal.Body className="space-y-4">
            <p className="text-sm text-default-500">
              Choose how you want to regenerate chapters:
            </p>
            <div className="flex flex-col gap-3">
              <Button
                variant="secondary"
                className="w-full justify-start"
                onPress={() => onConfirm("empty")}
              >
                <FileX2 className="w-4 h-4 mr-2" />
                Generate only empty chapters
              </Button>
              <Button
                variant="danger"
                className="w-full justify-start"
                onPress={() => onConfirm("all")}
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Regenerate ALL chapters (overwrites existing content)
              </Button>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button slot="close" variant="secondary" onPress={() => onOpenChange(false)}>
              Cancel
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
};

export default BLRegenerateDialog;
