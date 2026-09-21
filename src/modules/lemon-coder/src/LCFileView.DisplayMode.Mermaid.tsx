// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — Mermaid Display-Mode Editor
//
// Provides a View | Edit segmented control at the top-right of the view area
// for `.mermaid` / `.mmd` files, modeled on LCFileView.DisplayMode.Csv.
//
//   View : mermaid preview (or the custom positioned canvas when `%% lc-layout`
//          metadata is present and the diagram is a flowchart)
//   Edit : Text | Split | Visual | Layout panes
//          • Text/Split — Monaco or CodeMirror (per the editor.useCodeMirror
//            setting), live preview in Split
//          • Visual/Layout — flowchart-only overlay/canvas editing
//
// Auto-save is handled by the parent (LCFileView debounce); this component
// calls onContentChange + onSave on every structural commit, exactly like the
// CSV editor.
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Pencil,
  Eye,
  Braces,
  Split,
  Move,
  Layers,
  Undo2,
  Redo2,
  Plus,
  Workflow,
  X,
  Check,
  GitBranch,
} from "lucide-react";
import { lcDB } from "./LCDatabase";
import { MermaidRenderer } from "@/src/modules/render";
import LCCodeMonacoEditor from "./LCCodeMonacoEditor";
import MermaidVisualEditor, {
  type VisualSelection,
} from "./LCFileView.DisplayMode.Mermaid.Visual";
import LayoutCanvas, {
  type LayoutSelection,
  NODE_W,
  NODE_H,
} from "./LCFileView.DisplayMode.Mermaid.Layout";
import {
  parseFlowDoc,
  stripLayoutLine,
  detectDiagramType,
  setNodeLabel,
  deleteNode,
  addNode as flowAddNode,
  addEdge as flowAddEdge,
  deleteEdge as flowDeleteEdge,
  setEdgeLabel as flowSetEdgeLabel,
  setPositions,
  autoArrange,
  nextNodeId,
  edgeKey,
  DIAGRAM_TYPES,
  DIAGRAM_TEMPLATES,
  type DiagramType,
  type FlowEdgeInfo,
  type MutationResult,
} from "./LCFileView.DisplayMode.Mermaid.Flow";

// ── Dynamically imported editors (SSR-safe) ─────────────────────────────────

const CodeMirrorEditor = dynamic(
  () => import("./LCCodeMirrorEditor").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full text-xs text-[#858585]">
        Loading Editor...
      </div>
    ),
  },
);

// ── Types ────────────────────────────────────────────────────────────────────

export interface LCFileViewDisplayModeMermaidProps {
  /** Raw mermaid file content */
  content: string;
  /** Called with the new content on every commit */
  onContentChange: (content: string) => void;
  /** Persist the current content to disk */
  onSave: () => void;
  /** File name shown in the toolbar */
  fileName?: string;
}

type EditPane = "text" | "split" | "visual" | "layout";
type Mode = "view" | "edit";

type AnySelection = VisualSelection | LayoutSelection;

// ── Constants ────────────────────────────────────────────────────────────────

const MAX_HISTORY = 50;

const PANE_BUTTONS: ReadonlyArray<{
  key: EditPane;
  label: string;
  icon: typeof Braces;
  title: string;
}> = [
  { key: "text", label: "Text", icon: Braces, title: "Plain text editor" },
  { key: "split", label: "Split", icon: Split, title: "Text editor with live preview" },
  { key: "visual", label: "Visual", icon: Eye, title: "Overlay editing on the rendered diagram (flowcharts only)" },
  { key: "layout", label: "Layout", icon: Move, title: "Free-position canvas layout (flowcharts only)" },
];

// ── Component ────────────────────────────────────────────────────────────────

