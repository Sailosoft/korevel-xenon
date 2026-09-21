// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — Mermaid Layout Canvas
//
// A custom (no-new-dependency) free-position canvas renderer for flowchart
// diagrams. Nodes are absolutely-positioned elements with approximated shapes;
// edges are SVG bezier paths with arrow markers and optional labels. Supports
// pan/zoom, node dragging, edge creation handles, and selection.
//
// Used (read-only) by View mode when `%% lc-layout` metadata is present, and
// (editable) by the Layout edit pane.
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ZoomIn, ZoomOut, Maximize2, MousePointer2 } from "lucide-react";
import {
  type FlowDocument,
  type FlowEdgeInfo,
  type ShapeKind,
  edgeKey,
} from "./LCFileView.DisplayMode.Mermaid.Flow";

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;

export const NODE_W = 170;
export const NODE_H = 62;
const NODE_CORNER = 10;

export interface LayoutSelection {
  type: "node" | "edge";
  key: string;
}

export interface LayoutCanvasProps {
  doc: FlowDocument;
  /** Positions keyed by node id. */
  positions: Record<string, [number, number]>;
  readOnly?: boolean;
  selection: LayoutSelection | null;
  onSelect: (sel: LayoutSelection | null) => void;
  /** Commit new node positions (drag end). */
  onPositionsChange?: (positions: Record<string, [number, number]>) => void;
  /** Create an edge from `from` to `to` (connect handle drag release). */
  onRequestAddEdge?: (from: string, to: string) => void;
  /** Edit an edge label. */
  onRequestEditEdge?: (edge: FlowEdgeInfo, label: string) => void;
  /** Edit a node label. */
  onRequestEditNode?: (id: string, label: string) => void;
  onRequestDeleteSelection?: () => void;
}

