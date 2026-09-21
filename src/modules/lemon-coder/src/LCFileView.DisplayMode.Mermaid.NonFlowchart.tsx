// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — Mermaid Non-Flowchart Editor
//
// A dedicated editor mechanism for non-flowchart diagram types (sequence, class,
// state, ER, gantt, pie, journey, mindmap, timeline). Unlike the flowchart
// canvas, editing is driven by the structured element list instead of canvas
// node boxes: rename / add / delete happen through the list, while the right
// side shows a simplified custom preview of the elements and their connections
// with drag-to-reposition, zoom and pan.
//
// All mutations funnel through the parent's generic helpers (renameTextToken,
// addGenericElement, deleteTextTokenLine), so the source text stays canonical.
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2, Pencil, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import {
  type FlowDocument,
  type FlowEdgeInfo,
  edgeKey,
  autoArrange,
} from "./LCFileView.DisplayMode.Mermaid.Flow";
import { type LayoutSelection, NODE_W, NODE_H } from "./LCFileView.DisplayMode.Mermaid.Layout";
import GanttCanvas from "./LCFileView.DisplayMode.Mermaid.Gantt";
import SequenceCanvas from "./LCFileView.DisplayMode.Mermaid.Sequence";
import ErdCanvas from "./LCFileView.DisplayMode.Mermaid.ERD";
import ClassCanvas from "./LCFileView.DisplayMode.Mermaid.Class";
import JourneyCanvas from "./LCFileView.DisplayMode.Mermaid.Journey";

export interface MermaidNonFlowchartEditorProps {
  diagramType: string;
  doc: FlowDocument;
  selection: LayoutSelection | null;
  onSelect: (sel: LayoutSelection | null) => void;
  onRenameNode: (id: string, label: string) => void;
  onDeleteNode: (id: string) => void;
  onAddNode: () => void;
  onRequestDeleteSelection: () => void;
  onRequestEditEdge?: (edge: FlowEdgeInfo, label: string) => void;
  /** Journey: persist drag (level = score, order = position). */
  onUpdateJourney?: (name: string, score: number, toIndex: number) => void;
  /** Gantt: persist an edited start date / day count. */
  onUpdateGantt?: (name: string, startIso: string, days: number) => void;
}

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;

