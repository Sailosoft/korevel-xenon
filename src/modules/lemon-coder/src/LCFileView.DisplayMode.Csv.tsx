// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — LCFileView.DisplayMode.Csv
//
// Excel-like CSV editor. Renders the CSV file as a spreadsheet grid with:
//   • Column letters (A, B, C…) and row numbers (1, 2, 3…)
//   • An edit button on every cell (pencil icon, revealed on hover)
//   • Inline cell editing (Enter commits, Esc cancels, Tab moves to next cell)
//   • Add / delete rows and columns, insert rows above/below
//   • Undo / redo (Ctrl+Z / Ctrl+Shift+Z) with up to 50 steps of history
//   • Live serialization back to CSV — every commit is reflected in the file
//     content (onContentChange) and persisted to disk (onSave)
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Pencil,
  Save,
  Plus,
  Trash2,
  Table2,
  FileSpreadsheet,
  ArrowUp,
  ArrowDown,
  Undo2,
  Redo2,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

export interface LCFileViewDisplayModeCsvProps {
  /** Raw CSV file content */
  content: string;
  /** Called with the new serialized CSV whenever a cell is committed */
  onContentChange: (content: string) => void;
  /** Persist the current content to disk */
  onSave: () => void;
  /** File name shown in the toolbar */
  fileName?: string;
}

interface CellPosition {
  row: number;
  col: number;
}

// ── CSV parsing / serialization ──────────────────────────────────────────────

/**
 * Parse CSV text (RFC 4180-ish) into a 2D array of strings.
 * Handles quoted fields, escaped quotes (""), commas and newlines inside
 * quoted fields, and both LF and CRLF line endings.
 */
