"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  type MDXEditorMethods,
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";

import { Button, Modal } from "@heroui/react";
import { Maximize2, Minimize2 } from "lucide-react";

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

const MDX_PLUGINS = [
  headingsPlugin(),
  listsPlugin(),
  quotePlugin(),
  thematicBreakPlugin(),
  markdownShortcutPlugin(),
];

export default function BunnyMDXEditor({
  id,
  value,
  onChange,
  placeholder,
  label,
  required,
  error,
}: BunnyMDXEditorProps) {
  const inlineRef = useRef<MDXEditorMethods>(null);
  const dialogRef = useRef<MDXEditorMethods>(null);

  const [dialogOpen, setDialogOpen] = useState(false);

  // Sync external value into both editor instances
  const syncEditors = useCallback((nextValue: string) => {
    const currentInline = inlineRef.current?.getMarkdown() ?? "";
    if (nextValue !== currentInline) {
      inlineRef.current?.setMarkdown(nextValue);
    }
    const currentDialog = dialogRef.current?.getMarkdown() ?? "";
    if (nextValue !== currentDialog) {
      dialogRef.current?.setMarkdown(nextValue);
    }
  }, []);

  // Sync when value changes externally (e.g. form reset)
  useEffect(() => {
    syncEditors(value);
  }, [value, syncEditors]);

  /* ---------- Shared editor element (avoids code duplication) -------- */
  const renderEditor = (
    editorRef: React.RefObject<MDXEditorMethods | null>,
    compact = false,
  ) => (
    <div
      className={
        compact ? "min-h-[120px]" : "min-h-[400px] max-h-[70vh] overflow-y-auto"
      }
    >
      <MDXEditor
        ref={editorRef}
        markdown={value}
        onChange={onChange}
        placeholder={placeholder}
        plugins={MDX_PLUGINS}
        contentEditableClassName={
          compact
            ? "prose prose-sm dark:prose-invert max-w-none min-h-[100px] p-2 outline-none"
            : "prose dark:prose-invert max-w-none min-h-[360px] p-4 outline-none"
        }
      />
    </div>
  );

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
      <div className="border rounded-md p-1 bg-background prose max-w-none dark:prose-invert">
        {renderEditor(inlineRef, true)}
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
              <div className="border rounded-md p-2 bg-background [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:text-lg [&_h3]:font-medium [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:ml-4 [&_blockquote]:border-l-4 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_p]:mb-2 [&_code]:bg-muted [&_code]:px-1 [&_code]:rounded">
                {renderEditor(dialogRef, false)}
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
