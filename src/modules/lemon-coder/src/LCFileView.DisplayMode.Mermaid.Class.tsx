// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — Mermaid Class Diagram Canvas
//
// Custom class-diagram rendering for the visual editor: classes as compartment
// boxes (name / attributes / methods) with inheritance & association lines.
// Clicking a class selects it for rename / delete.
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import { useMemo } from "react";
import type { LayoutSelection } from "./LCFileView.DisplayMode.Mermaid.Layout";

const CLASS_W = 250;
const MEMBER_H = 20;
const HEADER_H = 30;
const COLS = 3;
const COL_GAP = 110;
const ROW_GAP = 80;

export interface ClassCanvasProps {
  lines: string[];
  selection: LayoutSelection | null;
  onSelect: (sel: LayoutSelection | null) => void;
}

interface ClassInfo {
  id: string;
  attrs: string[];
  methods: string[];
}

interface ClassRel {
  from: string;
  to: string;
  label: string | null;
}

function parseClassDiagram(lines: string[]): {
  classes: ClassInfo[];
  rels: ClassRel[];
} {
  const classes: ClassInfo[] = [];
  const byId = new Map<string, ClassInfo>();
  const rels: ClassRel[] = [];
  let currentBlock: ClassInfo | null = null;

  const ensure = (id: string): ClassInfo => {
    let c = byId.get(id);
    if (!c) {
      c = { id, attrs: [], methods: [] };
      classes.push(c);
      byId.set(id, c);
    }
    return c;
  };

  for (const raw of lines) {
    const t = raw.trim();
    if (!t || t.startsWith("%%") || t.startsWith("#")) continue;
    if (/^(classDiagram|title|accTitle|accDescr|direction)\b/i.test(t)) continue;
    if (/^end\b/i.test(t)) {
      currentBlock = null;
      continue;
    }
    const blockOpen = t.match(/^class\s+([A-Za-z0-9_]+)\s*\{$/i);
    if (blockOpen) {
      currentBlock = ensure(blockOpen[1]);
      continue;
    }
    // Relations: "A <|-- B", "Car *-- Engine", "A ..> B", "A --|> B", "A -- B"
    const rel =
      t.match(
        /^([A-Za-z0-9_]+)\s*([+\-#~*o<>|]*)\s*(?:-{2,}|\.{1,2}>\s*|\.\.)\s*([+\-#~*o<>|]*)\s*([A-Za-z0-9_]+)(?:\s*:\s*(.*))?$/i,
      ) ?? null;
    if (rel) {
      rels.push({
        from: rel[1],
        to: rel[4],
        label: rel[5]?.trim() || null,
      });
      void ensure(rel[1]);
      void ensure(rel[4]);
      continue;
    }
    const decl = t.match(/^class\s+([A-Za-z0-9_]+)/i);
    if (decl) {
      void ensure(decl[1]);
      continue;
    }
    // member lines: "ClassName : +attr : type" or "+attr : type" inside a block
    const member = t.match(
      /^(?:([A-Za-z0-9_]+)\s*:\s*)?([+\-#~]?[A-Za-z0-9_\[\]<>., ]+(?:\(.*\))?)(?:\s*:\s*(.+))?$/i,
    );
    if (member) {
      const owner = member[1] ? ensure(member[1]) : currentBlock;
      const sig = ((member[2] ?? "") + (member[3] ? " : " + member[3] : "")).trim();
      if (owner && sig) {
        if (/\(\)/.test(sig)) owner.methods.push(sig);
        else owner.attrs.push(sig);
      }
    }
  }

  return { classes, rels };
}

export default function ClassCanvas({
  lines,
  selection,
  onSelect,
}: ClassCanvasProps) {
  const { classes, rels } = useMemo(() => parseClassDiagram(lines), [lines]);

  if (classes.length === 0) {
    return (
      <div className="flex-1 min-h-0 overflow-auto bg-[#1e1e1e] flex items-center justify-center">
        <p className="text-xs text-[#858585]">No classes found in this class diagram.</p>
      </div>
    );
  }

  const boxes = new Map<
    string,
    { id: string; x: number; y: number; w: number; h: number }
  >();
  {
    const h = (c: ClassInfo) =>
      HEADER_H +
      (c.attrs.length ? c.attrs.length * MEMBER_H + 16 : 16) +
      (c.methods.length ? c.methods.length * MEMBER_H + 16 : 16) +
      8;
    const rowHeights: number[] = [];
    classes.forEach((c, i) => {
      const row = Math.floor(i / COLS);
      rowHeights[row] = Math.max(rowHeights[row] ?? 0, h(c));
    });
    const rowY: number[] = [];
    let acc = 30;
    for (let r = 0; r < rowHeights.length; r++) {
      rowY[r] = acc;
      acc += (rowHeights[r] ?? 0) + ROW_GAP;
    }
    classes.forEach((c, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      boxes.set(c.id, {
        id: c.id,
        x: col * (CLASS_W + COL_GAP) + 20,
        y: rowY[row] ?? 20,
        w: CLASS_W,
        h: h(c),
      });
    });
  }

  const width = Math.min(COLS, classes.length) * (CLASS_W + COL_GAP) + 60;
  let height = 60;
  boxes.forEach((b) => (height = Math.max(height, b.y + b.h + 30)));

  return (
    <div className="flex-1 min-h-0 overflow-auto bg-[#1e1e1e] p-3">
      <div style={{ width, height, position: "relative" }}>
        {/* Relations */}
        <svg
          className="absolute pointer-events-none"
          style={{ left: 0, top: 0, overflow: "visible" }}
        >
          <defs>
            <marker
              id="lc-class-arrow"
              viewBox="0 0 10 10"
              refX="7"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#858585" />
            </marker>
          </defs>
          {rels.map((r, i) => {
            const a = boxes.get(r.from);
            const b = boxes.get(r.to);
            if (!a || !b) return null;
            const aCx = a.x + a.w / 2;
            const aCy = a.y + a.h / 2;
            const bCx = b.x + b.w / 2;
            const bCy = b.y + b.h / 2;
            const dx = bCx - aCx;
            const dy = bCy - aCy;
            let x1: number; let y1: number; let x2: number; let y2: number;
            if (Math.abs(dx) >= Math.abs(dy)) {
              if (dx >= 0) {
                x1 = a.x + a.w; y1 = aCy;
                x2 = b.x; y2 = bCy;
              } else {
                x1 = a.x; y1 = aCy;
                x2 = b.x + b.w; y2 = bCy;
              }
            } else if (dy >= 0) {
              x1 = aCx; y1 = a.y + a.h;
              x2 = bCx; y2 = b.y;
            } else {
              x1 = aCx; y1 = a.y;
              x2 = bCx; y2 = b.y + b.h;
            }
            return (
              <g key={`cl-${i}`}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#6b7280"
                  strokeWidth={1.5}
                  markerEnd="url(#lc-class-arrow)"
                />
                {r.label && (
                  <text
                    x={(x1 + x2) / 2}
                    y={(y1 + y2) / 2 - 6}
                    textAnchor="middle"
                    fill="#d4d4d4"
                    fontSize={11}
                    fontFamily="monospace"
                  >
                    {r.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Class boxes */}
        {classes.map((c) => {
          const b = boxes.get(c.id);
          if (!b) return null;
          const sel = selection?.type === "node" && selection.key === c.id;
          return (
            <div
              key={c.id}
              onClick={() => onSelect({ type: "node", key: c.id })}
              style={{
                position: "absolute",
                left: b.x,
                top: b.y,
                width: b.w,
                background: "#ECECFF",
                border: `1.5px solid ${sel ? "#e5c07b" : "#9370DB"}`,
                borderRadius: 8,
                overflow: "hidden",
                cursor: "pointer",
                zIndex: 2,
                boxShadow: sel
                  ? "0 0 0 1px #e5c07b, 0 0 10px rgba(229,192,123,0.4)"
                  : "0 2px 5px rgba(0,0,0,0.35)",
              }}
            >
              <div
                className="flex items-center justify-center text-[11px] font-medium truncate px-2"
                style={{
                  height: HEADER_H,
                  color: "#333333",
                  background: "#e0d7ff",
                  borderBottom: "1px solid #c9c4e8",
                }}
              >
                {c.id}
              </div>
              {c.attrs.length > 0 && (
                <div
                  className="px-2"
                  style={{ borderBottom: "1px solid #ddd6ff", paddingTop: 6 }}
                >
                  {c.attrs.map((m, i) => (
                    <div
                      key={`a-${i}`}
                      className="truncate text-[10px] font-mono text-[#3a7d44]"
                      style={{ lineHeight: `${MEMBER_H}px` }}
                    >
                      {m}
                    </div>
                  ))}
                </div>
              )}
              {c.methods.length > 0 && (
                <div className="px-2" style={{ paddingTop: 6 }}>
                  {c.methods.map((m, i) => (
                    <div
                      key={`m-${i}`}
                      className="truncate text-[10px] font-mono text-[#1c5a85]"
                      style={{ lineHeight: `${MEMBER_H}px` }}
                    >
                      {m}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}