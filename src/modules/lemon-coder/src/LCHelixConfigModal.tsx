// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — LCHelixConfigModal Component
// ───────────────────────────────────────────────────────────────────────────────
// Wraps HelixAIProviderSelector in a HeroUI Modal for the top menu.
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import { Modal } from "@heroui/react";
import { HelixAIProviderSelector } from "@/src/modules/helix";
import { lcDB } from "./LCDatabase";

export interface LCHelixConfigModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function LCHelixConfigModal({
  isOpen,
  onOpenChange,
}: LCHelixConfigModalProps) {
  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Container>
        <Modal.Dialog className="sm:max-w-md bg-[#1e1e1e] text-white">
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading className="text-white">
              AI Provider Configuration
            </Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            <p className="text-xs text-gray-400 mb-4">
              Select your preferred AI provider and model for Lemon Coder responses.
            </p>
            <div className="py-2">
              <HelixAIProviderSelector
                table={lcDB.aiSettings}
                settingsKey="default"
                className="w-full"
              />
            </div>
          </Modal.Body>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
