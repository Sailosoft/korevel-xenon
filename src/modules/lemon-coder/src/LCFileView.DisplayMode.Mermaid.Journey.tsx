// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — Mermaid Journey Canvas
//
// Custom journey-diagram rendering for the visual editor combining the level
// approach (tasks plotted chronologically across status levels 1–5, each level
// with a face) with the hierarchy: title → sections → child tasks, and each
// task's status shown by its level/face and score. Clicking a task selects it
// for rename / delete.
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { LayoutSelection } from "./LCFileView.DisplayMode.Mermaid.Layout";

const ROW_H = 30;
const TASK_W = 110;
const SCORE_W = 44;
const HEADER_H = 30;
const LABEL_H = 26;
const TITLE_H = 34;

const SCORE_META: Array<{ score: number; face: string; color: string }> = [
  { score: 5, face: "😄", color: "#98c379" },
  { score: 4, face: "🙂", color: "#7ab56e" },
  { score: 3, face: "😐", color: "#61afef" },
  { score: 2, face: "😟", color: "#d19a66" },
  { score: 1, face: "😞", color: "#e06c75" },
];

const SECTION_TINTS = ["rgba(97,175,239,0.08)", "rgba(152,195,121,0.08)", "rgba(209,154,102,0.08)", "rgba(224,108,117,0.08)"];

export interface JourneyCanvasProps {
  lines: string[];
  selection: LayoutSelection | null;
  onSelect: (sel: LayoutSelection | null) => void;
  /** Persist a drag: set the task's status level / reorder it. */
  onUpdateJourney?: (name: string, score: number, toIndex: number) => void;
}

interface JourneyTask {
  name: string;
  score: number;
  people: string;
  section: string;
}

interface JourneySection {
  name: string;
  tasks: JourneyTask[];
}

function parseJourney(lines: string[]): { title: string; sections: JourneySection[] } {
  const sections: JourneySection[] = [];
  const byName = new Map<string, JourneySection>();
  let title = "";
  let current = "";
  let currentTasks: JourneyTask[] = [];

  const flush = () => {
    if (current && currentTasks.length) {
      const s = byName.get(current);
      if (s) s.tasks.push(...currentTasks);
      else {
        const ns = { name: current, tasks: currentTasks };
        sections.push(ns);
        byName.set(ns.name, ns);
      }
    }
    currentTasks = [];
  };

  for (const raw of lines) {
    const t = raw.trim();
    if (!t || t.startsWith("%%") || t.startsWith("#")) continue;
    if (/^(journey|accTitle|accDescr)\b/i.test(t)) continue;
    const titleMatch = t.match(/^title\s+(.+)$/i);
    if (titleMatch) {
      title = titleMatch[1].trim();
      continue;
    }
    const sec = t.match(/^section\s+(.+)$/i);
    if (sec) {
      flush();
      current = sec[1].trim();
      continue;
    }
    const task = t.match(/^([^:]+?)\s*:\s*(\d+)\s*:\s*(.*)$/);
    if (task) {
      currentTasks.push({
        name: task[1].trim(),
        score: Math.min(5, Math.max(1, parseInt(task[2], 10))),
        people: task[3].trim(),
        section: current,
      });
    }
  }
  flush();
  return { title, sections };
}

