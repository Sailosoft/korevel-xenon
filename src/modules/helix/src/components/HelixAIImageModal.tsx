"use client";

import { Modal } from "@heroui/react";
import { Table } from "dexie";
import { HelixAIImageProviderSelector } from "./HelixAIImageProviderSelector";
import { HelixAISettings } from "../HelixAITypes";

export interface HelixAIImageModalProps<
  T extends Table<HelixAISettings>,
> {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  table: T;
  settingsKey?: string;
}

/**
 * HelixAIImageModal
 *
 * A generic modal wrapper for the Image AI Provider Selector.
 * This component is agnostic of the specific database instance,
 * requiring the table to be passed in via props.
 */
export default function HelixAIImageModal<
  T extends Table<HelixAISettings>,
>({
  isOpen,
  onOpenChange,
  table,
  settingsKey = "default",
}: HelixAIImageModalProps<T>) {
  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Container>
        <Modal.Dialog className="sm:max-w-md bg-[#1e1e1e] text-white">
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading className="text-white">
              Image AI Provider Configuration
            </Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            <p className="text-xs text-gray-400 mb-4">
              Select your preferred provider and model for image generation.
            </p>
            <div className="py-2">
              <HelixAIImageProviderSelector
                table={table}
                settingsKey={settingsKey}
                className="w-full"
              />
            </div>
          </Modal.Body>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
