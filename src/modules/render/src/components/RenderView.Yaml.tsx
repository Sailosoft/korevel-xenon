"use client";

// ───────────────────────────────────────────────────────────────────────────────
// Render Module — YAML Monaco Viewer
//
// A read-only Monaco editor component for displaying YAML content with
// full syntax highlighting, line numbers, and minimap.
//
// Uses @monaco-editor/react for SSR-safe lazy loading.
// ───────────────────────────────────────────────────────────────────────────────

import { useRef, useEffect } from "react";
import dynamic from "next/dynamic";

// ── Dynamic Monaco import (SSR-safe) ────────────────────────────────────────

const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 120,
          color: "#858585",
          fontSize: "0.8rem",
        }}
      >
        Loading YAML viewer...
      </div>
    ),
  },
);

// ── Props ────────────────────────────────────────────────────────────────────

export interface YamlMonacoViewerProps {
  /** The YAML content to display */
  content: string;
  /** Optional CSS class name */
  className?: string;
  /** Whether the editor is read-only (default: true) */
  readOnly?: boolean;
}

// ── Component ────────────────────────────────────────────────────────────────

/**
 * YamlMonacoViewer — a read-only Monaco editor pre-configured for YAML.
 *
 * Features:
 * - Syntax highlighting for YAML
 * - Line numbers
 * - Minimap (small, for navigation)
 * - Auto word-wrap
 * - Read-only by default
 */
export function YamlMonacoViewer({
  content,
  className,
  readOnly = true,
}: YamlMonacoViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Force Monaco to re-layout when the container resizes
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      // Trigger a window resize to make Monaco recalculate its layout
      window.dispatchEvent(new Event("resize"));
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        overflow: "hidden",
      }}
    >
      <MonacoEditor
        height="100%"
        defaultLanguage="yaml"
        language="yaml"
        theme="vs-light"
        value={content}
        options={{
          readOnly,
          minimap: { enabled: true, scale: 1, showSlider: "mouseover" },
          scrollBeyondLastLine: false,
          fontSize: 13,
          lineNumbers: "on",
          automaticLayout: true,
          tabSize: 2,
          wordWrap: "on",
          renderWhitespace: "selection",
          bracketPairColorization: { enabled: true },
          padding: { top: 12 },
          glyphMargin: false,
          folding: true,
          lineDecorationsWidth: 8,
          lineNumbersMinChars: 3,
          overviewRulerBorder: false,
          hideCursorInOverviewRuler: true,
          overviewRulerLanes: 0,
          scrollbar: {
            vertical: "auto",
            horizontal: "auto",
            useShadows: false,
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
          },
        }}
      />
    </div>
  );
}