export default function MermaidNonFlowchartEditor({
  diagramType,
  doc,
  selection,
  onSelect,
  onRenameNode,
  onDeleteNode,
  onAddNode,
  onRequestDeleteSelection,
  onRequestEditEdge,
  onUpdateJourney,
  onUpdateGantt,
}: MermaidNonFlowchartEditorProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState("");
  const [editingEdge, setEditingEdge] = useState<FlowEdgeInfo | null>(null);
  const [edgeDraft, setEdgeDraft] = useState("");

  // Visual editor: positions are always automatic.
  const autoPositions = useMemo(
    () => autoArrange(doc, NODE_W + 120, NODE_H + 110),
    [doc],
  );

  const dragRef = useRef<{
    startX: number;
    startY: number;
    panX: number;
    panY: number;
  } | null>(null);

  const beginPan = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        panX: pan.x,
        panY: pan.y,
      };
      setIsPanning(true);
    },
    [pan],
  );

  const selectElement = useCallback(
    (e: React.PointerEvent, id: string) => {
      e.stopPropagation();
      onSelect({ type: "node", key: id });
    },
    [onSelect],
  );

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const st = dragRef.current;
    if (!st) return;
    setPan({
      x: st.panX + (e.clientX - st.startX),
      y: st.panY + (e.clientY - st.startY),
    });
  }, []);

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
    setIsPanning(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((prev) =>
      Math.min(
        Math.max(prev + (e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP), MIN_ZOOM),
        MAX_ZOOM,
      ),
    );
  }, []);
  const zoomIn = useCallback(() => setZoom((p) => Math.min(p + ZOOM_STEP, MAX_ZOOM)), []);
  const zoomOut = useCallback(() => setZoom((p) => Math.max(p - ZOOM_STEP, MIN_ZOOM)), []);
  const fitToView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Delete key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      ) {
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selection) {
          e.preventDefault();
          onRequestDeleteSelection();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selection, onRequestDeleteSelection]);

  // Element list
  const elementRows = useMemo(
    () =>
      doc.nodesOrdered.map((id) => ({
        id,
        label: doc.nodes.get(id)?.label ?? id,
      })),
    [doc],
  );

  const commitRename = useCallback(() => {
    if (!editingId) return;
    const next = editingDraft.trim();
    setEditingId(null);
    if (next) onRenameNode(editingId, next);
  }, [editingId, editingDraft, onRenameNode]);

  // Edge connections (screen-space lines between element boxes)
  const edgeLines = useMemo(() => {
    const box = (id: string) => {
      const pos = autoPositions[id] ?? [0, 0];
      return { x: pos[0], y: pos[1], w: NODE_W, h: NODE_H };
    };
    return doc.edges.flatMap((edge) => {
      const a = box(edge.from);
      const b = box(edge.to);
      const aCx = a.x + a.w / 2;
      const aCy = a.y + a.h / 2;
      const bCx = b.x + b.w / 2;
      const bCy = b.y + b.h / 2;
      const horiz = Math.abs(bCx - aCx) >= Math.abs(bCy - aCy);
      const x1 = horiz
        ? bCx >= aCx
          ? a.x + a.w
          : a.x
        : aCx;
      const y1 = horiz
        ? aCy
        : bCy >= aCy
          ? a.y + a.h
          : a.y;
      const x2 = horiz
        ? bCx >= aCx
          ? b.x
          : b.x + b.w
        : bCx;
      const y2 = horiz
        ? bCy
        : bCy >= aCy
          ? b.y
          : b.y + b.h;
      return [
        {
          key: edgeKey(edge),
          edge,
          x1,
          y1,
          x2,
          y2,
          isSel:
            selection?.type === "edge" && selection.key === edgeKey(edge),
        },
      ];
    });
  }, [doc, autoPositions, selection]);

  const commitEdge = useCallback(() => {
    if (!editingEdge) return;
    if (onRequestEditEdge) {
      const next = edgeDraft.trim();
      if (next !== editingEdge.label) onRequestEditEdge(editingEdge, next || "");
    }
    setEditingEdge(null);
  }, [editingEdge, edgeDraft, onRequestEditEdge]);

  return (
    <div className="flex flex-1 min-h-0 bg-[#1e1e1e]">
      {/* ── Element list (the non-flowchart editing mechanism) ── */}
      <div className="w-60 min-w-[200px] shrink-0 border-r border-[#333333] bg-[#252526] flex flex-col">
        <div className="px-3 py-2 border-b border-[#333333]">
          <p className="text-[10px] uppercase tracking-wider text-[#858585] mb-1">
            {diagramType} elements
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onAddNode}
              className="flex-1 flex items-center justify-center gap-1 text-[11px] h-6 px-2 rounded bg-[#e5c07b] text-[#1e1e1e] font-medium hover:bg-[#d4a84b] transition-colors"
              title="Add an element"
            >
              <Plus className="w-3 h-3" />
              Add
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto py-1">
          {elementRows.length === 0 && (
            <p className="px-3 py-2 text-[11px] text-[#858585]">
              No elements found in this diagram.
            </p>
          )}
          {elementRows.map((row, idx) => {
            const sel = selection?.type === "node" && selection.key === row.id;
            return (
              <div
                key={row.id}
                onClick={() => onSelect({ type: "node", key: row.id })}
                className={`group flex items-center gap-1 px-2 h-7 cursor-pointer border-l-2 transition-colors ${
                  sel
                    ? "border-[#e5c07b] bg-[#2d2d2d]"
                    : "border-transparent hover:bg-[#2d2d2d]"
                }`}
              >
                <span className="text-[10px] text-[#555555] w-4 shrink-0">
                  {idx + 1}
                </span>
                {editingId === row.id ? (
                  <input
                    autoFocus
                    value={editingDraft}
                    onChange={(e) => setEditingDraft(e.target.value)}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === "Enter") {
                        e.preventDefault();
                        commitRename();
                      } else if (e.key === "Escape") {
                        e.preventDefault();
                        setEditingId(null);
                      }
                    }}
                    onBlur={commitRename}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 w-0 h-5 bg-[#1e1e1e] border border-[#e5c07b] text-[#d4d4d4] text-[11px] outline-none px-1 rounded"
                    spellCheck={false}
                  />
                ) : (
                  <span className="flex-1 truncate text-[11px] text-[#d4d4d4]">
                    {row.label}
                  </span>
                )}
                {editingId !== row.id && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(row.id);
                        setEditingDraft(row.label);
                        onSelect({ type: "node", key: row.id });
                      }}
                      className="p-0.5 rounded text-[#858585] hidden group-hover:inline-flex hover:text-[#e5c07b]"
                      title="Rename"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteNode(row.id);
                      }}
                      className="p-0.5 rounded text-[#858585] hidden group-hover:inline-flex hover:text-[#e06c75]"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Preview: dedicated charts per diagram type, generic canvas otherwise ── */}
      {diagramType === "gantt" ? (
        <GanttCanvas
          lines={doc.lines}
          selection={selection}
          onSelect={onSelect}
          onUpdateGantt={onUpdateGantt}
        />
      ) : diagramType === "sequenceDiagram" ? (
        <SequenceCanvas
          lines={doc.lines}
          selection={selection}
          onSelect={onSelect}
        />
      ) : diagramType === "erDiagram" ? (
        <ErdCanvas
          lines={doc.lines}
          selection={selection}
          onSelect={onSelect}
        />
      ) : diagramType === "classDiagram" ? (
        <ClassCanvas
          lines={doc.lines}
          selection={selection}
          onSelect={onSelect}
        />
      ) : diagramType === "journey" ? (
        <JourneyCanvas
          lines={doc.lines}
          selection={selection}
          onSelect={onSelect}
          onUpdateJourney={onUpdateJourney}
        />
      ) : (
      <div
        ref={viewportRef}
        className="relative flex-1 min-h-0 overflow-hidden"
        style={{
          touchAction: "none",
          cursor: isPanning ? "grabbing" : "grab",
          backgroundColor: "#1e1e1e",
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
        onPointerDown={beginPan}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => {
          dragRef.current = null;
          setIsPanning(false);
        }}
        onWheel={handleWheel}
      >
        {/* Zoom controls */}
        <div className="absolute top-2 right-2 z-30 flex items-center gap-0.5 bg-[#252526] border border-[#444444] rounded-md p-0.5">
          <button type="button" onClick={zoomIn} disabled={zoom >= MAX_ZOOM} className="p-1 rounded text-[#858585] hover:text-white hover:bg-[#333333] disabled:opacity-40" title="Zoom in">
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] font-mono text-[#858585] min-w-[38px] text-center select-none">
            {Math.round(zoom * 100)}%
          </span>
          <button type="button" onClick={zoomOut} disabled={zoom <= MIN_ZOOM} className="p-1 rounded text-[#858585] hover:text-white hover:bg-[#333333] disabled:opacity-40" title="Zoom out">
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={fitToView} className="p-1 rounded text-[#858585] hover:text-white hover:bg-[#333333]" title="Reset view">
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* World */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
          }}
        >
          {/* Connection lines */}
          <svg
            className="absolute z-[1] pointer-events-none"
            style={{ left: 0, top: 0, overflow: "visible" }}
          >
            <defs>
              <marker
                id="nf-arrow"
                viewBox="0 0 10 10"
                refX="7"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#555555" />
              </marker>
            </defs>
            {edgeLines.map((l) => (
              <path
                key={l.key}
                d={`M ${l.x1} ${l.y1} C ${(l.x1 + l.x2) / 2} ${l.y1}, ${(l.x1 + l.x2) / 2} ${l.y2}, ${l.x2} ${l.y2}`}
                fill="none"
                stroke={l.isSel ? "#e5c07b" : "#555555"}
                strokeWidth={l.isSel ? 2.5 : 1.5}
                markerEnd="url(#nf-arrow)"
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  if (onRequestEditEdge) {
                    setEditingEdge(l.edge);
                    setEdgeDraft(l.edge.label ?? "");
                  }
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect({ type: "edge", key: l.key });
                }}
                style={{ pointerEvents: "stroke", cursor: "pointer" }}
              />
            ))}
          </svg>

          {/* Edge labels */}
          {edgeLines.map((l) =>
            l.edge.label ? (
              <div
                key={`lbl-${l.key}`}
                className="absolute z-[2] px-2 py-0.5 text-[10px] text-[#d4d4d4] bg-[#1a1a1a] border border-[#333333] rounded-full whitespace-nowrap pointer-events-none"
                style={{
                  left: (l.x1 + l.x2) / 2 - 12,
                  top: (l.y1 + l.y2) / 2 - 10,
                }}
              >
                {l.edge.label}
              </div>
            ) : null,
          )}

          {/* Element boxes */}
          {doc.nodesOrdered.map((id) => {
            const info = doc.nodes.get(id);
            if (!info) return null;
            const pos = autoPositions[id] ?? [0, 0];
            const isSel = selection?.type === "node" && selection.key === id;
            return (
              <div
                key={id}
                onPointerDown={(e) => selectElement(e, id)}
                style={{
                  position: "absolute",
                  left: pos[0],
                  top: pos[1],
                  width: NODE_W,
                  height: NODE_H,
                  background: "#2d2d2d",
                  color: "#d4d4d4",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  padding: "0 10px",
                  textAlign: "center",
                  userSelect: "none",
                  cursor: "pointer",
                  borderRadius: 8,
                  border: `1.5px solid ${isSel ? "#e5c07b" : "#555555"}`,
                  boxShadow: isSel
                    ? "0 0 0 1px #e5c07b, 0 0 10px rgba(229,192,123,0.25)"
                    : "0 1px 3px rgba(0,0,0,0.4)",
                  fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                  transition: "box-shadow 0.15s, border-color 0.15s",
                  boxSizing: "border-box",
                  zIndex: 4,
                }}
              >
                <span className="max-w-full truncate" style={{ textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {info.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Edge label editor */}
        {editingEdge && onRequestEditEdge && (
          <div
            className="absolute z-40 bg-[#1a1a1a] border border-[#e5c07b] rounded-md shadow-xl px-1 py-0.5 flex items-center gap-1"
            style={{
              left: (() => {
                const l = edgeLines.find((x) => x.key === edgeKey(editingEdge));
                return l
                  ? ((l.x1 + l.x2) / 2) * zoom + pan.x - 80
                  : 20;
              })(),
              top: (() => {
                const l = edgeLines.find((x) => x.key === edgeKey(editingEdge));
                return l
                  ? ((l.y1 + l.y2) / 2) * zoom + pan.y - 26
                  : 20;
              })(),
            }}
          >
            <input
              autoFocus
              value={edgeDraft}
              onChange={(e) => setEdgeDraft(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitEdge();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  setEditingEdge(null);
                }
              }}
              onBlur={commitEdge}
              className="w-36 bg-transparent text-[#d4d4d4] text-xs outline-none px-1"
              placeholder="Label"
              spellCheck={false}
            />
            <button
              type="button"
              onClick={commitEdge}
              className="text-[10px] px-1.5 py-0.5 rounded bg-[#333333] text-[#e5c07b] hover:bg-[#444444]"
            >
              OK
            </button>
          </div>
        )}
      </div>
      )}
    </div>
  );
}