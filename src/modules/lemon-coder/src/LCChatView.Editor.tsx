// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — LCChatView.Editor Sub-Component
// Monaco Editor Modal for composing/editing chat message input
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import { useState, useEffect, useRef } from "react";
import { Button, Modal } from "@heroui/react";
import { Check, Code2 } from "lucide-react";
import dynamic from "next/dynamic";

// Dynamically import Monaco Editor to avoid SSR issues
const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full text-xs text-[#858585]">
        Loading Editor...
      </div>
    ),
  },
);

// ── Props ─────────────────────────────────────────────────────────────────────

export interface LCChatViewEditorProps {
  /** Whether the modal is visible */
  isOpen: boolean;
  /** Initial text content when the modal opens */
  initialContent?: string;
  /** Called when the user clicks "Use This Text" */
  onSave: (content: string) => void;
  /** Called when the modal is dismissed without saving */
  onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function LCChatViewEditor({
  isOpen,
  initialContent = "",
  onSave,
  onClose,
}: LCChatViewEditorProps) {
  const [content, setContent] = useState(initialContent);
  // Track previous isOpen value to detect open → close transitions
  const prevOpenRef = useRef(isOpen);

  // Reset content whenever the modal opens with new initialContent
  useEffect(() => {
    if (isOpen && !prevOpenRef.current) {
      setContent(initialContent);
    }
    prevOpenRef.current = isOpen;
  }, [isOpen, initialContent]);

  const handleSave = () => {
    onSave(content);
  };

  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Modal.Container className="bg-[#1e1e1e] border border-[#333] max-w-4xl w-[90vw]">
        <Modal.Dialog className="sm:max-w-[90vw] bg-[#1e1e1e] text-white min-h-[70vh]">
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading className="text-white flex items-center gap-2 text-sm">
              <Code2 className="w-4 h-4 text-[#e5c07b]" />
              Edit Message in Monaco Editor
            </Modal.Heading>
          </Modal.Header>
          <Modal.Body className="min-h-[50vh]">
            <div className="h-[50vh] border border-[#333333] rounded-md overflow-hidden">
              <MonacoEditor
                height="100%"
                language="plaintext"
                value={content}
                onChange={(val) => setContent(val || "")}
                theme="vs-dark"
                beforeMount={(monaco) => {
                  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
                    noSemanticValidation: true,
                    noSyntaxValidation: true,
                  });
                  monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
                    noSemanticValidation: true,
                    noSyntaxValidation: true,
                  });
                }}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  padding: { top: 8 },
                  wordWrap: "on",
                }}
              />
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button
              slot="close"
              variant="ghost"
              className="bg-transparent text-gray-300 hover:bg-[#333] text-xs"
            >
              Cancel
            </Button>
            <Button
              slot="close"
              onPress={handleSave}
              className="bg-[#e5c07b] text-black hover:bg-[#d1a85e] text-xs"
            >
              <Check className="w-3.5 h-3.5" />
              Use This Text
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
