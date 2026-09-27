// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — Mermaid Gantt Canvas
//
// Custom gantt rendering for the non-flowchart visual editor: draws the date
// axis and per-task blocks spanning their start/end dates, grouped by section,
// with milestones shown as diamonds. Clicking a bar selects the element in the
// editor list so it can be renamed / deleted.
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import { useMemo, useState } from "react";
import { parseGantt, type GanttTask } from "./LCFileView.DisplayMode.Mermaid.Flow";
import type { LayoutSelection } from "./LCFileView.DisplayMode.Mermaid.Layout";

const DAY_MS = 86400000;
const DAY_W = 30;
const LABEL_W = 170;
const ROW_H = 34;
const HEADER_H = 34;
const SECTION_H = 22;

// Mermaid-style gantt bar palette (pastel, alternating per section).
const BAR_COLORS = ["#7bb661", "#81b1d2", "#dbb067", "#b39ddb", "#e07b8a"];

export interface GanttCanvasProps {
  lines: string[];
  selection: LayoutSelection | null;
  onSelect: (sel: LayoutSelection | null) => void;
  /** Persist an edited start date / day count. */
  onUpdateGantt?: (name: string, startIso: string, days: number) => void;
}

interface GanttSection {
  name: string;
  tasks: GanttTask[];
}

