"use client";

// BDConfirmDialog — a small confirmation modal built on BDModal.

import BDModal from "./BDModal";
import BDButton from "./BDButton";

export interface BDConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "primary" | "danger";
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function BDConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  isLoading = false,
  onConfirm,
  onCancel,
}: BDConfirmDialogProps) {
  return (
    <BDModal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <BDButton variant="ghost" onClick={onCancel}>
            {cancelLabel}
          </BDButton>
          <BDButton
            variant={variant}
            isLoading={isLoading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </BDButton>
        </>
      }
    >
      <p className="text-sm text-slate-600">
        {description ?? "This action cannot be undone."}
      </p>
    </BDModal>
  );
}

export default BDConfirmDialog;
