// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — Mermaid ER Diagram Canvas
//
// Custom ERD rendering for the visual editor: entities as table boxes with
// their attributes (with PK/FK/UK badges), and relationships drawn between the
// boxes with their cardinality markers and labels. Clicking an entity selects
// it for rename / delete.
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import { useMemo } from "react";
import type { LayoutSelection } from "./LCFileView.DisplayMode.Mermaid.Layout";

const ENTITY_W = 230;
const ATTR_H = 22;
const HEADER_H = 30;
const COLS = 3;
const COL_GAP = 90;
const ROW_GAP = 60;

export interface ErdCanvasProps {
  lines: string[];
  selection: LayoutSelection | null;
  onSelect: (sel: LayoutSelection | null) => void;
}

interface ErdEntity {
  id: string;
  attrs: string[];
}

interface ErdRel {
  from: string;
  to: string;
  label: string | null;
  leftCard: string;
  rightCard: string;
}

function parseErd(lines: string[]): { entities: ErdEntity[]; rels: ErdRel[] } {
  const entities: ErdEntity[] = [];
  const rels: ErdRel[] = [];
  const byId = new Map<string, ErdEntity>();
  let current: ErdEntity | null = null;

  const pushAttr = (line: string) => {
    if (!current) return;
    current.attrs.push(line.trim());
  };

  for (const raw of lines) {
    const t = raw.trim();
    if (!t || t.startsWith("%%") || t.startsWith("#")) continue;
    if (/^(erDiagram|title|accTitle|accDescr)\b/i.test(t)) continue;
    if (t === "}") {
      current = null;
      continue;
    }
    const open = t.match(/^([A-Za-z0-9_]+)\s*\{/);
    if (open) {
      const ent = byId.get(open[1]) ?? { id: open[1], attrs: [] };
      entities.push(ent);
      byId.set(ent.id, ent);
      current = ent;
      continue;
    }
    const rel = t.match(
      /^([A-Za-z0-9_]+)\s*((?:\|\||\|\{|\}\||\||o\{|\}|o)+\s*(?:--|\.\.)\s*(?:\|\||\|\{|\}\||\||o\{|\}|o)+)\s*([A-Za-z0-9_]+)(?:\s*:\s*(.*))?$/i,
    );
    if (rel) {
      const cards = rel[2].replace(/\s+/g, " ");
      const [leftCard, rightCard] = cards.split(/\s+--+\s+|\s+\.\.\s+/);
      rels.push({
        from: rel[1],
        to: rel[3],
        label: rel[4]?.trim() || null,
        leftCard: (leftCard ?? "").trim(),
        rightCard: (rightCard ?? "").trim(),
      });
      if (!byId.has(rel[1])) {
        const ent = { id: rel[1], attrs: [] };
        entities.push(ent);
        byId.set(ent.id, ent);
      }
      if (!byId.has(rel[3])) {
        const ent = { id: rel[3], attrs: [] };
        entities.push(ent);
        byId.set(ent.id, ent);
      }
      continue;
    }
    // attribute line (inside an entity block)
    if (current && /^[A-Za-z0-9_]+(\s+[A-Za-z0-9_]+)+(\s+(PK|FK|UK))?$/.test(t)) {
      pushAttr(t);
    }
  }

  return { entities, rels };
}

export default function ErdCanvas({
  lines,
  selection,
  onSelect,
}: ErdCanvasProps) {
  const { entities, rels } = useMemo(() => parseErd(lines), [lines]);

  if (entities.length === 0) {
    return (
      <div className="flex-1 min-h-0 overflow-auto bg-[#1e1e1e] flex items-center justify-center">
        <p className="text-xs text-[#858585]">No entities found in this ER diagram.</p>
      </div>
    );
  }

const boxesById = new Map<
    string,
    { id: string; x: number; y: number; w: number; h: number }
  >;
  {
    const rowHeights: number[] = [];
    entities.forEach((e, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const h = HEADER_H + Math.max(1, e.attrs.length) * ATTR_H;
      rowHeights[row] = Math.max(rowHeights[row] ?? 0, h);
    });
    const rowY: number[] = [];
    let acc = 0;
    for (let r = 0; r < rowHeights.length; r++) {
      rowY[r] = acc;
      acc += (rowHeights[r] ?? 0) + ROW_GAP;
    }
    entities.forEach((e, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const h = HEADER_H + Math.max(1, e.attrs.length) * ATTR_H;
      boxesById.set(e.id, {
        id: e.id,
        x: col * (ENTITY_W + COL_GAP) + 20,
        y: (rowY[row] ?? 0) + 20,
        w: ENTITY_W,
        h,
      });
    });
  }

  const width =
    Math.min(COLS, entities.length) * (ENTITY_W + COL_GAP) + 60;
  const height = (() => {
    let maxY = 0;
    boxesById.forEach((b) => (maxY = Math.max(maxY, b.y + b.h)));
    return maxY + 60;
  })();

  return (
    <div className="flex-1 min-h-0 overflow-auto bg-[#1e1e1e] p-3">
      <div style={{ width, height, position: "relative" }}>
        {/* Relations */}
        <svg
          className="absolute pointer-events-none"
          style={{ left: 0, top: 0, overflow: "visible" }}
        >
          {rels.map((r, i) => {
            const a = boxesById.get(r.from);
            const b = boxesById.get(r.to);
            if (!a || !b) return null;
            const x1 = a.x + a.w / 2;
            const y1 = a.y + a.h / 2;
            const x2 = b.x + b.w / 2;
            const y2 = b.y + b.h / 2;
            const label = r.label;
            const labelW = label ? label.length * 6.4 + 16 : 0;
            return (
              <g key={`r-${i}`}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#6b7280"
                  strokeWidth={1.5}
                />
                {r.leftCard && (
                  <text x={x1 + (x2 - x1) * 0.08} y={y1 + (y2 - y1) * 0.08 - 4} fill="#e5c07b" fontSize={10} fontFamily="monospace">
                    {r.leftCard}
                  </text>
                )}
                {r.rightCard && (
                  <text x={x1 + (x2 - x1) * 0.92} y={y1 + (y2 - y1) * 0.92 - 4} fill="#e5c07b" fontSize={10} fontFamily="monospace">
                    {r.rightCard}
                  </text>
                )}
                {label && (
                  <g>
                    <rect
                      x={(x1 + x2) / 2 - labelW / 2}
                      y={(y1 + y2) / 2 - 13}
                      width={labelW}
                      height={17}
                      rx={8.5}
                      fill="#ffffff"
                    />
                    <text
                      x={(x1 + x2) / 2}
                      y={(y1 + y2) / 2 + 0.5}
                      textAnchor="middle"
                      fill="#333333"
                      fontSize={10}
                      fontFamily="monospace"
                    >
                      {label}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        {/* Entity boxes */}
        {entities.map((e) => {
          const b = boxesById.get(e.id);
          if (!b) return null;
          const sel = selection?.type === "node" && selection.key === e.id;
          return (
            <div
              key={e.id}
              onClick={() => onSelect({ type: "node", key: e.id })}
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
                style={{ height: HEADER_H, color: sel ? "#333333" : "#333333", background: "#e0d7ff", borderBottom: "1px solid #c9c4e8" }}
              >
                {e.id}
              </div>
              {e.attrs.map((attr, ai) => {
                const pk = /\bPK\b/i.test(attr);
                const fk = /\bFK\b/i.test(attr);
                const uk = /\bUK\b/i.test(attr);
                const tokens = attr.trim().split(/\s+/);
                const name = tokens.filter((tk) => !/^(PK|FK|UK)$/i.test(tk)).join(" ");
                return (
                  <div
                    key={`attr-${ai}`}
                    className="flex items-center gap-1.5 px-2"
                    style={{ height: ATTR_H, borderBottom: "1px solid #ddd6ff" }}
                  >
                    <span className="truncate text-[10px] text-[#333333] font-mono flex-1 w-0">{name}</span>
                    {pk && <span className="text-[9px] px-1 rounded bg-[#e5c07b]/25 text-[#8a6d1a]">PK</span>}
                    {fk && <span className="text-[9px] px-1 rounded bg-[#61afef]/25 text-[#1c5a85]">FK</span>}
                    {uk && <span className="text-[9px] px-1 rounded bg-[#98c379]/25 text-[#2c5a1f]">UK</span>}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}