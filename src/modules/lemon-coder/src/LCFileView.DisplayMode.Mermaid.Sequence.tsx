// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — Mermaid Sequence Canvas
//
// Custom sequence-diagram rendering for the visual editor: actors as columns
// with lifelines, messages as labeled arrows between the lifelines, and notes
// skipped. Clicking an actor selects the element in the editor list.
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import { useMemo } from "react";
import type { LayoutSelection } from "./LCFileView.DisplayMode.Mermaid.Layout";

const COL_W = 200;
const HEADER_H = 74;
const ROW_H = 30;
const SEQ_ARROW_ID = "lc-seq-arrow";

export interface SequenceCanvasProps {
  lines: string[];
  selection: LayoutSelection | null;
  onSelect: (sel: LayoutSelection | null) => void;
}

interface SeqActor {
  id: string;
  label: string;
}

interface SeqMessage {
  from: string;
  to: string;
  text: string;
  dashed: boolean;
}

function parseSequence(lines: string[]): {
  actors: SeqActor[];
  messages: SeqMessage[];
} {
  const actorsMap = new Map<string, string>();
  const messages: SeqMessage[] = [];

  for (const raw of lines) {
    const t = raw.trim();
    if (!t || t.startsWith("%%") || t.startsWith("#")) continue;
    if (/^(sequenceDiagram|title|accTitle|accDescr)\b/i.test(t)) continue;
    const part = t.match(
      /^(?:participant|actor)\s+([A-Za-z0-9_\-\.]+)(?:\s+as\s+(.+))?$/i,
    );
    if (part) {
      actorsMap.set(part[1], (part[2] ?? part[1]).trim().replace(/["']/g, ""));
      continue;
    }
    const msg = t.match(
      /^([A-Za-z0-9_\-\.]+)\s*((?:-\.?|--?)+[>xo)]*)\s*([A-Za-z0-9_\-\.]+)\s*:?\s*(.*)$/i,
    );
    if (msg) {
      messages.push({
        from: msg[1],
        to: msg[3],
        text: msg[4]?.trim() ?? "",
        dashed: msg[2].includes(".") || msg[2].startsWith("--"),
      });
      if (!actorsMap.has(msg[1])) actorsMap.set(msg[1], msg[1]);
      if (!actorsMap.has(msg[3])) actorsMap.set(msg[3], msg[3]);
    }
    // notes / loops / alt / rect are skipped
  }

  const actors: SeqActor[] = [...actorsMap.entries()].map(([id, label]) => ({
    id,
    label,
  }));
  return { actors, messages };
}

export default function SequenceCanvas({
  lines,
  selection,
  onSelect,
}: SequenceCanvasProps) {
  const { actors, messages } = useMemo(() => parseSequence(lines), [lines]);

  if (actors.length === 0) {
    return (
      <div className="flex-1 min-h-0 overflow-auto bg-[#1e1e1e] flex items-center justify-center">
        <p className="text-xs text-[#858585]">No actors or messages found in this sequence.</p>
      </div>
    );
  }

  const centerX = (i: number) => i * COL_W + COL_W / 2;
  const width = Math.max(COL_W, actors.length * COL_W);
  const height = HEADER_H + messages.length * ROW_H + 24;

  return (
    <div className="flex-1 min-h-0 overflow-auto bg-[#1e1e1e] p-3">
      <div style={{ width, height, position: "relative" }}>
        {/* Lifelines */}
        {actors.map((a, i) => (
          <div
            key={`ll-${a.id}`}
            style={{
              position: "absolute",
              left: centerX(i) - 0.5,
              top: HEADER_H - 12,
              bottom: 0,
              width: 1,
              borderLeft: "1px dashed #3a3a3a",
            }}
          />
        ))}

        {/* Actor headers */}
        {actors.map((a, i) => {
          const sel = selection?.type === "node" && selection.key === a.id;
          return (
            <div
              key={`a-${a.id}`}
              onClick={() => onSelect({ type: "node", key: a.id })}
              style={{
                position: "absolute",
                left: centerX(i) - COL_W / 2 + 20,
                top: 10,
                width: COL_W - 40,
                height: 46,
                background: "#ECECFF",
                border: `1.5px solid ${sel ? "#e5c07b" : "#9370DB"}`,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                zIndex: 2,
                boxShadow: sel
                  ? "0 0 0 1px #e5c07b, 0 0 10px rgba(229,192,123,0.4)"
                  : "0 2px 5px rgba(0,0,0,0.35)",
              }}
            >
              <span
                className="truncate text-[11px]"
                style={{ color: "#333333", maxWidth: "100%", padding: "0 6px" }}
              >
                {a.label}
              </span>
            </div>
          );
        })}

        {/* Messages */}
        {messages.map((m, idx) => {
          const aIdx = actors.findIndex((x) => x.id === m.from);
          const bIdx = actors.findIndex((x) => x.id === m.to);
          if (aIdx < 0 || bIdx < 0) return null;
          const x1 = centerX(aIdx);
          const x2 = centerX(bIdx);
          const y = HEADER_H + 8 + idx * ROW_H;
          const mid = (x1 + x2) / 2;
          return (
            <div key={`m-${idx}`} className="pointer-events-none" style={{ position: "absolute", inset: 0 }}>
              <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
                <defs>
                  <marker
                    id={SEQ_ARROW_ID}
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="7"
                    markerHeight="7"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#6b7280" />
                  </marker>
                </defs>
                <line
                  x1={x1}
                  y1={y}
                  x2={x2}
                  y2={y}
                  stroke="#6b7280"
                  strokeWidth={1.5}
                  strokeDasharray={m.dashed ? "5 4" : undefined}
                  markerEnd={`url(#${SEQ_ARROW_ID})`}
                />
              </svg>
              {m.text && (
                <div
                  className="absolute flex justify-center"
                  style={{ left: mid - 70, top: y - 22, width: 140 }}
                >
                  <span
                    className="px-2 py-0.5 text-[10px] text-[#333333] bg-white border border-[#c9c4e8] rounded-full whitespace-nowrap"
                    style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.25)" }}
                  >
                    {m.text}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}