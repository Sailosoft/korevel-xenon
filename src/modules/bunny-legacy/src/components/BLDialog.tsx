/**
 * BLDialog - Generic confirmation dialog for Bunny Legacy.
 *
 * A reusable heroUI modal dialog with a confirm/cancel flow.
 * Used to prompt users before destructive actions like chapter regeneration.
 */

"use client";

import React from "react";
import { Modal, Button } from "@heroui/react";
import { AlertTriangle } from "lucide-react";

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

export interface IBLDialogProps {
  /** Whether the dialog is visible */
  isOpen: boolean;
  /** Callback to toggle visibility */
  onOpenChange: (open: boolean) => void;
  /** Dialog heading text */
  title: string;
  /** Dialog body message */
  message: string;
  /** Label for the confirm button (default: "Confirm") */
  confirmLabel?: string;
  /** Label for the cancel button (default: "Cancel") */
  cancelLabel?: string;
  /** Fired when the user confirms */
  onConfirm: () => void;
}

export const BLDialog: React.FC<IBLDialogProps> = ({
  isOpen,
  onOpenChange,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
}) => {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Container size="sm" className="sm:mx-4 mx-2 my-2 sm:my-8">
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
                <AlertTriangle className="w-5 h-5" style={{ color: TEAL }} />
              </div>
              {title}
            </Modal.Heading>
          </Modal.Header>
          <Modal.Body className="py-4">
            <p className="text-sm text-default-500">{message}</p>
          </Modal.Body>
          <Modal.Footer className="border-t border-default-100 pt-4 flex gap-2">
            <Button
              slot="close"
              variant="secondary"
              onPress={() => onOpenChange(false)}
              className="flex-1 sm:flex-none"
              style={btnSecondary}
            >
              {cancelLabel}
            </Button>
            <Button
              onPress={handleConfirm}
              className="flex-1 sm:flex-none"
              style={btnPrimary}
            >
              {confirmLabel}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
};

export default BLDialog;
