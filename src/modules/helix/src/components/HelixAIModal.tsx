"use client";

import { Modal } from "@heroui/react";
import { Table } from "dexie";
import { HelixAIProviderSelector } from "./HelixAIProviderSelector";
import { HelixAISettings } from "../HelixAITypes";

export interface HelixAIModalProps<T extends Table<HelixAISettings>> {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  table: T;
  settingsKey?: string;
}

/**
 * HelixAIModal
 * 
 * A generic modal wrapper for the AI Provider Selector.
 * This component is agnostic of the specific database instance,
 * requiring the table to be passed in via props.
 */
export default function HelixAIModal<T extends Table<HelixAISettings>>({
  isOpen,
  onOpenChange,
  table,
  settingsKey = "default",
}: HelixAIModalProps<T>) {
  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Container className="bg-[#1e1e1e] border border-[#333]">
        <Modal.Dialog className="sm:max-w-md bg-[#1e1e1e] text-white">
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading className="text-white">
              AI Provider Configuration
            </Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            <p className="text-xs text-gray-400 mb-4">
              Select your preferred AI provider and model for AI responses.
            </p>
            <div className="py-2">
              <HelixAIProviderSelector
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