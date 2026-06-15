"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { OnMount } from "@monaco-editor/react";

import { Button, Modal } from "@heroui/react";
import { Maximize2, Minimize2 } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Dynamically import Monaco Editor (avoids SSR issues in Next.js)    */
/* ------------------------------------------------------------------ */
const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((mod) => mod.default),
  { ssr: false },
);

/* ------------------------------------------------------------------ */
/*  BunnyCodeEditor Props                                              */
/* ------------------------------------------------------------------ */
export interface BunnyCodeEditorProps {
  /** Unique HTML id for the field. */
  id: string;
  /** Current code value. */
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
  /** Programming language for syntax highlighting (default: "typescript"). */
  language?: string;
  /** Monaco editor theme (default: "vs-dark"). */
  theme?: string;
  /** Minimum height of the editor in pixels (default: 120). */
  minHeight?: number;
  /** Height of the expanded editor in the modal (default: 500). */
  expandedHeight?: number;
}

/* ------------------------------------------------------------------ */
/*  Default settings                                                   */
/* ------------------------------------------------------------------ */
const DEFAULT_LANGUAGE = "typescript";
const DEFAULT_THEME = "vs-dark";
const DEFAULT_MIN_HEIGHT = 120;
const DEFAULT_EXPANDED_HEIGHT = 500;

/* ------------------------------------------------------------------ */
/*  BunnyCodeEditor                                                    */
/* ------------------------------------------------------------------ */
export default function BunnyCodeEditor({
  id,
  value,
  onChange,
  placeholder,
  label,
  required,
  error,
  language = DEFAULT_LANGUAGE,
  theme = DEFAULT_THEME,
  minHeight = DEFAULT_MIN_HEIGHT,
  expandedHeight = DEFAULT_EXPANDED_HEIGHT,
}: BunnyCodeEditorProps) {
  const inlineEditorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const dialogEditorRef = useRef<Parameters<OnMount>[0] | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);

  /* ---------- Shared editor element (avoids code duplication) -------- */
  const renderEditor = (
    editorRef: React.MutableRefObject<Parameters<OnMount>[0] | null>,
    height: number | string,
  ) => (
    <MonacoEditor
      key={id}
      language={language}
      theme={theme}
      value={value}
      onChange={(val) => onChange(val ?? "")}
      onMount={(editor) => {
        editorRef.current = editor;
      }}
      options={{
        minimap: { enabled: false },
        lineNumbers: "on",
        scrollBeyondLastLine: false,
        wordWrap: "on",
        automaticLayout: true,
        tabSize: 2,
        fontSize: 13,
        padding: { top: 8 },
      }}
      height={height}
    />
  );

  const showError = !!error;

  return (
    <div className="flex flex-col gap-1 w-full code-editor-wrapper">
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
      <div
        className="border rounded-md overflow-hidden bg-background"
        style={{ minHeight }}
      >
        {renderEditor(inlineEditorRef, minHeight)}
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
              <div className="border rounded-md overflow-hidden bg-background">
                {renderEditor(dialogEditorRef, expandedHeight)}
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
