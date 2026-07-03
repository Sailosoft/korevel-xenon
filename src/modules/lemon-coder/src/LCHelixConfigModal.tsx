// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — LCHelixConfigModal Component
// ───────────────────────────────────────────────────────────────────────────────
// Wraps HelixAIProviderSelector in a shadcn/ui Dialog for the top menu.
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/src/shadcnui/components/ui/dialog";
import { HelixAIProviderSelector } from "@/src/modules/helix";
import { lcDB } from "./LCDatabase";

export interface LCHelixConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function LCHelixConfigModal({
  open,
  onOpenChange,
}: LCHelixConfigModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#252526] border border-[#333333] text-[#d4d4d4]">
        <DialogHeader>
          <DialogTitle className="text-[#e5c07b] text-lg font-semibold">
            AI Provider Configuration
          </DialogTitle>
          <DialogDescription className="text-[#858585] text-sm">
            Select your preferred AI provider and model for Lemon Coder
            responses.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <HelixAIProviderSelector
            table={lcDB.aiSettings}
            settingsKey="default"
            className="w-full"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
