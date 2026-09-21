// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — Mermaid Visual Canvas Editor
//
// The Visual editor for flowcharts: renders the diagram with automatic
// positioning only (nodes cannot be dragged / layout is not persisted). Editing
// happens through the canvas — rename (double-click / toolbar), add node,
// connect edges, edge labels, delete — while positions always follow the
// auto-arrange algorithm.
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import LayoutCanvas, {
  type LayoutCanvasProps,
} from "./LCFileView.DisplayMode.Mermaid.Layout";

export type MermaidVisualCanvasProps = Omit<
  LayoutCanvasProps,
  "autoLayout" | "readOnly" | "onPositionsChange"
>;

export default function MermaidVisualCanvas(props: MermaidVisualCanvasProps) {
  return <LayoutCanvas {...props} autoLayout readOnly={false} />;
}