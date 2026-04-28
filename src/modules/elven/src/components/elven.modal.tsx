"use client";
import { Button, Modal } from "@heroui/react";
import React from "react";
import { ElvenTypography } from "./elven.typography";

interface ElvenModalProps {
  children: React.ReactNode;
  title: string;
  size?: "xs" | "sm" | "md" | "lg" | "cover" | "full";
  hideAction?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  onClose?: () => void;
  isOpen: boolean;
}

export default function ElvenModal({
  children,
  title,
  size = "md",
  hideAction = false,
  actionLabel = "Confirm",
  onAction,
  onClose,
  isOpen,
}: ElvenModalProps) {
  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={onClose}>
      <Modal.Container size={size}>
        <Modal.Dialog>
          <Modal.CloseTrigger />

          <Modal.Header>
            <Modal.Heading>
              <ElvenTypography variant="title-large">{title}</ElvenTypography>
            </Modal.Heading>
          </Modal.Header>

          <Modal.Body>{children}</Modal.Body>

          <Modal.Footer>
            <Button slot="close" variant="secondary" onPress={onClose}>
              Cancel
            </Button>

            {!hideAction && (
              <Button
                onPress={onAction}
                // Using slot="close" if you want the action to also close the modal
                slot={onAction ? undefined : "close"}
              >
                {actionLabel}
              </Button>
            )}
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