export default function LCFileViewDisplayModeMermaid({
  content,
  onContentChange,
  onSave,
  fileName,
}: LCFileViewDisplayModeMermaidProps) {
  // ── Working text state (seeded from the file) ──────────────────────────
  const [text, setText] = useState(content);
  const textRef = useRef(text);
  const lastEmittedRef = useRef(content);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);

  // Persisted preferences.
  const lastModeEntry = useLiveQuery(
    () => lcDB.appSettings.get("mermaid.lastMode"),
    [],
  );
  const useCodeMirrorEntry = useLiveQuery(
    () => lcDB.appSettings.get("editor.useCodeMirror"),
    [],
  );
  const fontSizeEntry = useLiveQuery(
    () => lcDB.appSettings.get("editor.fontSize"),
    [],
  );
  const tabSizeEntry = useLiveQuery(
    () => lcDB.appSettings.get("editor.tabSize"),
    [],
  );

  const useCodeMirror = useCodeMirrorEntry?.value === "true";
  const cmFontSize = fontSizeEntry ? parseInt(fontSizeEntry.value, 10) : 13;
  const cmTabSize = tabSizeEntry ? parseInt(tabSizeEntry.value, 10) : 2;

  const [mode, setMode] = useState<Mode>("view");
  const [editPane, setEditPane] = useState<EditPane>("split");
  const [selection, setSelection] = useState<AnySelection | null>(null);
  const [confirmType, setConfirmType] = useState<DiagramType | null>(null);

  // Apply persisted last mode on mount, mirroring the render-time reset
  // pattern used by RenderView.Mermaid (avoids effect-triggered setState).
  const [prevLastMode, setPrevLastMode] = useState<string | undefined>(undefined);
  if (lastModeEntry?.value !== prevLastMode) {
    setPrevLastMode(lastModeEntry?.value);
    if (lastModeEntry?.value === "edit") {
      setMode("edit");
    }
  }

  useEffect(() => {
    textRef.current = text;
  }, [text]);

  // ── Derive flowchart model + diagram type ─────────────────────────────
  const doc = useMemo(() => parseFlowDoc(text), [text]);
  const diagramType = useMemo(() => detectDiagramType(text), [text]);
  const isFlowchart = doc.isFlowchart;

  const isEmpty = !text.trim();

  // Layout positions: persisted metadata, else auto-arrange.
  const hasLayout =
    doc.layout !== null && Object.keys(doc.layout.positions).length > 0;

  // ── Re-sync when content changes externally ───────────────────────────
  useEffect(() => {
    if (content !== lastEmittedRef.current) {
      setText(content);
      lastEmittedRef.current = content;
      undoStackRef.current = [];
      redoStackRef.current = [];
      setCanUndo(false);
      setCanRedo(false);
      setSelection(null);
      setConfirmType(null);
    }
  }, [content]);

  // ── Emit helpers ──────────────────────────────────────────────────────

  /** Broadcast a committed change: onContentChange + onSave + status. */
  const emit = useCallback(
    (next: string) => {
      lastEmittedRef.current = next;
      setText(next);
      onContentChange(next);
      onSave();
      setLastSavedAt(new Date());
    },
    [onContentChange, onSave],
  );

  /** Apply a mutation with undo/redo snapshot. */
  const applyMutation = useCallback(
    (result: MutationResult) => {
      undoStackRef.current.push(textRef.current);
      if (undoStackRef.current.length > MAX_HISTORY) {
        undoStackRef.current.shift();
      }
      redoStackRef.current = [];
      setCanUndo(true);
      setCanRedo(false);
      setSelection(null);
      emit(result.content);
    },
    [emit],
  );

  const undo = useCallback(() => {
    const prev = undoStackRef.current.pop();
    if (prev === undefined) return;
    redoStackRef.current.push(textRef.current);
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(true);
    setSelection(null);
    emit(prev);
  }, [emit]);

  const redo = useCallback(() => {
    const next = redoStackRef.current.pop();
    if (next === undefined) return;
    undoStackRef.current.push(textRef.current);
    setCanUndo(true);
    setCanRedo(redoStackRef.current.length > 0);
    setSelection(null);
    emit(next);
  }, [emit]);

  // Keyboard: Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y redo.
  // Skipped while typing inside the text editor or inline inputs so
  // text-level undo keeps working natively.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if (key === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  // ── Text editor wiring (Text / Split panes) ───────────────────────────

  const handleTextChange = useCallback(
    (next: string) => {
      lastEmittedRef.current = next;
      setText(next);
      onContentChange(next);
    },
    [onContentChange],
  );

  // ── Diagram-type template picker ──────────────────────────────────────

  const applyTemplate = useCallback(
    (type: DiagramType) => {
      const template = DIAGRAM_TEMPLATES[type];
      undoStackRef.current.push(textRef.current);
      if (undoStackRef.current.length > MAX_HISTORY) undoStackRef.current.shift();
      redoStackRef.current = [];
      setCanUndo(true);
      setCanRedo(false);
      setSelection(null);
      setConfirmType(null);
      emit(template);
    },
    [emit],
  );

  const handleTypeSelect = useCallback(
    (type: DiagramType) => {
      if (isEmpty) {
        applyTemplate(type);
        return;
      }
      if (type === diagramType) return;
      setConfirmType(type);
    },
    [isEmpty, diagramType, applyTemplate],
  );

  // ── Visual / Layout mutation handlers ─────────────────────────────────

  const handleRenameNode = useCallback(
    (id: string, label: string) => {
      applyMutation(setNodeLabel(doc, id, label));
    },
    [doc, applyMutation],
  );

  const handleDeleteNode = useCallback(
    (id: string) => {
      const result = deleteNode(doc, id);
      // ";;" noise guard is unnecessary — deleteNode returns a clean doc.
      applyMutation(result);
    },
    [doc, applyMutation],
  );

  const handleAddNode = useCallback(() => {
    const id = nextNodeId(doc);
    applyMutation(flowAddNode(doc, id, "New node"));
  }, [doc, applyMutation]);

  const handleAddEdge = useCallback(
    (from: string, to: string) => {
      applyMutation(flowAddEdge(doc, from, to, null));
    },
    [doc, applyMutation],
  );

  const handleDeleteEdge = useCallback(
    (edge: FlowEdgeInfo) => {
      applyMutation(flowDeleteEdge(doc, edge));
    },
    [doc, applyMutation],
  );

  const handleSetEdgeLabel = useCallback(
    (edge: FlowEdgeInfo, label: string) => {
      applyMutation(flowSetEdgeLabel(doc, edge, label));
    },
    [doc, applyMutation],
  );

  const handlePositionsChange = useCallback(
    (positions: Record<string, [number, number]>) => {
      applyMutation(setPositions(doc, positions));
    },
    [doc, applyMutation],
  );

  // Layout read-only / edit canvases share this geometry.
  const canvasPositions: Record<string, [number, number]> = useMemo(() => {
    if (hasLayout && doc.layout) return doc.layout.positions;
    return autoArrange(doc, NODE_W + 120, NODE_H + 110);
  }, [doc, hasLayout]);

  const handleSelect = useCallback((sel: AnySelection | null) => {
    setSelection(sel);
  }, []);

  // ── Confirm-replace popover ───────────────────────────────────────────

  const confirmTypeLabel =
    confirmType !== null
      ? DIAGRAM_TYPES.find((d) => d.key === confirmType)?.label ?? confirmType
      : "";

  // ── Render ────────────────────────────────────────────────────────────

  const editorLanguage = "mermaid";

  const renderTextEditor = (fill: boolean) => (
    <div className={fill ? "flex-1 min-h-0" : "w-1/2 min-w-0"}>
      {useCodeMirror ? (
        <CodeMirrorEditor
          content={text}
          onChange={handleTextChange}
          language={editorLanguage}
          fontSize={cmFontSize}
          tabSize={cmTabSize}
          wordWrap
        />
      ) : (
        <LCCodeMonacoEditor
          fileKey={`mermaid-${fileName}`}
          content={text}
          onChange={handleTextChange}
          language={editorLanguage}
          wordWrap
          fontSize={cmFontSize}
          tabSize={cmTabSize}
          onSave={onSave}
        />
      )}
    </div>
  );

  const renderPreview = () => (
    <div className="flex-1 min-h-0 overflow-auto bg-[#1e1e1e] p-3">
      <MermaidRenderer chart={stripLayoutLine(text)} />
    </div>
  );

  const renderViewPane = () => {
    // WYSIWYG: positioned canvas when a flowchart carries layout metadata.
    if (isFlowchart && hasLayout && doc.layout) {
      return (
        <LayoutCanvas
          doc={doc}
          positions={doc.layout.positions}
          readOnly
          selection={null}
          onSelect={handleSelect}
        />
      );
    }
    return renderPreview();
  };

  const renderEditPane = () => {
    if (isEmpty) {
      return (
        <div className="flex flex-col items-center justify-center flex-1 gap-3">
          <Workflow className="w-12 h-12 text-[#333333]" />
          <p className="text-xs text-[#858585]">This mermaid file is empty</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => applyTemplate("flowchart")}
              className="flex items-center gap-1.5 text-xs h-7 px-3 rounded bg-[#e5c07b] text-[#1e1e1e] font-medium hover:bg-[#d4a84b] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Start a flowchart
            </button>
          </div>
        </div>
      );
    }

    // Visual / Layout are flowchart-only; fall back to split otherwise.
    const pane: EditPane =
      (editPane === "visual" || editPane === "layout") && !isFlowchart
        ? "split"
        : editPane;

    switch (pane) {
      case "text":
        return renderTextEditor(true);
      case "split":
        return (
          <div className="flex-1 min-h-0 flex flex-row">
            <div className="w-1/2 min-w-0 border-r border-[#333333]">
              {renderTextEditor(true)}
            </div>
            <div className="flex-1 min-w-0">{renderPreview()}</div>
          </div>
        );
      case "visual":
        return (
          <MermaidVisualEditor
            content={stripLayoutLine(text)}
            doc={doc}
            selection={selection as VisualSelection | null}
            onSelect={handleSelect}
            onRenameNode={handleRenameNode}
            onDeleteNode={handleDeleteNode}
            onAddNode={handleAddNode}
            onAddEdge={handleAddEdge}
            onDeleteEdge={handleDeleteEdge}
            onSetEdgeLabel={handleSetEdgeLabel}
          />
        );
      case "layout":
        return (
          <LayoutCanvas
            doc={doc}
            positions={canvasPositions}
            readOnly={false}
            selection={selection as LayoutSelection | null}
            onSelect={handleSelect}
            onPositionsChange={handlePositionsChange}
            onRequestAddEdge={handleAddEdge}
            onRequestEditEdge={(edge, label) => {
              if (label !== (edge.label ?? "")) {
                handleSetEdgeLabel(edge, label);
              }
            }}
            onRequestEditNode={(id, label) => {
              if (label !== doc.nodes.get(id)?.label) {
                handleRenameNode(id, label);
              }
            }}
            onRequestDeleteSelection={() => {
              if (selection?.type === "node") {
                handleDeleteNode(selection.key);
              } else if (selection?.type === "edge") {
                const edge = doc.edges.find((k) => edgeKey(k) === selection.key);
                if (edge) handleDeleteEdge(edge);
              }
            }}
          />
        );
      default:
        return renderTextEditor(true);
    }
  };

  const statusHint =
    mode === "view"
      ? "Edits are saved to the file automatically"
      : doc.isFlowchart
        ? "Ctrl+Z undo · Ctrl+Shift+Z redo · Escape cancels inline edits"
        : "Text and split only — visual editing supports flowcharts";

  return (
    <div className="relative flex flex-col flex-1 min-h-0 bg-[#1e1e1e]">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 h-9 border-b border-[#333333] bg-[#252526] shrink-0">
        <GitBranch className="w-3.5 h-3.5 text-[#e5c07b]" />
        <span className="text-xs text-[#d4d4d4] truncate max-w-[180px]">
          {fileName || "Untitled.mermaid"}
        </span>

        {/* Diagram type template picker */}
        <div className="relative">
          <select
            value={diagramType}
            onChange={(e) => handleTypeSelect(e.target.value as DiagramType)}
            className="text-[11px] h-6 px-2 rounded border border-[#444444] bg-[#2d2d2d] text-[#d4d4d4] outline-none hover:border-[#e5c07b]/50 transition-colors"
            title="Diagram type template (replaces content when file is non-empty)"
          >
            {DIAGRAM_TYPES.map((d) => (
              <option key={d.key} value={d.key}>
                {d.label}
              </option>
            ))}
          </select>
          {diagramType !== "flowchart" && !isEmpty && (
            <span className="absolute -top-1.5 -right-1.5 w-2 h-2 rounded-full bg-[#e5c07b]" title="Non-flowchart diagram" />
          )}
        </div>

        {/* Undo / Redo + pane switcher (edit mode) */}
        {mode === "edit" && (
          <>
            <button
              onClick={undo}
              disabled={!canUndo}
              className="flex items-center gap-1 text-xs h-6 px-2 rounded border border-[#444444] text-[#858585] hover:text-white hover:border-[#e5c07b]/50 transition-colors disabled:opacity-40 disabled:hover:text-[#858585] disabled:hover:border-[#444444] disabled:cursor-not-allowed"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-3 h-3" />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className="flex items-center gap-1 text-xs h-6 px-2 rounded border border-[#444444] text-[#858585] hover:text-white hover:border-[#e5c07b]/50 transition-colors disabled:opacity-40 disabled:hover:text-[#858585] disabled:hover:border-[#444444] disabled:cursor-not-allowed"
              title="Redo (Ctrl+Shift+Z / Ctrl+Y)"
            >
              <Redo2 className="w-3 h-3" />
            </button>
            <div className="w-px h-5 bg-[#333333] mx-1" />
            <div className="flex items-center gap-1">
              {PANE_BUTTONS.map((p) => {
                const Icon = p.icon;
                const disabled = (p.key === "visual" || p.key === "layout") && !isFlowchart;
                const active = editPane === p.key;
                return (
                  <button
                    key={p.key}
                    onClick={() => {
                      if (disabled) return;
                      setEditPane(p.key);
                    }}
                    disabled={disabled}
                    title={disabled ? "Visual editing supports flowcharts only" : p.title}
                    className={`flex items-center gap-1 text-xs h-6 px-2 rounded transition-colors ${
                      active
                        ? "bg-[#e5c07b] text-[#1e1e1e]"
                        : "text-[#858585] hover:text-white hover:bg-[#333333]"
                    } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                  >
                    <Icon className="w-3 h-3" />
                    <span className="hidden lg:inline">{p.label}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        <div className="flex-1" />

        {/* View | Edit segmented control */}
        <div className="flex items-center gap-1 bg-[#1e1e1e] rounded-md p-0.5">
          <button
            onClick={() => {
              setMode("view");
              void lcDB.setSetting("mermaid.lastMode", "view");
            }}
            className={`text-xs h-6 px-2 rounded-md flex items-center gap-1 transition-colors ${
              mode === "view"
                ? "bg-[#e5c07b] text-[#1e1e1e]"
                : "text-[#858585] hover:text-white hover:bg-[#333333]"
            }`}
            title="View rendered diagram"
          >
            <Eye className="w-3 h-3" />
            <span className="hidden sm:inline">View</span>
          </button>
          <button
            onClick={() => {
              setMode("edit");
              void lcDB.setSetting("mermaid.lastMode", "edit");
            }}
            className={`text-xs h-6 px-2 rounded-md flex items-center gap-1 transition-colors ${
              mode === "edit"
                ? "bg-[#e5c07b] text-[#1e1e1e]"
                : "text-[#858585] hover:text-white hover:bg-[#333333]"
            }`}
            title="Edit the diagram"
          >
            <Pencil className="w-3 h-3" />
            <span className="hidden sm:inline">Edit</span>
          </button>
        </div>
      </div>

      {/* Edit-mode: second toolbar row for status/hints is the status bar below */}

      {/* Confirm-replace popover */}
      {confirmType !== null && (
        <div className="absolute top-12 right-4 z-50 min-w-[260px] bg-[#2d2d2d] border border-[#444444] rounded-md shadow-xl p-3">
          <p className="text-xs text-[#d4d4d4] mb-2">
            Replace the entire file with a {confirmTypeLabel} template?
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => applyTemplate(confirmType)}
              className="flex items-center gap-1.5 text-xs h-7 px-3 rounded bg-[#e5c07b] text-[#1e1e1e] font-medium hover:bg-[#d4a84b] transition-colors"
            >
              <Check className="w-3 h-3" />
              Replace
            </button>
            <button
              onClick={() => setConfirmType(null)}
              className="flex items-center gap-1.5 text-xs h-7 px-3 rounded border border-[#444444] text-[#858585] hover:text-white hover:bg-[#333333] transition-colors"
            >
              <X className="w-3 h-3" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="relative flex-1 min-h-0 flex flex-col">
        {mode === "view" ? renderViewPane() : renderEditPane()}
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-3 px-3 h-6 border-t border-[#333333] bg-[#252526] shrink-0">
        <span className="text-[10px] text-[#858585]">
          {lastSavedAt
            ? `Saved ${lastSavedAt.toLocaleTimeString()}`
            : "Edits are saved to the file automatically"}
        </span>
        <span className="flex-1" />
        {hasLayout && isFlowchart && (
          <span className="text-[10px] text-[#e5c07b] whitespace-nowrap">
            <Layers className="w-3 h-3 inline mr-0.5" />
            custom layout saved
          </span>
        )}
        <span className="text-[10px] text-[#555555] whitespace-nowrap">
          {statusHint}
        </span>
      </div>
    </div>
  );
}