export function parseCsv(raw: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < raw.length; i++) {
    const char = raw[i];

    if (inQuotes) {
      if (char === '"') {
        if (raw[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      if (char === "\r" && raw[i + 1] === "\n") i++;
    } else {
      field += char;
    }
  }

  // Flush the final field / row
  row.push(field);
  rows.push(row);

  // Drop trailing empty rows (e.g. a final newline)
  while (rows.length > 0 && rows[rows.length - 1].every((c) => c === "")) {
    rows.pop();
  }

  return rows;
}

/**
 * Serialize a 2D array back to CSV text. Fields containing commas, quotes,
 * or newlines are wrapped in double quotes with "" escaping.
 */
export function serializeCsv(rows: string[][]): string {
  return rows.map((row) => row.map(escapeCsvField).join(",")).join("\n");
}

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Excel-style column letters: 0 → A, 25 → Z, 26 → AA, … */
export function getColumnLetter(index: number): string {
  let n = index + 1;
  let result = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

// ── Theme constants (Lemon Coder dark palette) ───────────────────────────────

const COLORS = {
  bg: "#1e1e1e",
  headerBg: "#2d2d2d",
  headerText: "#e5c07b",
  rowNumberBg: "#252526",
  rowNumberText: "#858585",
  border: "#333333",
  cellText: "#d4d4d4",
  altRowBg: "#1a1a1a",
  accent: "#e5c07b",
  muted: "#858585",
  danger: "#e06c75",
};

/** Maximum number of undo steps retained (at least 5 required, 50 kept). */
const MAX_HISTORY = 50;

// ── Component ────────────────────────────────────────────────────────────────

export default function LCFileViewDisplayModeCsv({
  content,
  onContentChange,
  onSave,
  fileName,
}: LCFileViewDisplayModeCsvProps) {
  // ── Grid state ──────────────────────────────────────────────────────────
  const [grid, setGrid] = useState<string[][]>(() => parseCsv(content));
  const [editing, setEditing] = useState<CellPosition | null>(null);
  const [draft, setDraft] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Refs to avoid stale closures
  const gridRef = useRef(grid);
  const editingRef = useRef<CellPosition | null>(null);
  const lastEmittedRef = useRef(content);
  const undoStackRef = useRef<string[][][]>([]);
  const redoStackRef = useRef<string[][][]>([]);

  useEffect(() => {
    gridRef.current = grid;
  }, [grid]);

  // Re-parse when the content changes externally (e.g. edits in Source mode)
  useEffect(() => {
    if (content !== lastEmittedRef.current) {
      setGrid(parseCsv(content));
      lastEmittedRef.current = content;
      editingRef.current = null;
      setEditing(null);
      undoStackRef.current = [];
      redoStackRef.current = [];
      setCanUndo(false);
      setCanRedo(false);
    }
  }, [content]);

  // ── Derived values ──────────────────────────────────────────────────────
  const colCount = useMemo(
    () => Math.max(0, ...grid.map((r) => r.length)),
    [grid],
  );
  const columnLetters = useMemo(
    () => Array.from({ length: colCount }, (_, i) => getColumnLetter(i)),
    [colCount],
  );

  // ── Emit helpers ────────────────────────────────────────────────────────
  const emit = useCallback(
    (next: string[][]) => {
      const csv = serializeCsv(next);
      lastEmittedRef.current = csv;
      onContentChange(csv);
      onSave();
      setLastSavedAt(new Date());
    },
    [onContentChange, onSave],
  );

  // ── Undo / Redo history ─────────────────────────────────────────────────
  const syncHistoryState = useCallback(() => {
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(redoStackRef.current.length > 0);
  }, []);

  /** Apply a grid change, pushing the previous state onto the undo stack */
  const applyChange = useCallback(
    (next: string[][]) => {
      const current = gridRef.current;
      undoStackRef.current.push(current.map((r) => [...r]));
      if (undoStackRef.current.length > MAX_HISTORY) {
        undoStackRef.current.shift();
      }
      redoStackRef.current = [];
      setGrid(next);
      emit(next);
      syncHistoryState();
    },
    [emit, syncHistoryState],
  );

  const undo = useCallback(() => {
    const prev = undoStackRef.current.pop();
    if (!prev) return;
    const current = gridRef.current;
    redoStackRef.current.push(current.map((r) => [...r]));
    setGrid(prev);
    emit(prev);
    syncHistoryState();
  }, [emit, syncHistoryState]);

  const redo = useCallback(() => {
    const next = redoStackRef.current.pop();
    if (!next) return;
    const current = gridRef.current;
    undoStackRef.current.push(current.map((r) => [...r]));
    setGrid(next);
    emit(next);
    syncHistoryState();
  }, [emit, syncHistoryState]);

  // Keyboard shortcuts: Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y redo.
  // Skipped while typing inside the cell editor so text-level undo still works.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA")
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

  // ── Cell editing ────────────────────────────────────────────────────────
  const startEdit = useCallback((row: number, col: number) => {
    editingRef.current = { row, col };
    setEditing({ row, col });
    setDraft(gridRef.current[row]?.[col] ?? "");
  }, []);

  const commitEdit = useCallback(
    (pos: CellPosition, value: string) => {
      const current = editingRef.current;
      // Guard against stale blur events (e.g. after Enter/Tab/Escape already
      // committed or moved to a different cell).
      if (!current || current.row !== pos.row || current.col !== pos.col) return;
      editingRef.current = null;
      setEditing(null);

      const { row, col } = pos;
      const prev = gridRef.current;
      const next = prev.map((r, ri) => {
        if (ri !== row) return r;
        // Ensure the edited cell exists (rows may be ragged)
        const padded = Array.from(
          { length: Math.max(r.length, col + 1) },
          (_, i) => r[i] ?? "",
        );
        padded[col] = value;
        return padded;
      });
      applyChange(next);
    },
    [applyChange],
  );

  const cancelEdit = useCallback(() => {
    editingRef.current = null;
    setEditing(null);
  }, []);

  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const pos = editingRef.current;
        if (pos) {
          commitEdit(pos, draft);
          if (e.key === "Tab") {
            const maxCols = Math.max(...gridRef.current.map((r) => r.length));
            if (pos.col + 1 < maxCols) {
              startEdit(pos.row, pos.col + 1);
            } else if (pos.row + 1 < gridRef.current.length) {
              startEdit(pos.row + 1, 0);
            }
          }
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancelEdit();
      }
    },
    [draft, commitEdit, cancelEdit, startEdit],
  );

  // ── Row / column operations ─────────────────────────────────────────────
  const addRow = useCallback(() => {
    const prev = gridRef.current;
    const cols = Math.max(1, ...prev.map((r) => r.length));
    const next = [...prev, Array.from({ length: cols }, () => "")];
    applyChange(next);
  }, [applyChange]);

  /** Insert a new empty row above or below a specific row index */
  const insertRow = useCallback(
    (rowIdx: number, position: "above" | "below") => {
      const prev = gridRef.current;
      const cols = Math.max(1, ...prev.map((r) => r.length));
      const newRow = Array.from({ length: cols }, () => "");
      const insertAt = position === "above" ? rowIdx : rowIdx + 1;
      const next = [
        ...prev.slice(0, insertAt),
        newRow,
        ...prev.slice(insertAt),
      ];
      applyChange(next);
    },
    [applyChange],
  );

  const addColumn = useCallback(() => {
    const prev = gridRef.current;
    const next = prev.map((r) => [...r, ""]);
    applyChange(next);
  }, [applyChange]);

  const deleteRow = useCallback(
    (rowIdx: number) => {
      const prev = gridRef.current;
      if (prev.length <= 1) return; // keep at least the header row
      const next = prev.filter((_, ri) => ri !== rowIdx);
      applyChange(next);
    },
    [applyChange],
  );

  const deleteColumn = useCallback(
    (colIdx: number) => {
      const prev = gridRef.current;
      const maxCols = Math.max(...prev.map((r) => r.length));
      if (maxCols <= 1) return; // keep at least one column
      const next = prev.map((r) => r.filter((_, ci) => ci !== colIdx));
      applyChange(next);
    },
    [applyChange],
  );

  // ── Render ──────────────────────────────────────────────────────────────
  const rowCount = grid.length;

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-[#1e1e1e]">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 h-9 border-b border-[#333333] bg-[#252526] shrink-0">
        <FileSpreadsheet className="w-3.5 h-3.5 text-[#e5c07b]" />
        <span className="text-xs text-[#d4d4d4] truncate max-w-[200px]">
          {fileName || "Untitled.csv"}
        </span>
        <span className="text-[10px] text-[#858585] bg-[#2d2d2d] border border-[#444444] rounded-full px-2 py-0.5 whitespace-nowrap">
          {rowCount} row{rowCount === 1 ? "" : "s"} × {colCount} col
          {colCount === 1 ? "" : "s"}
        </span>
        <div className="flex-1" />
        <button
          onClick={undo}
          disabled={!canUndo}
          className="flex items-center gap-1 text-xs h-6 px-2 rounded border border-[#444444] text-[#858585] hover:text-white hover:border-[#e5c07b]/50 transition-colors disabled:opacity-40 disabled:hover:text-[#858585] disabled:hover:border-[#444444] disabled:cursor-not-allowed"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-3 h-3" />
          <span className="hidden sm:inline">Undo</span>
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className="flex items-center gap-1 text-xs h-6 px-2 rounded border border-[#444444] text-[#858585] hover:text-white hover:border-[#e5c07b]/50 transition-colors disabled:opacity-40 disabled:hover:text-[#858585] disabled:hover:border-[#444444] disabled:cursor-not-allowed"
          title="Redo (Ctrl+Shift+Z / Ctrl+Y)"
        >
          <Redo2 className="w-3 h-3" />
          <span className="hidden sm:inline">Redo</span>
        </button>
        <button
          onClick={addRow}
          className="flex items-center gap-1 text-xs h-6 px-2 rounded border border-[#444444] text-[#858585] hover:text-white hover:border-[#e5c07b]/50 transition-colors"
          title="Add row"
        >
          <Plus className="w-3 h-3" />
          <span className="hidden sm:inline">Row</span>
        </button>
        <button
          onClick={addColumn}
          className="flex items-center gap-1 text-xs h-6 px-2 rounded border border-[#444444] text-[#858585] hover:text-white hover:border-[#e5c07b]/50 transition-colors"
          title="Add column"
        >
          <Plus className="w-3 h-3" />
          <span className="hidden sm:inline">Column</span>
        </button>
        {/* <button
          onClick={onSave}
          className="flex items-center gap-1.5 text-xs h-7 px-3 rounded bg-[#e5c07b] text-[#1e1e1e] font-medium hover:bg-[#d4a84b] transition-colors"
          title="Save file (Ctrl+S)"
        >
          <Save className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Save</span>
        </button> */}
      </div>

      {/* Grid */}
      {rowCount === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-3">
          <Table2 className="w-12 h-12 text-[#333333]" />
          <p className="text-xs text-[#858585]">This CSV file is empty</p>
          <button
            onClick={addRow}
            className="flex items-center gap-1.5 text-xs h-7 px-3 rounded bg-[#e5c07b] text-[#1e1e1e] font-medium hover:bg-[#d4a84b] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add first row
          </button>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="border-collapse" style={{ minWidth: "100%" }}>
            <thead>
              <tr>
                {/* Corner cell */}
                <th
                  style={{
                    position: "sticky",
                    top: 0,
                    left: 0,
                    zIndex: 3,
                    minWidth: 76,
                    width: 76,
                    background: COLORS.rowNumberBg,
                    border: `1px solid ${COLORS.border}`,
                    padding: 0,
                  }}
                >
                  <div className="flex items-center justify-center h-7 text-[10px] text-[#555555] select-none">
                    #
                  </div>
                </th>
                {columnLetters.map((letter, ci) => (
                  <th
                    key={ci}
                    style={{
                      position: "sticky",
                      top: 0,
                      zIndex: 2,
                      minWidth: 120,
                      background: COLORS.rowNumberBg,
                      border: `1px solid ${COLORS.border}`,
                      padding: 0,
                    }}
                  >
                    <div className="group flex items-center justify-between h-7 px-2">
                      <span className="text-[10px] font-semibold text-[#858585] select-none">
                        {letter}
                      </span>
                      <button
                        onClick={() => deleteColumn(ci)}
                        title="Delete column"
                        className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-4 h-4 rounded text-[#858585] hover:text-[#e06c75] hover:bg-[#3c3c3c] transition-all"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </th>
                ))}
                {/* Add column button */}
                <th
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 2,
                    minWidth: 36,
                    width: 36,
                    background: COLORS.rowNumberBg,
                    border: `1px solid ${COLORS.border}`,
                    padding: 0,
                  }}
                >
                  <button
                    onClick={addColumn}
                    title="Add column"
                    className="flex items-center justify-center w-full h-7 text-[#858585] hover:text-[#e5c07b] hover:bg-[#3c3c3c] transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {grid.map((row, ri) => {
                const isHeader = ri === 0;
                return (
                  <tr
                    key={ri}
                    style={{
                      background: isHeader
                        ? COLORS.headerBg
                        : ri % 2 === 0
                          ? "transparent"
                          : COLORS.altRowBg,
                    }}
                  >
                    {/* Row number */}
                    <td
                      style={{
                        position: "sticky",
                        left: 0,
                        zIndex: 1,
                        minWidth: 76,
                        width: 76,
                        background: COLORS.rowNumberBg,
                        border: `1px solid ${COLORS.border}`,
                        padding: 0,
                      }}
                    >
                      <div className="group flex items-center justify-between h-7 px-1">
                        <span className="text-[10px] text-[#858585] select-none">
                          {ri + 1}
                        </span>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                          <button
                            onClick={() => insertRow(ri, "above")}
                            title="Insert row above"
                            className="flex items-center justify-center w-4 h-4 rounded text-[#858585] hover:text-[#e5c07b] hover:bg-[#3c3c3c] transition-colors"
                          >
                            <ArrowUp className="w-2.5 h-2.5" />
                          </button>
                          <button
                            onClick={() => insertRow(ri, "below")}
                            title="Insert row below"
                            className="flex items-center justify-center w-4 h-4 rounded text-[#858585] hover:text-[#e5c07b] hover:bg-[#3c3c3c] transition-colors"
                          >
                            <ArrowDown className="w-2.5 h-2.5" />
                          </button>
                          <button
                            onClick={() => deleteRow(ri)}
                            title="Delete row"
                            className="flex items-center justify-center w-4 h-4 rounded text-[#858585] hover:text-[#e06c75] hover:bg-[#3c3c3c] transition-colors"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Cells */}
                    {Array.from({ length: colCount }).map((_, ci) => {
                      const value = row[ci] ?? "";
                      const isEditing =
                        editing?.row === ri && editing?.col === ci;
                      return (
                        <td
                          key={ci}
                          className="group"
                          style={{
                            minWidth: 120,
                            maxWidth: 240,
                            height: 28,
                            border: `1px solid ${COLORS.border}`,
                            padding: isEditing ? 0 : "0 0.5rem",
                            color: isHeader ? COLORS.headerText : COLORS.cellText,
                            fontWeight: isHeader ? 600 : 400,
                            background: isEditing ? COLORS.bg : "transparent",
                            boxShadow: isEditing
                              ? `inset 0 0 0 1px ${COLORS.accent}`
                              : undefined,
                          }}
                        >
                          {isEditing ? (
                            <input
                              autoFocus
                              value={draft}
                              onChange={(e) => setDraft(e.target.value)}
                              onKeyDown={handleEditKeyDown}
                              onBlur={() => commitEdit({ row: ri, col: ci }, draft)}
                              style={{
                                width: "100%",
                                height: "100%",
                                minHeight: 28,
                                background: "transparent",
                                color: COLORS.accent,
                                border: "none",
                                outline: "none",
                                padding: "0 0.5rem",
                                fontSize: "0.8rem",
                                fontFamily:
                                  '"JetBrains Mono", "Fira Code", monospace',
                                boxSizing: "border-box",
                              }}
                            />
                          ) : (
                            <div
                              className="flex items-center justify-between gap-1 h-full w-full cursor-cell"
                              onDoubleClick={() => startEdit(ri, ci)}
                              title="Double-click to edit"
                            >
                              <span
                                className="truncate text-[0.8rem] leading-7"
                                style={{
                                  fontFamily:
                                    '"JetBrains Mono", "Fira Code", monospace',
                                }}
                              >
                                {value}
                              </span>
                              <button
                                onClick={() => startEdit(ri, ci)}
                                title="Edit cell"
                                className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-5 h-5 shrink-0 rounded text-[#858585] hover:text-[#e5c07b] hover:bg-[#3c3c3c] transition-all"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Status bar */}
      <div className="flex items-center gap-3 px-3 h-6 border-t border-[#333333] bg-[#252526] shrink-0">
        <span className="text-[10px] text-[#858585]">
          {lastSavedAt
            ? `Saved ${lastSavedAt.toLocaleTimeString()}`
            : "Edits are saved to the file automatically"}
        </span>
        <span className="flex-1" />
        <span className="text-[10px] text-[#555555] whitespace-nowrap">
          Enter commit · Esc cancel · Tab next · Ctrl+Z undo · Ctrl+Shift+Z redo
        </span>
      </div>
    </div>
  );
}