export default function GanttCanvas({
  lines,
  selection,
  onSelect,
  onUpdateGantt,
}: GanttCanvasProps) {
  const content = useMemo(() => lines.join("\n"), [lines]);
  const tasks = useMemo(() => parseGantt(content), [content]);
  const [editing, setEditing] = useState<{
    name: string;
    idx: number;
    start: string;
    days: number;
  } | null>(null);
  const [editStart, setEditStart] = useState("");
  const [editDays, setEditDays] = useState("");

  const { sections, globalStart, globalEnd } = useMemo(() => {
    let min = tasks.length ? new Date(tasks[0].start) : new Date();
    let max = tasks.length ? new Date(tasks[0].end) : new Date(min);
    for (const t of tasks) {
      if (t.start.getTime() < min.getTime()) min = new Date(t.start);
      if (t.end.getTime() > max.getTime()) max = new Date(t.end);
    }

    const groups = new Map<string, GanttTask[]>();
    for (const t of tasks) {
      const key = t.section ?? "Tasks";
      const list = groups.get(key) ?? [];
      list.push(t);
      groups.set(key, list);
    }
    const sections: GanttSection[] = [...groups.entries()].map(
      ([name, ts]) => ({ name, tasks: ts }),
    );
    return { sections, globalStart: min, globalEnd: max };
  }, [tasks]);

  const dayCount = Math.max(
    1,
    Math.round((globalEnd.getTime() - globalStart.getTime()) / DAY_MS) + 1,
  );
  const chartWidth = dayCount * DAY_W;

  const dayIndex = (d: Date) =>
    Math.max(0, Math.round((d.getTime() - globalStart.getTime()) / DAY_MS));

  const pad = (n: number) => String(n).padStart(2, "0");
  const isoOf = (d: Date) =>
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

  const taskTopY = (name: string) => {
    let y = HEADER_H;
    for (const sec of sections) {
      const ti = sec.tasks.findIndex((t) => t.id === name);
      if (ti >= 0) return y + SECTION_H + ti * ROW_H;
      y += SECTION_H + sec.tasks.length * ROW_H;
    }
    return HEADER_H;
  };

  const beginEdit = (e: React.MouseEvent, task: GanttTask) => {
    e.stopPropagation();
    if (!onUpdateGantt) return;
    const iso = isoOf(task.start);
    setEditing({ name: task.id, idx: dayIndex(task.start), start: iso, days: task.days });
    setEditStart(iso);
    setEditDays(String(task.days));
  };

  const commitEdit = () => {
    if (editing && onUpdateGantt) {
      const start = editStart.trim();
      const days = parseInt(editDays, 10);
      if (start && !Number.isNaN(days)) {
        onUpdateGantt(editing.name, start, days);
      }
    }
    setEditing(null);
  };

  const dateCells = useMemo(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    // One month label per month, centered over its own span so nothing overlaps.
    const months: Array<{ idx: number; count: number; label: string }> = [];
    let curMonth = "";
    for (let i = 0; i < dayCount; i++) {
      const d = new Date(globalStart.getTime() + i * DAY_MS);
      const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
      if (key !== curMonth) {
        curMonth = key;
        months.push({
          idx: i,
          count: 0,
          label: `${monthNames[d.getUTCMonth()]} ${d.getUTCFullYear()}`,
        });
      }
    }
    months.forEach((m, mi) => {
      const next = mi + 1 < months.length ? months[mi + 1].idx : dayCount;
      months[mi].count = next - m.idx;
    });
    // Day-of-month number under every column.
    const days: Array<{ idx: number; label: string }> = [];
    for (let i = 0; i < dayCount; i++) {
      const d = new Date(globalStart.getTime() + i * DAY_MS);
      days.push({ idx: i, label: String(d.getUTCDate()) });
    }
    return { months, days };
  }, [globalStart, dayCount]);

  if (tasks.length === 0) {
    return (
      <div className="flex-1 min-h-0 overflow-auto bg-[#1e1e1e] flex items-center justify-center">
        <p className="text-xs text-[#858585]">No dated tasks found in this gantt.</p>
      </div>
    );
  }

  const fmt = (d: Date) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;

  return (
    <div className="flex-1 min-h-0 overflow-auto bg-[#1e1e1e]">
      <div style={{ width: LABEL_W + chartWidth, position: "relative" }}>
        {/* Date axis */}
        <div style={{ height: HEADER_H, display: "flex" }}>
          <div
            style={{
              width: LABEL_W,
              minWidth: LABEL_W,
              position: "sticky",
              left: 0,
              zIndex: 5,
              background: "#252526",
              borderBottom: "1px solid #333333",
              borderRight: "1px solid #333333",
              display: "flex",
              alignItems: "center",
              padding: "0 8px",
            }}
          >
            <span className="text-[10px] uppercase tracking-wider text-[#858585]">Dates</span>
          </div>
          <div style={{ width: chartWidth, position: "relative", borderBottom: "1px solid #333333" }}>
            {Array.from({ length: dayCount }).map((_, i) => (
              <div
                key={`g-${i}`}
                style={{
                  position: "absolute",
                  left: i * DAY_W,
                  top: 0,
                  bottom: 0,
                  width: 1,
                  background: i % 7 === 0 ? "#3a3a3a" : "#2a2a2a",
                }}
              />
            ))}
            {/* Month labels, centered over their own span */}
            {dateCells.months.map((m) => (
              <div
                key={`mo-${m.idx}`}
                style={{
                  position: "absolute",
                  left: Math.max(m.idx * DAY_W + (m.count * DAY_W) / 2, 30),
                  top: 2,
                  transform: "translateX(-50%)",
                  fontSize: 10,
                  color: "#e5c07b",
                  whiteSpace: "nowrap",
                  fontFamily: "monospace",
                  textShadow: "0 0 4px #1e1e1e",
                }}
              >
                {m.label}
              </div>
            ))}
            {/* Day-of-month numbers in their own row below */}
            <div className="absolute left-0 right-0" style={{ top: 16, height: 16 }}>
              {dateCells.days.map((d) => (
                <span
                  key={`d-${d.idx}`}
                  style={{
                    position: "absolute",
                    left: d.idx * DAY_W + DAY_W / 2,
                    transform: "translateX(-50%)",
                    fontSize: 8,
                    color: "#858585",
                    whiteSpace: "nowrap",
                    fontFamily: "monospace",
                  }}
                >
                  {d.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Sections + task rows */}
        {sections.map((sec, secIndex) => (
          <div key={sec.name}>
            {/* Section header */}
            <div style={{ height: SECTION_H, display: "flex", background: "#202020" }}>
              <div
                style={{
                  width: LABEL_W,
                  minWidth: LABEL_W,
                  position: "sticky",
                  left: 0,
                  zIndex: 4,
                  background: "#202020",
                  borderRight: "1px solid #333333",
                  display: "flex",
                  alignItems: "center",
                  padding: "0 8px",
                }}
              >
                <span className="text-[10px] uppercase tracking-wider text-[#e5c07b]">
                  {sec.name}
                </span>
              </div>
              <div style={{ width: chartWidth, borderRight: "1px solid #333333" }} />
            </div>

            {sec.tasks.map((task) => {
              const idx = dayIndex(task.start);
              const width = task.milestone ? DAY_W : Math.max(DAY_W, task.days * DAY_W);
              const sel = selection?.type === "node" && selection.key === task.id;
              const barColor = BAR_COLORS[secIndex % BAR_COLORS.length];
              return (
                <div
                  key={task.id}
                  style={{ height: ROW_H, display: "flex", background: sel ? "#2b2a26" : "#1e1e1e" }}
                >
                  <div
                    style={{
                      width: LABEL_W,
                      minWidth: LABEL_W,
                      position: "sticky",
                      left: 0,
                      zIndex: 3,
                      background: sel ? "#2b2a26" : "#1e1e1e",
                      borderRight: "1px solid #333333",
                      borderBottom: "1px solid #2a2a2a",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "0 8px",
                    }}
                  >
                    <span
                      className="truncate text-[11px]"
                      style={{ color: sel ? "#e5c07b" : "#d4d4d4", maxWidth: "100%" }}
                    >
                      {task.label}
                    </span>
                  </div>
                  <div
                    style={{
                      width: chartWidth,
                      position: "relative",
                      borderRight: "1px solid #333333",
                      borderBottom: "1px solid #2a2a2a",
                    }}
                  >
                    {task.milestone ? (
                      <div
                        onClick={() => onSelect({ type: "node", key: task.id })}
                        onDoubleClick={(e) => beginEdit(e, task)}
                        title={`${task.label} · ${fmt(task.start)} · double-click to edit`}
                        style={{
                          position: "absolute",
                          left: idx * DAY_W + DAY_W / 2 - 6,
                          top: ROW_H / 2 - 6,
                          width: 12,
                          height: 12,
                          background: "#e5c07b",
                          border: "1.5px solid #1e1e1e",
                          transform: "rotate(45deg)",
                          cursor: "pointer",
                        }}
                      />
                    ) : (
                      <div
                        onClick={() => onSelect({ type: "node", key: task.id })}
                        onDoubleClick={(e) => beginEdit(e, task)}
                        title={`${task.label} · ${fmt(task.start)} → ${fmt(task.end)} · ${task.days}d · double-click to edit`}
                        style={{
                          position: "absolute",
                          left: idx * DAY_W + 2,
                          top: ROW_H / 2 - 8,
                          width: Math.max(DAY_W - 4, width - 4),
                          height: 16,
                          borderRadius: 4,
                          cursor: "pointer",
                          background: sel
                            ? "linear-gradient(90deg, #f0c674, #e5c07b)"
                            : `linear-gradient(90deg, ${barColor}, ${barColor}cc)`,
                          border: `1px solid ${sel ? "#e5c07b" : "rgba(0,0,0,0.25)"}`,
                        }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {/* Date / duration editor */}
        {editing && onUpdateGantt && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              left: LABEL_W + editing.idx * DAY_W + 8,
              top: taskTopY(editing.name) + ROW_H - 2,
              zIndex: 40,
            }}
          >
            <div className="flex items-center gap-1 bg-[#1e1e1e] border border-[#e5c07b] rounded-md p-1 shadow-xl">
              <input
                autoFocus
                value={editStart}
                onChange={(e) => setEditStart(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitEdit();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    setEditing(null);
                  }
                }}
                className="w-28 h-6 bg-[#252526] border border-[#444444] rounded text-[#d4d4d4] text-xs outline-none px-1.5 font-mono"
                placeholder="YYYY-MM-DD"
                spellCheck={false}
              />
              <input
                value={editDays}
                onChange={(e) => setEditDays(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitEdit();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    setEditing(null);
                  }
                }}
                className="w-14 h-6 bg-[#252526] border border-[#444444] rounded text-[#d4d4d4] text-xs outline-none px-1.5 font-mono"
                placeholder="days"
                spellCheck={false}
              />
              <span className="text-[10px] text-[#858585]">days</span>
              <button
                type="button"
                onClick={commitEdit}
                className="text-[10px] px-1.5 py-0.5 rounded bg-[#333333] text-[#e5c07b] hover:bg-[#444444]"
              >
                OK
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}