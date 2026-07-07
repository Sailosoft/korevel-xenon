/**
 * BLAIConfig - AI Provider Configuration modal for Bunny Legacy.
 *
 * Wraps HelixAIProviderSelector inside a heroUI Modal for Bunny Legacy UI.
 * Uses the BLDatabase.aiSettings table for Dexie persistence.
 */

"use client";

import React from "react";
import { Modal } from "@heroui/react";
import { HelixAIProviderSelector } from "@/src/modules/helix";
import { BLDatabase } from "../core/BLRepository";

/** Teal: lab(44.7267% -21.5987 -26.118) ≈ #007399 */
const TEAL = "#007399";

export interface IBLAIConfigProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const db = new BLDatabase();

export const BLAIConfig: React.FC<IBLAIConfigProps> = ({
  isOpen,
  onOpenChange,
}) => {
  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Container className="sm:max-w-md">
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
              AI Provider Configuration
            </Modal.Heading>
          </Modal.Header>
          <Modal.Body className="py-4">
            <p className="text-xs text-default-500 mb-4">
              Select your preferred AI provider and model for generating book
              content.
            </p>
            <HelixAIProviderSelector
              table={db.aiSettings}
              settingsKey="default"
              className="w-full"
            />
          </Modal.Body>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
};

export default BLAIConfig;
