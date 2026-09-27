// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — Mermaid Visual Overlay Editor
//
// Renders the diagram through `MermaidRenderer` and overlays transparent hit
// regions on top of each node (`g.node[data-id]`) and edge (chord strips
// between connected node rects). Supports:
//   • Click to select a node / edge
//   • Double-click a node to edit its label inline
//   • Drag from a selected node's "+" handle onto another node to create an edge
//   • Click an edge to select it; double-click an edge to edit its label
//
// If the mermaid SVG contract (`g.node[data-id]`) does not resolve in the
// installed mermaid version, the overlay hides itself (text/split still work).
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2, Info, Pencil } from "lucide-react";
import { MermaidRenderer } from "@/src/modules/render";
import {
  type FlowDocument,
  type FlowEdgeInfo,
  edgeKey,
} from "./LCFileView.DisplayMode.Mermaid.Flow";

export interface VisualSelection {
  type: "node" | "edge";
  key: string;
}

export interface VisualEditorProps {
  /** Mermaid content with any `%% lc-layout` line stripped. */
  content: string;
  doc: FlowDocument;
  selection: VisualSelection | null;
  onSelect: (sel: VisualSelection | null) => void;
  onRenameNode: (id: string, label: string) => void;
  onDeleteNode: (id: string) => void;
  onAddNode: () => void;
  onAddEdge: (from: string, to: string) => void;
  onDeleteEdge: (edge: FlowEdgeInfo) => void;
  onSetEdgeLabel: (edge: FlowEdgeInfo, label: string) => void;
}

interface NodeHit {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

interface EdgeStrip {
  edge: FlowEdgeInfo;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  angle: number;
  length: number;
}

export default function MermaidVisualEditor({
  content,
  doc,
  selection,
  onSelect,
  onRenameNode,
  onDeleteNode,
  onAddNode,
  onAddEdge,
  onDeleteEdge,
  onSetEdgeLabel,
}: VisualEditorProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [nodeHits, setNodeHits] = useState<NodeHit[]>([]);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [editingLabel, setEditingLabel] = useState<NodeHit | null>(null);
  const [labelDraft, setLabelDraft] = useState("");
  const [connect, setConnect] = useState<{
    from: string;
    x: number;
    y: number;
  } | null>(null);
  const [edgeEditing, setEdgeEditing] = useState<FlowEdgeInfo | null>(null);
  const [edgeLabelDraft, setEdgeLabelDraft] = useState("");
  const [toolbarRename, setToolbarRename] = useState<{
    key: string;
    draft: string;
  } | null>(null);

  // ── Refresh hit regions from the injected SVG ────────────────────────

  const refresh = useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const svg = wrap.querySelector("svg");
    if (!svg) {
      setAvailable(false);
      return;
    }
    const wrapRect = wrap.getBoundingClientRect();
    const hits: NodeHit[] = [];

    const pushHit = (el: Element, id: string) => {
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      hits.push({
        id,
        left: r.left - wrapRect.left,
        top: r.top - wrapRect.top,
        width: r.width,
        height: r.height,
      });
    };

    // Primary contract: some mermaid builds mark node groups with a data-id.
    svg
      .querySelectorAll<Element>("g.node[data-id], g.flowchart-node[data-id]")
      .forEach((el) => {
        const id = el.getAttribute("data-id");
        if (id) pushHit(el, id);
      });

    // Fallback for mermaid v11 flowcharts: node groups expose the node id only
    // through their dom id (`flowchart-<id>-<counter>`) with no data-id attr.
    if (hits.length === 0 && doc.nodesOrdered.length > 0) {
      const groups = Array.from(
        svg.querySelectorAll<Element>("g.node, g.flowchart-node"),
      );
      const escId = (id: string) => id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      for (const id of doc.nodesOrdered) {
        const re = new RegExp(`^flowchart-${escId(id)}-\\d+$`);
        const el = groups.find(
          (g) =>
            g.getAttribute("data-id") === id ||
            g.id === id ||
            re.test(g.id),
        );
        if (el) pushHit(el, id);
      }
    }

    // Generic fallback for any diagram type: make <text> labels selectable so
    // labels can be renamed/edited regardless of the diagram kind.
    if (hits.length === 0) {
      const textEls = svg.querySelectorAll<Element>("text");
      const seen = new Set<string>();
      textEls.forEach((el) => {
        const label = (el.textContent ?? "").trim();
        if (!label || label.length > 60 || seen.has(label)) return;
        const r = el.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) return;
        seen.add(label);
        hits.push({
          id: label,
          left: r.left - wrapRect.left,
          top: r.top - wrapRect.top,
          width: Math.max(r.width, 20),
          height: Math.max(r.height, 14),
        });
      });
    }

