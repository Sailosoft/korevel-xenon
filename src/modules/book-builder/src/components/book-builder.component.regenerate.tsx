import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/src/shadcnui/components/ui/dialog";
import { Button } from "@/src/shadcnui/components/ui/button";

interface RegenerateDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (mode: "all" | "empty") => void;
}

export default function BookBuilderComponentRegenerate({
  isOpen,
  onOpenChange,
  onConfirm,
}: RegenerateDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Regeneration Options</DialogTitle>
          <DialogDescription className="pt-2">
            How would you like to proceed? Overwriting <strong>"All"</strong>{" "}
            will reset any manual fixes (like those <strong>→</strong> arrow
            symbols) you've made.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-4">
          {/* Option 1: Only Fill Gaps */}
          <Button
            variant="secondary"
            onClick={() => onConfirm("empty")}
            className="w-full justify-start"
          >
            <span className="font-bold mr-2">Option A:</span> Fill Empty
            Chapters
          </Button>

          {/* Option 2: Full Reset */}
          <Button
            variant="destructive"
            onClick={() => onConfirm("all")}
            className="w-full justify-start"
          >
            <span className="font-bold mr-2">Option B:</span> Overwrite
            Everything
          </Button>

          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="mt-2"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