export default function JourneyCanvas({
  lines,
  selection,
  onSelect,
  onUpdateJourney,
}: JourneyCanvasProps) {
  const { title, sections } = useMemo(() => parseJourney(lines), [lines]);
  const allTasks = useMemo(() => sections.flatMap((s) => s.tasks), [sections]);
  const containerRef = useRef<HTMLDivElement>(null);

  const [drag, setDrag] = useState<{
    name: string;
    sectionStart: number;
    level: number;
    index: number;
    level0: number;
    index0: number;
    clientX: number;
    clientY: number;
  } | null>(null);

  const topOffset = title ? TITLE_H : 0;

  // ── Drag to adjust position (level = score, column = order) ─────────────
  const clamp = (v: number, lo: number, hi: number) =>
    Math.max(lo, Math.min(hi, v));
  const sectionIndexOf = (name: string) =>
    sections.findIndex((s) => s.tasks.some((t) => t.name === name));
  const sectionStartCol = (sIdx: number) =>
    sections.slice(0, sIdx).reduce((a, s) => a + s.tasks.length, 0);

  useEffect(() => {
    if (!drag) return;
    const onMove = (e: PointerEvent) => {
      setDrag((d) => {
        if (!d || !containerRef.current) return d;
        const rect = containerRef.current.getBoundingClientRect();
        const lx = e.clientX - rect.left;
        const ly = e.clientY - rect.top;
        const level = clamp(
          5 - Math.floor((ly - topOffset - HEADER_H) / ROW_H),
          1,
          5,
        );
        const col = Math.floor((lx - SCORE_W + 4) / TASK_W);
        const sIdx = sectionIndexOf(d.name);
        let index = d.index;
        if (sIdx >= 0) {
          const st = sectionStartCol(sIdx);
          index = clamp(col - st, 0, sections[sIdx].tasks.length - 1);
        }
        return { ...d, clientX: e.clientX, clientY: e.clientY, level, index };
      });
    };
    const onUp = () => {
      if (drag && onUpdateJourney) {
        if (drag.level !== drag.level0 || drag.index !== drag.index0) {
          onUpdateJourney(drag.name, drag.level, drag.index);
        }
      }
      setDrag(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag, onUpdateJourney, sections, topOffset]);

  if (allTasks.length === 0) {
    return (
      <div className="flex-1 min-h-0 overflow-auto bg-[#1e1e1e] flex items-center justify-center">
        <p className="text-xs text-[#858585]">No journey tasks found.</p>
      </div>
    );
  }

  const width = SCORE_W + allTasks.length * TASK_W + 24;
  const height = topOffset + HEADER_H + 5 * ROW_H + LABEL_H + 26;

  const taskOffsets = new Map<string, number>();
  let col = 0;
  allTasks.forEach((tk) => {
    taskOffsets.set(tk.name, col);
    col += 1;
  });
  const sectionStats = sections.map((s) => {
    let start = 0;
    for (const sec of sections) {
      if (sec === s) break;
      start += sec.tasks.length;
    }
    return { name: s.name, start, count: s.tasks.length };
  });

  const beginDrag = (
    e: React.PointerEvent,
    tk: JourneyTask,
  ) => {
    e.stopPropagation();
    const sIdx = sectionIndexOf(tk.name);
    const index =
      sIdx >= 0
        ? sections[sIdx].tasks.findIndex((t) => t.name === tk.name)
        : 0;
    setDrag({
      name: tk.name,
      sectionStart: sIdx >= 0 ? sectionStartCol(sIdx) : 0,
      level: tk.score,
      index,
      level0: tk.score,
      index0: index,
      clientX: e.clientX,
      clientY: e.clientY,
    });
    onSelect({ type: "node", key: tk.name });
  };

  return (
    <div className="flex-1 min-h-0 overflow-auto bg-[#1e1e1e] p-3">
      <div style={{ width, height, position: "relative" }}>
        {/* Title */}
        {title && (
          <div
            className="absolute flex items-center px-1"
            style={{ left: 0, top: 0, height: TITLE_H }}
          >
            <h2 className="text-sm font-semibold text-[#d4d4d4] truncate">
              {title}
            </h2>
          </div>
        )}

        {/* Section tinted bands */}
        {sectionStats.map((sec, si) => (
          <div
            key={`band-${si}`}
            className="pointer-events-none absolute"
            style={{
              left: SCORE_W + sec.start * TASK_W,
              top: topOffset + HEADER_H,
              width: sec.count * TASK_W,
              bottom: LABEL_H,
              background: SECTION_TINTS[si % SECTION_TINTS.length],
            }}
          />
        ))}

        {/* Section headers */}
        {sectionStats.map((sec, si) => (
          <div
            key={`h-${si}`}
            className="absolute flex items-center"
            style={{
              left: SCORE_W + sec.start * TASK_W,
              top: topOffset + 2,
              width: sec.count * TASK_W,
              height: HEADER_H - 4,
              justifyContent: "center",
              padding: "0 6px",
            }}
          >
            <span className="truncate text-[10px] uppercase tracking-wider text-[#e5c07b]">
              {sec.name}
            </span>
          </div>
        ))}

        {/* Time direction indicator */}
        <div
          className="absolute text-[10px] text-[#858585]"
          style={{ left: SCORE_W + allTasks.length * TASK_W - 40, top: topOffset + 8 }}
        >
          time →
        </div>

        {/* Status levels (face + colored band per score, level 5 at top) */}
        {SCORE_META.map((meta, ri) => {
          const y = topOffset + HEADER_H + ri * ROW_H;
          return (
            <div key={`row-${meta.score}`} className="pointer-events-none">
              {/* Level band */}
              <div
                className="absolute flex items-center"
                style={{
                  left: SCORE_W,
                  top: y,
                  width: allTasks.length * TASK_W,
                  height: ROW_H,
                  background: meta.color + "20",
                  borderBottom: "1px solid #2a2a2a",
                }}
              >
                <span
                  className="absolute right-1 text-[10px] text-[#858585]"
                  style={{ fontFamily: "monospace" }}
                >
                  {meta.score}
                </span>
              </div>
              {/* Face level */}
              <div
                className="absolute flex items-center justify-center"
                style={{ left: 0, top: y, width: SCORE_W, height: ROW_H, fontSize: 16 }}
              >
                {meta.face}
              </div>
            </div>
          );
        })}

        {/* Task blocks by level */}
        {allTasks.map((tk) => {
          const m = SCORE_META.find((x) => x.score === tk.score) ?? SCORE_META[4];
          const rowIdx = SCORE_META.findIndex((x) => x.score === tk.score);
          const c = taskOffsets.get(tk.name) ?? 0;
          const y = topOffset + HEADER_H + rowIdx * ROW_H;
          const sel = selection?.type === "node" && selection.key === tk.name;
          const isDragging = drag?.name === tk.name;
          return (
            <div
              key={tk.name}
              onClick={() => onSelect({ type: "node", key: tk.name })}
              onPointerDown={(e) => beginDrag(e, tk)}
              className="absolute flex items-center justify-center rounded"
              style={{
                left: SCORE_W + c * TASK_W + 3,
                top: y + 3,
                width: TASK_W - 6,
                height: ROW_H - 6,
                opacity: isDragging ? 0.35 : 1,
                background: sel
                  ? "linear-gradient(180deg, #f0c674, #e5c07b)"
                  : `linear-gradient(180deg, ${m.color}ee, ${m.color})`,
                border: sel ? "1.5px solid #e5c07b" : "1px solid rgba(0,0,0,0.25)",
                cursor: "grab",
                touchAction: "none",
                zIndex: 3,
                boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
              }}
              title={`${tk.name} · ${tk.people}`}
            >
              <span className="truncate text-[10px] text-white font-medium px-1">
                {tk.name}
              </span>
            </div>
          );
        })}

        {/* Drag ghost at the target position */}
        {drag && onUpdateJourney && (
          <div
            className="pointer-events-none absolute flex items-center justify-center rounded border-2 border-dashed"
            style={{
              left: SCORE_W + (drag.sectionStart + drag.index) * TASK_W + 3,
              top: topOffset + HEADER_H + (5 - drag.level) * ROW_H + 3,
              width: TASK_W - 6,
              height: ROW_H - 6,
              borderColor: "#e5c07b",
              background: "rgba(229,192,123,0.15)",
              zIndex: 5,
            }}
          >
            <span className="truncate text-[10px] text-[#e5c07b] px-1">
              {drag.name}
            </span>
          </div>
        )}

        {/* Task name + people labels */}
        {allTasks.map((tk) => {
          const c = taskOffsets.get(tk.name) ?? 0;
          const sel = selection?.type === "node" && selection.key === tk.name;
          return (
            <div
              key={`label-${tk.name}`}
              className="absolute text-center overflow-hidden"
              style={{
                left: SCORE_W + c * TASK_W,
                top: topOffset + HEADER_H + 5 * ROW_H + 2,
                width: TASK_W,
                color: sel ? "#e5c07b" : "#d4d4d4",
              }}
            >
              <div className="truncate text-[11px]" title={tk.name}>
                {tk.name}
              </div>
              {tk.people && (
                <div className="truncate text-[9px] text-[#858585]" title={tk.people}>
                  {tk.people}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}