    setAvailable(hits.length > 0);
    setNodeHits(hits);
  }, [doc]);

  // Watch the wrapper subtree for SVG injection / pan / zoom / re-render.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const observer = new MutationObserver(() => {
      requestAnimationFrame(refresh);
    });
    observer.observe(wrap, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "transform"],
    });

    const resizer = new ResizeObserver(() => requestAnimationFrame(refresh));
    resizer.observe(wrap);

    const evtHandler = () => requestAnimationFrame(refresh);
    const evts = [
      "pointerdown",
      "pointermove",
      "pointerup",
      "pointercancel",
      "wheel",
      "touchmove",
    ] as const;
    for (const ev of evts) {
      wrap.addEventListener(ev, evtHandler, { passive: true });
    }

    refresh();

    return () => {
      observer.disconnect();
      resizer.disconnect();
      for (const ev of evts) wrap.removeEventListener(ev, evtHandler);
    };
  }, [refresh, content]);

  // ── Edge chord strips (screen-space) ──────────────────────────────────

  const edgeStrips = useMemo<EdgeStrip[]>(() => {
    const hitsById = new Map(nodeHits.map((h) => [h.id, h]));
    return doc.edges.flatMap((edge) => {
      const a = hitsById.get(edge.from);
      const b = hitsById.get(edge.to);
      if (!a || !b) return [];
      // Anchor at node borders based on relative positions.
      const aCx = a.left + a.width / 2;
      const aCy = a.top + a.height / 2;
      const bCx = b.left + b.width / 2;
      const bCy = b.top + b.height / 2;
      const horiz = Math.abs(bCx - aCx) >= Math.abs(bCy - aCy);
      let x1: number;
      let y1: number;
      let x2: number;
      let y2: number;
      if (horiz) {
        if (bCx >= aCx) {
          x1 = a.left + a.width;
          y1 = aCy;
          x2 = b.left;
          y2 = bCy;
        } else {
          x1 = a.left;
          y1 = aCy;
          x2 = b.left + b.width;
          y2 = bCy;
        }
      } else {
        if (bCy >= aCy) {
          x1 = aCx;
          y1 = a.top + a.height;
          x2 = bCx;
          y2 = b.top;
        } else {
          x1 = aCx;
          y1 = a.top;
          x2 = bCx;
          y2 = b.top + b.height;
        }
      }
      const dx = x2 - x1;
      const dy = y2 - y1;
      const length = Math.max(4, Math.hypot(dx, dy));
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      return [{ edge, x1, y1, x2, y2, angle, length }];
    });
  }, [doc, nodeHits]);

  const edgeLabelMidpoint = useMemo(() => {
    if (!edgeEditing) return null;
    const strip = edgeStrips.find((s) => edgeKey(s.edge) === edgeKey(edgeEditing));
    if (!strip) return null;
    return {
      left: (strip.x1 + strip.x2) / 2 - 80,
      top: (strip.y1 + strip.y2) / 2 - 26,
    };
  }, [edgeEditing, edgeStrips]);

  // ── Node interactions ─────────────────────────────────────────────────

  const openNodeRename = useCallback(
    (hit: NodeHit) => {
      setToolbarRename(null);
      setLabelDraft(doc.nodes.get(hit.id)?.label ?? hit.id);
      setEditingLabel(hit);
    },
    [doc],
  );

  const nodeOptions = useMemo(
    () =>
      doc.isFlowchart
        ? doc.nodesOrdered.map((id) => ({
            value: id,
            label: doc.nodes.get(id)?.label ?? id,
          }))
        : nodeHits.map((h) => ({ value: h.id, label: h.id })),
    [doc, nodeHits],
  );

  const nodeLabelFor = useCallback(
    (key: string) => doc.nodes.get(key)?.label ?? key,
    [doc],
  );

  const startToolbarRename = useCallback(() => {
    if (selection?.type !== "node") return;
    const hit = nodeHits.find((h) => h.id === selection.key) ?? null;
    if (hit) {
      openNodeRename(hit);
      return;
    }
    setToolbarRename({ key: selection.key, draft: nodeLabelFor(selection.key) });
  }, [selection, nodeHits, nodeLabelFor, openNodeRename]);

  const commitToolbarRename = useCallback(() => {
    if (!toolbarRename) return;
    const next = toolbarRename.draft.trim();
    setToolbarRename(null);
    if (next) onRenameNode(toolbarRename.key, next);
  }, [toolbarRename, onRenameNode]);

  const handleNodePointerDown = useCallback(
    (e: React.PointerEvent, id: string) => {
      e.stopPropagation();
      onSelect({ type: "node", key: id });
    },
    [onSelect],
  );

  const handleNodeDoubleClick = useCallback(
    (e: React.MouseEvent, hit: NodeHit) => {
      e.stopPropagation();
      openNodeRename(hit);
    },
    [openNodeRename],
  );

  const commitLabel = useCallback(() => {
    if (!editingLabel) return;
    const id = editingLabel.id;
    const next = labelDraft.trim();
    setEditingLabel(null);
    if (next && next !== doc.nodes.get(id)?.label) {
      onRenameNode(id, next);
    }
  }, [editingLabel, labelDraft, doc, onRenameNode]);

  // ── Connect handle drag ───────────────────────────────────────────────

  const beginConnect = useCallback(
    (e: React.PointerEvent, id: string) => {
      e.stopPropagation();
      onSelect({ type: "node", key: id });
      setConnect({ from: id, x: e.clientX, y: e.clientY });
    },
    [onSelect],
  );

  // While connecting, track the cursor globally and finish on pointer up.
  useEffect(() => {
    if (!connect) return;
    const onMove = (e: PointerEvent) => {
      setConnect((prev) =>
        prev ? { ...prev, x: e.clientX, y: e.clientY } : prev,
      );
    };
    const onUp = (e: PointerEvent) => {
      const from = connect.from;
      const wrap = wrapRef.current;
      setConnect(null);
      if (!wrap) return;
      const wrapRect = wrap.getBoundingClientRect();
      const x = e.clientX - wrapRect.left;
      const y = e.clientY - wrapRect.top;
      const targetId = nodeHits.find(
        (h) =>
          x >= h.left && x <= h.left + h.width && y >= h.top && y <= h.top + h.height,
      )?.id;
      if (targetId && targetId !== from) {
        onAddEdge(from, targetId);
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [connect, nodeHits, onAddEdge]);

  // ── Delete key handling ───────────────────────────────────────────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selection) {
        e.preventDefault();
        if (selection.type === "node") {
          onDeleteNode(selection.key);
        } else {
          const edge = doc.edges.find((k) => edgeKey(k) === selection.key);
          if (edge) onDeleteEdge(edge);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selection, doc, onDeleteNode, onDeleteEdge]);

  // ── Edge label editor ─────────────────────────────────────────────────

  const selectedEdge = useMemo(
    () =>
      selection?.type === "edge"
        ? doc.edges.find((e) => edgeKey(e) === selection.key)
        : null,
    [selection, doc],
  );

  const commitEdgeLabel = useCallback(() => {
    if (!edgeEditing) return;
    const next = edgeLabelDraft.trim();
    onSetEdgeLabel(edgeEditing, next || "");
    setEdgeEditing(null);
  }, [edgeEditing, edgeLabelDraft, onSetEdgeLabel]);

  const handleEdgePointerDown = useCallback(
    (e: React.PointerEvent, edge: FlowEdgeInfo) => {
      e.stopPropagation();
      onSelect({ type: "edge", key: edgeKey(edge) });
    },
    [onSelect],
  );

  const handleEdgeDoubleClick = useCallback(
    (e: React.MouseEvent, edge: FlowEdgeInfo) => {
      e.stopPropagation();
      setEdgeEditing(edge);
      setEdgeLabelDraft(edge.label ?? "");
    },
    [],
  );

  // ── Render ────────────────────────────────────────────────────────────

  const overlayVisible = available !== false;

  return (
    <div
      className="relative flex-1 min-h-0 overflow-auto bg-[#1e1e1e]"
      style={{
        backgroundColor: "#1e1e1e",
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
        backgroundSize: "22px 22px",
      }}
    >
      <div ref={wrapRef} className="relative min-h-full p-3">
        {/* MermaidRenderer handles pan/zoom + error UI */}
        <div data-edit-skip className="relative pointer-events-none">
          <div className="pointer-events-auto">
            <MermaidRenderer chart={content} />
          </div>
        </div>

        {/* Node hit regions (overlay) */}
        {overlayVisible &&
          nodeHits.map((h) => {
            const selected =
              selection?.type === "node" && selection.key === h.id;
            return (
              <div
                key={h.id}
                data-id={h.id}
                onPointerDown={(e) => handleNodePointerDown(e, h.id)}
                onDoubleClick={(e) => handleNodeDoubleClick(e, h)}
                style={{
                  position: "absolute",
                  left: h.left,
                  top: h.top,
                  width: h.width,
                  height: h.height,
                  background: selected
                    ? "rgba(229,192,123,0.12)"
                    : "transparent",
                  boxShadow: selected
                    ? "inset 0 0 0 2px rgba(229,192,123,0.85)"
                    : "inset 0 0 0 1px rgba(255,255,255,0.03)",
                  borderRadius: 4,
                  cursor: "pointer",
                  pointerEvents: "auto",
                  zIndex: 20,
                  transition: "box-shadow 0.12s, background 0.12s",
                }}
              >
                {selected && doc.isFlowchart && (
                  <div
                    onPointerDown={(e) => beginConnect(e, h.id)}
                    title="Drag to another node to create an edge"
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
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      lineHeight: 1,
                    }}
                  >
                    +
                  </div>
                )}
              </div>
            );
          })}

        {/* Edge hit strips */}
        {overlayVisible &&
          edgeStrips.map((s) => {
            const selected =
              selection?.type === "edge" &&
              selection.key === edgeKey(s.edge);
            return (
              <div
                key={edgeKey(s.edge)}
                onPointerDown={(e) => handleEdgePointerDown(e, s.edge)}
                onDoubleClick={(e) => handleEdgeDoubleClick(e, s.edge)}
                title="Click to select · double-click to edit label"
                style={{
                  position: "absolute",
                  left: s.x1 - 3,
                  top: s.y1 - 3,
                  width: s.length,
                  height: 6,
                  transform: `rotate(${s.angle}deg)`,
                  transformOrigin: "0 50%",
                  cursor: "pointer",
                  pointerEvents: "auto",
                  zIndex: 21,
                  background: selected
                    ? "rgba(229,192,123,0.35)"
                    : "rgba(255,255,255,0.06)",
                  borderRadius: 3,
                }}
              />
            );
          })}

        {/* Connection preview line */}
        {connect && (
          <svg
            className="pointer-events-none"
            style={{ position: "fixed", left: 0, top: 0, width: "100vw", height: "100vh", zIndex: 100, overflow: "visible" }}
          >
            <line
              x1={connect.x}
              y1={connect.y}
              x2={connect.x + 60}
              y2={connect.y}
              stroke="#e5c07b"
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
            <circle cx={connect.x} cy={connect.y} r={4} fill="#e5c07b" />
          </svg>
        )}

        {/* Node label inline editor */}
        {editingLabel && (
          <div
            className="absolute z-40"
            style={{
              left: editingLabel.left,
              top: editingLabel.top,
              width: editingLabel.width,
              height: editingLabel.height,
            }}
          >
            <input
              autoFocus
              value={labelDraft}
              onChange={(e) => setLabelDraft(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitLabel();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  setEditingLabel(null);
                }
              }}
              onBlur={commitLabel}
              onPointerDown={(e) => e.stopPropagation()}
              className="w-full h-full bg-[#1e1e1e] border border-[#e5c07b] text-[#d4d4d4] text-center text-xs outline-none rounded"
              spellCheck={false}
              style={{ fontFamily: '"JetBrains Mono", "Fira Code", monospace' }}
            />
          </div>
        )}

        {/* Edge label editor */}
        {edgeEditing && edgeLabelMidpoint && (
          <div
            className="absolute z-40 bg-[#1a1a1a] border border-[#e5c07b] rounded-md shadow-lg p-1 flex items-center gap-1"
            style={{ left: edgeLabelMidpoint.left, top: edgeLabelMidpoint.top }}
          >
            <input
              autoFocus
              value={edgeLabelDraft}
              onChange={(e) => setEdgeLabelDraft(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitEdgeLabel();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  setEdgeEditing(null);
                }
              }}
              onBlur={commitEdgeLabel}
              className="w-36 bg-transparent text-[#d4d4d4] text-xs outline-none px-1"
              placeholder="Edge label"
              spellCheck={false}
            />
            <button
              type="button"
              onClick={commitEdgeLabel}
              className="text-[10px] px-1.5 py-0.5 rounded bg-[#333333] text-[#e5c07b] hover:bg-[#444444]"
            >
              OK
            </button>
          </div>
        )}
      </div>

      {/* Toolbar over the preview (bottom-right, clear of the mermaid zoom controls) */}
      <div className="absolute top-2 left-2 z-30 flex items-center gap-1 bg-[#252526] border border-[#444444] rounded-md p-1">
        {toolbarRename ? (
          <input
            autoFocus
            value={toolbarRename.draft}
            onChange={(e) =>
              setToolbarRename({ ...toolbarRename, draft: e.target.value })
            }
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") {
                e.preventDefault();
                commitToolbarRename();
              } else if (e.key === "Escape") {
                e.preventDefault();
                setToolbarRename(null);
              }
            }}
            onBlur={commitToolbarRename}
            className="w-36 h-6 bg-[#1e1e1e] border border-[#e5c07b] text-[#d4d4d4] text-xs outline-none px-1.5 rounded"
            placeholder="New label"
            spellCheck={false}
          />
        ) : (
          <>
            <select
              value={selection?.type === "node" ? selection.key : ""}
              onChange={(e) => {
                const v = e.target.value;
                if (v) onSelect({ type: "node", key: v });
              }}
              title="Select a node to rename or delete"
              className="text-[11px] h-6 px-1.5 rounded border border-[#444444] bg-[#2d2d2d] text-[#d4d4d4] outline-none hover:border-[#e5c07b]/50 transition-colors"
            >
              <option value="">Node…</option>
              {nodeOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={onAddNode}
              className="flex items-center gap-1 text-[11px] h-6 px-2 rounded text-[#858585] hover:text-white hover:bg-[#333333]"
              title="Add a new node"
            >
              <Plus className="w-3 h-3" />
              <span className="hidden sm:inline">Node</span>
            </button>
            <button
              type="button"
              onClick={startToolbarRename}
              disabled={selection?.type !== "node"}
              className="flex items-center gap-1 text-[11px] h-6 px-2 rounded text-[#858585] hover:text-[#e5c07b] hover:bg-[#333333] disabled:opacity-40 disabled:hover:text-[#858585] disabled:hover:bg-transparent"
              title="Rename selected node"
            >
              <Pencil className="w-3 h-3" />
              <span className="hidden sm:inline">Rename</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (selection?.type === "node") onDeleteNode(selection.key);
                else if (selection?.type === "edge") {
                  const edge = doc.edges.find((e) => edgeKey(e) === selection.key);
                  if (edge) onDeleteEdge(edge);
                }
              }}
              disabled={!selection}
              className="flex items-center gap-1 text-[11px] h-6 px-2 rounded text-[#858585] hover:text-[#e06c75] hover:bg-[#333333] disabled:opacity-40 disabled:hover:text-[#858585] disabled:hover:bg-transparent"
              title="Delete selected node/edge"
            >
              <Trash2 className="w-3 h-3" />
              <span className="hidden sm:inline">Delete</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (selectedEdge) {
                  setEdgeEditing(selectedEdge);
                  setEdgeLabelDraft(selectedEdge.label ?? "");
                }
              }}
              disabled={!selectedEdge}
              className="flex items-center gap-1 text-[11px] h-6 px-2 rounded text-[#858585] hover:text-[#e5c07b] hover:bg-[#333333] disabled:opacity-40 disabled:hover:text-[#858585] disabled:hover:bg-transparent"
              title="Edit selected edge label"
            >
              <Info className="w-3 h-3" />
              <span className="hidden sm:inline">Edge Label</span>
            </button>
          </>
        )}
      </div>

      {/* Not-available note */}
      {available === false && (
        <div className="absolute inset-x-0 bottom-3 z-30 flex justify-center">
          <div className="flex items-center gap-1.5 text-[11px] text-[#858585] bg-[#252526]/95 border border-[#333333] rounded-md px-3 py-1.5">
            <Info className="w-3.5 h-3.5" />
            Visual overlay is unavailable for this diagram — use Text or Split mode.
          </div>
        </div>
      )}
    </div>
  );
}