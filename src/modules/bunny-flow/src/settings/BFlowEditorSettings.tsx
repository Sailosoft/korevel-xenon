/**
 * BFlowEditorSettings — Editor preference context for choosing between
 * MonacoEditor and CodeMirror in the workflow studio.
 *
 * Stores the preference in localStorage under `bflow-editor-preference`.
 * Defaults to `"monaco"` when no value is stored.
 */

"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

// ─── Types ────────────────────────────────────────────────────────────

export type BFlowEditorKind = "monaco" | "codemirror";

export interface BFlowEditorSettingsContextValue {
  /** The active editor kind. */
  editorKind: BFlowEditorKind;
  /** Set the active editor kind and persist to localStorage. */
  setEditorKind: (kind: BFlowEditorKind) => void;
  /** Reset to the default editor (Monaco). */
  resetToDefault: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────

const STORAGE_KEY = "bflow-editor-preference";
const DEFAULT_EDITOR: BFlowEditorKind = "monaco";

// ─── Context ──────────────────────────────────────────────────────────

const BFlowEditorSettingsContext =
  createContext<BFlowEditorSettingsContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────

export function BFlowEditorSettingsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [editorKind, setEditorKindState] = useState<BFlowEditorKind>(() => {
    if (typeof window === "undefined") return DEFAULT_EDITOR;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "monaco" || stored === "codemirror") return stored;
    return DEFAULT_EDITOR;
  });

  const setEditorKind = (kind: BFlowEditorKind) => {
    setEditorKindState(kind);
    try {
      localStorage.setItem(STORAGE_KEY, kind);
    } catch {
      // localStorage may be unavailable (SSR / private mode)
    }
  };

  const resetToDefault = () => {
    setEditorKind(DEFAULT_EDITOR);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // noop
    }
  };

  // Listen for storage changes from other tabs
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        const val = e.newValue;
        if (val === "monaco" || val === "codemirror") {
          setEditorKindState(val);
        }
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return (
    <BFlowEditorSettingsContext.Provider
      value={{ editorKind, setEditorKind, resetToDefault }}
    >
      {children}
    </BFlowEditorSettingsContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────

export function useBFlowEditorSettings(): BFlowEditorSettingsContextValue {
  const ctx = useContext(BFlowEditorSettingsContext);
  if (!ctx) {
    throw new Error(
      "useBFlowEditorSettings must be used within a BFlowEditorSettingsProvider",
    );
  }
  return ctx;
}

// ─── Labels (for UI display) ──────────────────────────────────────────

export const EDITOR_OPTIONS: { value: BFlowEditorKind; label: string; description: string }[] = [
  {
    value: "monaco",
    label: "Monaco Editor",
    description: "Full-featured editor with IntelliSense, syntax highlighting, and multi-cursor (default).",
  },
  {
    value: "codemirror",
    label: "CodeMirror",
    description: "Lightweight editor with basic syntax highlighting and fast rendering.",
  },
];
