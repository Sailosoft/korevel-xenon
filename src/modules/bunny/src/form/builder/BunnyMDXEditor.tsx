"use client";

import { useState } from "react";
import { Button, Modal } from "@heroui/react";
import { Maximize2, Minimize2 } from "lucide-react";
import BunnyMarkdownSurface from "./BunnyMarkdownSurface";

/* ------------------------------------------------------------------ */
/*  BunnyMDXEditor                                                     */
/* ------------------------------------------------------------------ */

export interface BunnyMDXEditorProps {
  /** Unique HTML id for the field. */
  id: string;
  /** Current markdown value. */
  value: string;
  /** Called on every editor content change. */
  onChange: (value: string) => void;
  /** Placeholder text shown when empty. */
  placeholder?: string;
  /** Label rendered above the editor. */
  label?: string;
  /** Whether the field is required (shows asterisk). */
  required?: boolean;
  /** Error message to display. */
  error?: string;
}

export default function BunnyMDXEditor({
  id,
  value,
  onChange,
  placeholder,
  label,
  required,
  error,
}: BunnyMDXEditorProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const showError = !!error;

  return (
    <div className="flex flex-col gap-1 w-full mdx-editor-wrapper">
      {/* ---- Label row + expand button ---- */}
      {label && (
        <div className="flex items-center gap-2">
          <label htmlFor={id} className="text-sm font-medium">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>

          <Button
            variant="ghost"
            size="sm"
            isIconOnly
            className="size-5 min-w-5 min-h-5 text-default-400 hover:text-default-foreground"
            aria-label={`Expand ${label} editor`}
            onPress={() => setDialogOpen(true)}
          >
            <Maximize2 className="size-3" />
          </Button>
        </div>
      )}

      {/* ---- Inline editor ---- */}
      <div className="border rounded-md p-1 bg-background">
        <BunnyMarkdownSurface
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          minHeight={120}
        />
      </div>

      {showError && <p className="text-sm text-red-500 mt-1">{error}</p>}

      {/* ---- Expanded editor modal ---- */}
      <Modal.Backdrop
        isOpen={dialogOpen}
        onOpenChange={(open) => setDialogOpen(open)}
        isDismissable={true}
      >
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-5xl max-h-[85vh]">
            <Modal.CloseTrigger />

            <Modal.Header className="w-full pr-12 border-b">
              <Modal.Heading className="flex items-center gap-2 text-lg">
                <Minimize2 className="size-4" />
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
              </Modal.Heading>
            </Modal.Header>

            <Modal.Body className="p-4 overflow-y-auto">
              <div className="border rounded-md p-2 bg-background">
                {dialogOpen && (
                  <BunnyMarkdownSurface
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    minHeight={360}
                  />
                )}
              </div>
            </Modal.Body>

            <Modal.Footer className="border-t">
              <Button
                type="button"
                variant="secondary"
                onPress={() => setDialogOpen(false)}
              >
                Close
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </div>
  );
}
