/**
 * BLRegenerateDialog - Chapter regeneration options dialog.
 *
 * Single Responsibility: Present regeneration strategy options.
 * Uses heroUI Modal components and lucide-react icons.
 */

"use client";

import React from "react";
import { Modal, Button } from "@heroui/react";
import { RefreshCw, FileX2, AlertTriangle, RotateCcw } from "lucide-react";

/** Teal: lab(44.7267% -21.5987 -26.118) ≈ #007399 */
const TEAL = "#007399";
const TEAL_DARK = "#00557a";

const btnPrimary = {
  background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DARK})`,
  color: "#fff",
  border: "none",
};

const btnSecondary = {
  borderColor: TEAL,
  color: TEAL,
  background: "#f0f0f0",
};

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
      <Modal.Container size="md" className="sm:mx-4 mx-2 my-2 sm:my-8">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header
            className="pb-4"
            style={{ borderBottom: `1px solid ${TEAL}15` }}
          >
            <Modal.Heading
              className="text-lg font-semibold flex items-center gap-2"
              style={{ color: TEAL }}
            >
              <div
                className="p-1.5 rounded-lg"
                style={{ background: `${TEAL}15` }}
              >
                <RotateCcw className="w-5 h-5" style={{ color: TEAL }} />
              </div>
              Regenerate Chapters
            </Modal.Heading>
          </Modal.Header>
          <Modal.Body className="space-y-4 py-4">
            <p className="text-sm text-default-500">
              Choose how you want to regenerate chapters:
            </p>
            <div className="flex flex-col gap-3">
              <Button
                className="w-full justify-start h-auto py-3 px-4"
                onPress={() => onConfirm("empty")}
                style={btnPrimary}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="p-1.5 rounded-lg"
                    style={{ background: "#ffffff26" }}
                  >
                    <FileX2 className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-sm text-white">
                      Generate only empty chapters
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "#ffffffb3" }}>
                      Skips chapters that already have content
                    </div>
                  </div>
                </div>
              </Button>
              <Button
                variant="secondary"
                className="w-full justify-start h-auto py-3 px-4"
                onPress={() => onConfirm("all")}
                style={btnSecondary}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="p-1.5 rounded-lg"
                    style={{ background: `${TEAL}15` }}
                  >
                    <AlertTriangle className="w-4 h-4" style={{ color: TEAL }} />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-sm" style={{ color: TEAL }}>
                      Regenerate ALL chapters
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: `${TEAL}99` }}>
                      Overwrites existing content — this cannot be undone
                    </div>
                  </div>
                </div>
              </Button>
            </div>
          </Modal.Body>
          <Modal.Footer className="border-t border-default-100 pt-4">
            <Button
              slot="close"
              variant="secondary"
              onPress={() => onOpenChange(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
};

export default BLRegenerateDialog;