export default function LayoutCanvas({
  doc,
  positions,
  readOnly = false,
  selection,
  onSelect,
  onPositionsChange,
  onRequestAddEdge,
  onRequestEditEdge,
  onRequestEditNode,
  onRequestDeleteSelection,
}: LayoutCanvasProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  const dragRef = useRef<{
    kind: "pan" | "node";
    id?: string;
    startX: number;
    startY: number;
    offsetX?: number;
    offsetY?: number;
    panX?: number;
    panY?: number;
    moved?: boolean;
  } | null>(null);

  // Node drag produces ephemeral positions committed on pointer up.
  const [draftPositions, setDraftPositions] = useState<
    Record<string, [number, number]> | null
  >(null);
  const [connecting, setConnecting] = useState<{
    from: string;
    x: number;
    y: number;
    startX: number;
    startY: number;
  } | null>(null);
  const [editingNode, setEditingNode] = useState<{
    id: string;
    draft: string;
  } | null>(null);
  const [editingEdge, setEditingEdge] = useState<{
    edge: FlowEdgeInfo;
    draft: string;
  } | null>(null);

  const positionsKey = useMemo(() => JSON.stringify(positions), [positions]);
  const [prevKey, setPrevKey] = useState(positionsKey);
  if (positionsKey !== prevKey) {
    setPrevKey(positionsKey);
    setDraftPositions(null);
    setConnecting(null);
  }

  const effective = draftPositions ?? positions;

  const nodeSize = useCallback((shape: ShapeKind): { w: number; h: number } => {
    switch (shape) {
      case "circle":
        return { w: NODE_W, h: NODE_W };
      case "diamond":
        return { w: NODE_W + 40, h: NODE_H + 24 };
      default:
        return { w: NODE_W, h: NODE_H };
    }
  }, []);

  const toWorld = useCallback(
    (clientX: number, clientY: number) => {
      const rect = viewportRef.current?.getBoundingClientRect();
      const oX = rect ? rect.left : 0;
      const oY = rect ? rect.top : 0;
      return {
        x: (clientX - oX - pan.x) / zoom,
        y: (clientY - oY - pan.y) / zoom,
      };
    },
    [zoom, pan],
  );

  // ── Pan ──────────────────────────────────────────────────────────────

  const beginPan = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0 || connecting) return;
      dragRef.current = {
        kind: "pan",
        startX: e.clientX,
        startY: e.clientY,
        panX: pan.x,
        panY: pan.y,
      };
      setIsPanning(true);
      onSelect(null);
    },
    [connecting, pan, onSelect],
  );

  // ── Node drag ─────────────────────────────────────────────────────────

  const beginNodeDrag = useCallback(
    (e: React.PointerEvent, id: string) => {
      e.stopPropagation();
      if (readOnly) return;
      const w = toWorld(e.clientX, e.clientY);
      const pos = effective[id] ?? [0, 0];
      dragRef.current = {
        kind: "node",
        id,
        startX: e.clientX,
        startY: e.clientY,
        offsetX: w.x - pos[0],
        offsetY: w.y - pos[1],
        moved: false,
      };
      setIsPanning(false);
      onSelect({ type: "node", key: id });
    },
    [readOnly, toWorld, effective, onSelect],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const st = dragRef.current;
      if (!st) return;
      if (st.kind === "pan") {
        setPan({
          x: (st.panX ?? 0) + (e.clientX - st.startX),
          y: (st.panY ?? 0) + (e.clientY - st.startY),
        });
      } else if (st.id) {
        const w = toWorld(e.clientX, e.clientY);
        const nx = Math.round(w.x - (st.offsetX ?? 0));
        const ny = Math.round(w.y - (st.offsetY ?? 0));
        setDraftPositions((prev) => ({
          ...(prev ?? positions),
          [st.id!]: [nx, ny],
        }));
        st.moved = true;
      }
    },
    [toWorld, positions],
  );

  const handlePointerUp = useCallback(() => {
      const st = dragRef.current;
      if (st?.kind === "node" && st.id && st.moved && draftPositions) {
        onPositionsChange?.(draftPositions);
      }
      dragRef.current = null;
      setIsPanning(false);
    },
    [draftPositions, onPositionsChange],
  );

  // ── Connect handle drag ───────────────────────────────────────────────

  // While connecting, track the cursor globally and finish on pointer up.
  useEffect(() => {
    if (!connecting) return;
    const onMove = (e: PointerEvent) => {
      const w = toWorld(e.clientX, e.clientY);
      setConnecting((prev) =>
        prev ? { ...prev, x: w.x, y: w.y } : prev,
      );
    };
    const onUp = (e: PointerEvent) => {
      const from = connecting.from;
      setConnecting(null);
      const w = toWorld(e.clientX, e.clientY);
      const hit = doc.nodesOrdered.find((id) => {
        if (id === from) return false;
        const pos = effective[id] ?? [0, 0];
        const { w: nw, h: nh } = nodeSize(doc.nodes.get(id)?.shape ?? "rect");
        return (
          w.x >= pos[0] &&
          w.x <= pos[0] + nw &&
          w.y >= pos[1] &&
          w.y <= pos[1] + nh
        );
      });
      if (hit) onRequestAddEdge?.(from, hit);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [connecting, toWorld, doc, effective, nodeSize, onRequestAddEdge]);

  // ── Zoom ──────────────────────────────────────────────────────────────

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setZoom((prev) => Math.min(Math.max(prev + delta, MIN_ZOOM), MAX_ZOOM));
  }, []);
  const zoomIn = useCallback(() => setZoom((p) => Math.min(p + ZOOM_STEP, MAX_ZOOM)), []);
  const zoomOut = useCallback(() => setZoom((p) => Math.max(p - ZOOM_STEP, MIN_ZOOM)), []);
  const fitToView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // ── Edge geometry ─────────────────────────────────────────────────────

  const edgePaths = useMemo(() => {
    return doc.edges.map((edge) => {
      const srcShape = doc.nodes.get(edge.from)?.shape ?? "rect";
      const dstShape = doc.nodes.get(edge.to)?.shape ?? "rect";
      const sp = effective[edge.from] ?? [0, 0];
      const tp = effective[edge.to] ?? [0, 0];
      const src = nodeSize(srcShape);
      const dst = nodeSize(dstShape);

      let dx = tp[0] - sp[0];
      let dy = tp[1] - sp[1];
      if (dx === 0 && dy === 0) {
        dx = 1;
        dy = 0;
      }
      const len = Math.hypot(dx, dy) || 1;

      const anchor = (pos: [number, number], size: { w: number; h: number }, vx: number, vy: number) => {
        if (Math.abs(vx) >= Math.abs(vy)) {
          return {
            x: pos[0] + (vx >= 0 ? size.w : 0) - (vx >= 0 ? 10 : -10),
            y: pos[1] + size.h / 2,
          };
        }
        return {
          x: pos[0] + size.w / 2,
          y: pos[1] + (vy >= 0 ? size.h : 0) - (vy >= 0 ? 10 : -10),
        };
      };

      const start = anchor(sp, src, dx / len, dy / len);
      const end = anchor(tp, dst, -dx / len, -dy / len);
      const mx = (start.x + end.x) / 2;

      const dash = edge.arrowType === "dotted" ? "4 3" : undefined;
      const width = edge.arrowType === "thick" ? 3 : 1.5;
      const isSel = selection?.type === "edge" && selection.key === edgeKey(edge);

      return {
        edge,
        start,
        end,
        path: `M ${start.x} ${start.y} C ${mx} ${start.y}, ${mx} ${end.y}, ${end.x} ${end.y}`,
        dash,
        width: isSel ? width + 1 : width,
        isSel,
      };
    });
  }, [doc, effective, nodeSize, selection]);

  // ── Delete key ────────────────────────────────────────────────────────

  useEffect(() => {
    if (readOnly) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if ((e.key === "Delete" || e.key === "Backspace") && selection) {
        e.preventDefault();
        onRequestDeleteSelection?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [readOnly, selection, onRequestDeleteSelection]);

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div
      ref={viewportRef}
      className="relative flex-1 min-h-0 overflow-hidden bg-[#1e1e1e]"
      style={{ touchAction: "none", cursor: isPanning ? "grabbing" : "grab" }}
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
        <button
          type="button"
          onClick={zoomIn}
          disabled={zoom >= MAX_ZOOM}
          className="p-1 rounded text-[#858585] hover:text-white hover:bg-[#333333] disabled:opacity-40"
          title="Zoom in"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <span className="text-[10px] font-mono text-[#858585] min-w-[38px] text-center select-none">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={zoomOut}
          disabled={zoom <= MIN_ZOOM}
          className="p-1 rounded text-[#858585] hover:text-white hover:bg-[#333333] disabled:opacity-40"
          title="Zoom out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={fitToView}
          className="p-1 rounded text-[#858585] hover:text-white hover:bg-[#333333]"
          title="Reset view"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Hint bar */}
      {!readOnly && (
        <div className="absolute top-2 left-2 z-30 flex items-center gap-1.5 text-[10px] text-[#858585] bg-[#252526]/90 border border-[#333333] rounded-md px-2 py-1 select-none">
          <MousePointer2 className="w-3 h-3" />
          Drag nodes · drag background to pan · wheel zoom · (+) connects
        </div>
      )}

      {/* World (scaled) */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
        }}
      >
        {/* Edges SVG — centered at world origin, overflow visible */}
        <svg
          className="absolute z-[1] pointer-events-none"
          style={{ left: 0, top: 0, overflow: "visible" }}
        >
          <defs>
            <marker
              id="lc-arrow"
              viewBox="0 0 10 10"
              refX="7"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#858585" />
            </marker>
            <marker
              id="lc-arrow-sel"
              viewBox="0 0 10 10"
              refX="7"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#e5c07b" />
            </marker>
          </defs>
          {edgePaths.map((ep) => (
            <path
              key={edgeKey(ep.edge)}
              d={ep.path}
              fill="none"
              stroke={ep.isSel ? "#e5c07b" : "#555555"}
              strokeWidth={ep.width}
              strokeDasharray={ep.dash}
              markerEnd={`url(#${ep.isSel ? "lc-arrow-sel" : "lc-arrow"})`}
            />
          ))}
          {connecting && (
            <line
              x1={connecting.x}
              y1={connecting.y}
              x2={connecting.x + 40}
              y2={connecting.y}
              stroke="#e5c07b"
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
          )}
        </svg>

        {/* Edge labels */}
        {edgePaths.map((ep) =>
          ep.edge.label ? (
            <div
              key={`lbl-${edgeKey(ep.edge)}`}
              className="absolute z-[2] px-2 py-0.5 text-[10px] text-[#d4d4d4] bg-[#1a1a1a] border border-[#333333] rounded-full whitespace-nowrap pointer-events-none"
              style={{
                left: (ep.start.x + ep.end.x) / 2 - 12,
                top: (ep.start.y + ep.end.y) / 2 - 10,
              }}
            >
              {ep.edge.label}
            </div>
          ) : null,
        )}

        {/* Nodes */}
        {doc.nodesOrdered.map((id) => {
          const info = doc.nodes.get(id);
          if (!info) return null;
          const pos = effective[id] ?? [0, 0];
          const shape = info.shape;
          const isSel = selection?.type === "node" && selection.key === id;
          const { w, h } = nodeSize(shape);

          const style: React.CSSProperties = {
            left: pos[0],
            top: pos[1],
            width: w,
            height: h,
            background: "#2d2d2d",
            color: "#d4d4d4",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            padding: "0 10px",
            textAlign: "center",
            overflow: "hidden",
            userSelect: "none",
            cursor: readOnly ? "grab" : "move",
            position: "absolute",
            zIndex: 4,
            boxSizing: "border-box",
            border: `1.5px solid ${isSel ? "#e5c07b" : "#555555"}`,
            boxShadow: isSel
              ? "0 0 0 1px #e5c07b, 0 0 10px rgba(229,192,123,0.25)"
              : "0 1px 3px rgba(0,0,0,0.4)",
            fontFamily: '"JetBrains Mono", "Fira Code", monospace',
            transition: "box-shadow 0.15s, border-color 0.15s",
          };

          switch (shape) {
            case "rect":
              style.borderRadius = 6;
              break;
            case "round":
              style.borderRadius = `${NODE_CORNER}px`;
              break;
            case "stadium":
              style.borderRadius = `${NODE_H / 2}px`;
              break;
            case "circle":
              style.borderRadius = "50%";
              break;
            case "subroutine":
              style.background = "#2d2d2d";
              style.borderLeft = `3px solid ${isSel ? "#e5c07b" : "#61afef"}`;
              style.borderRight = `3px solid ${isSel ? "#e5c07b" : "#61afef"}`;
              style.border = undefined;
              style.borderRadius = 6;
              break;
            case "cylinder":
              style.borderRadius = "50% / 18%";
              break;
            case "diamond":
              style.background = "transparent";
              style.border = "none";
              break;
            case "async":
              style.clipPath =
                "polygon(0 50%, 38% 0, 100% 0, 100% 100%, 38% 100%)";
              break;
            case "plain":
              style.borderStyle = "dashed";
              break;
            default:
              break;
          }

          return (
            <div
              key={id}
              data-lcnode={id}
              onPointerDown={(e) => {
                e.stopPropagation();
                beginNodeDrag(e, id);
              }}
              onDoubleClick={() => {
                if (readOnly) return;
                const draft = doc.nodes.get(id)?.label ?? id;
                setEditingNode({ id, draft });
                dragRef.current = null;
              }}
              style={style}
            >
              {shape === "diamond" && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "#2d2d2d",
                    transform: "rotate(45deg) scale(0.78)",
                    borderRadius: 8,
                    border: `1.5px solid ${isSel ? "#e5c07b" : "#555555"}`,
                    boxShadow: isSel ? "0 0 0 1px #e5c07b" : undefined,
                    boxSizing: "border-box",
                  }}
                />
              )}
              <span
                className="relative z-[1] max-w-full truncate"
                style={{ textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              >
                {info.label}
              </span>
              {!readOnly && (
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    const pos = effective[id] ?? [0, 0];
                    setConnecting({
                      from: id,
                      x: pos[0] + w,
                      y: pos[1] + h / 2,
                      startX: pos[0] + w,
                      startY: pos[1] + h / 2,
                    });
                  }}
                  onPointerUp={(e) => e.stopPropagation()}
                  style={{
                    position: "absolute",
                    right: -8,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: "#2d2d2d",
                    border: "1.5px solid #e5c07b",
                    color: "#e5c07b",
                    cursor: "crosshair",
                    zIndex: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    lineHeight: 1,
                  }}
                  title="Drag to another node to connect"
                >
                  +
                </button>
              )}
              {editingNode?.id === id && (
                <input
                  autoFocus
                  value={editingNode.draft}
                  onChange={(e) =>
                    setEditingNode({ id, draft: e.target.value })
                  }
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const next = editingNode.draft.trim();
                      setEditingNode(null);
                      setDraftPositions(null);
                      if (next) onRequestEditNode?.(id, next);
                    } else if (e.key === "Escape") {
                      e.preventDefault();
                      setEditingNode(null);
                    }
                  }}
                  onBlur={() => {
                    const next = editingNode.draft.trim();
                    setEditingNode(null);
                    setDraftPositions(null);
                    if (next) onRequestEditNode?.(id, next);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  style={{
                    position: "absolute",
                    inset: 2,
                    width: "calc(100% - 4px)",
                    height: "calc(100% - 4px)",
                    background: "#1e1e1e",
                    border: "1px solid #e5c07b",
                    color: "#e5c07b",
                    textAlign: "center",
                    fontSize: 12,
                    outline: "none",
                    borderRadius: 6,
                    zIndex: 9,
                    boxSizing: "border-box",
                    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Edge hover/select strips (world coordinates already transformed) */}
      {edgePaths.map((ep) => {
        if (readOnly) return null;
        const dx = ep.end.x - ep.start.x;
        const dy = ep.end.y - ep.start.y;
        const len = Math.hypot(dx, dy) || 1;
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        return (
          <div
            key={`hit-${edgeKey(ep.edge)}`}
            className="absolute z-20"
            style={{
              left: (ep.start.x * zoom + pan.x) - 2,
              top: (ep.start.y * zoom + pan.y) - 3,
              width: len * zoom,
              height: 6,
              transform: `rotate(${angle}deg)`,
              transformOrigin: "0 50%",
              pointerEvents: "auto",
              cursor: "pointer",
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
              onSelect({ type: "edge", key: edgeKey(ep.edge) });
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              if (onRequestEditEdge) {
                setEditingEdge({
                  edge: ep.edge,
                  draft: ep.edge.label ?? "",
                });
              }
            }}
            title="Click to select · double-click to edit label"
          />
        );
      })}

      {/* Connecting preview line follows cursor (world coords) */}
      {connecting && (
        <svg
          className="absolute z-20 pointer-events-none"
          style={{ left: 0, top: 0, overflow: "visible" }}
        >
          <line
            x1={connecting.startX * zoom + pan.x}
            y1={connecting.startY * zoom + pan.y}
            x2={connecting.x * zoom + pan.x}
            y2={connecting.y * zoom + pan.y}
            stroke="#e5c07b"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
        </svg>
      )}

      {/* Edge label editor */}
      {editingEdge &&
        onRequestEditEdge &&
        (() => {
          const pathInfo = edgePaths.find(
            (ep) => edgeKey(ep.edge) === edgeKey(editingEdge.edge),
          );
          if (!pathInfo) return null;
          return (
            <div
              className="absolute z-40 bg-[#1a1a1a] border border-[#e5c07b] rounded-md shadow-xl px-1 py-0.5 flex items-center gap-1"
              style={{
                left: (pathInfo.start.x + (pathInfo.end.x - pathInfo.start.x) / 2) * zoom + pan.x - 80,
                top: (pathInfo.start.y + (pathInfo.end.y - pathInfo.start.y) / 2) * zoom + pan.y - 26,
              }}
            >
              <input
                autoFocus
                value={editingEdge.draft}
                onChange={(e) =>
                  setEditingEdge({ ...editingEdge, draft: e.target.value })
                }
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const next = editingEdge.draft.trim();
                    onRequestEditEdge(editingEdge.edge, next || "");
                    setEditingEdge(null);
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    setEditingEdge(null);
                  }
                }}
                className="w-36 bg-transparent text-[#d4d4d4] text-xs outline-none px-1"
                placeholder="Edge label"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => {
                  const next = editingEdge.draft.trim();
                  onRequestEditEdge(editingEdge.edge, next || "");
                  setEditingEdge(null);
                }}
                className="text-[10px] px-1.5 py-0.5 rounded bg-[#333333] text-[#e5c07b] hover:bg-[#444444]"
              >
                OK
              </button>
            </div>
          );
        })()}
    </div>
  );
}