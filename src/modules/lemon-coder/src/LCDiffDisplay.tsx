// ───────────────────────────────────────────────────────────────────────────────
// Lemon Coder — LCDiffDisplay Component
// Renders a line-by-line unified diff between original and modified content.
// Uses the `diff` package for text comparison.
// ───────────────────────────────────────────────────────────────────────────────

"use client";

import { useMemo, useState } from "react";
import { diffLines, type Change } from "diff";
import { ChevronDown, ChevronRight, FileCode } from "lucide-react";

export interface LCDiffDisplayProps {
  /** Original file content (from disk) */
  original: string;
  /** Modified file content (AI-generated) */
  modified: string;
  /** File name / path for the header */
  fileName: string;
  /** Whether the file already existed */
  isExisting: boolean;
  /** Default to collapsed state */
  defaultCollapsed?: boolean;
}

/**
 * Parse Change[] from the `diff` package into an array of line objects
 * with a stable key and styling metadata.
 */
interface DiffLine {
  key: number;
  kind: "add" | "remove" | "same";
  text: string;
  lineNumber: number;
}

function buildLines(changes: Change[]): {
  lines: DiffLine[];
  added: number;
  removed: number;
} {
  const lines: DiffLine[] = [];
  let added = 0;
  let removed = 0;
  let key = 0;
  let leftLine = 0;
  let rightLine = 0;

  for (const change of changes) {
    const chunkLines = change.value.split("\n");
    // Remove the trailing empty string from splitting
    if (chunkLines[chunkLines.length - 1] === "") {
      chunkLines.pop();
    }

    if (change.added) {
      for (const text of chunkLines) {
        rightLine++;
        lines.push({ key: key++, kind: "add", text, lineNumber: rightLine });
        added++;
      }
    } else if (change.removed) {
      for (const text of chunkLines) {
        leftLine++;
        lines.push({ key: key++, kind: "remove", text, lineNumber: leftLine });
        removed++;
      }
    } else {
      for (const text of chunkLines) {
        leftLine++;
        rightLine++;
        lines.push({ key: key++, kind: "same", text, lineNumber: leftLine });
      }
    }
  }

  return { lines, added, removed };
}

export default function LCDiffDisplay({
  original,
  modified,
  fileName,
  isExisting,
  defaultCollapsed = true,
}: LCDiffDisplayProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const { lines, added, removed } = useMemo(
    () => buildLines(diffLines(original ?? "", modified ?? "")),
    [original, modified],
  );

  const totalChanges = added + removed;

  return (
    <div className="rounded-md border border-[#333333] overflow-hidden bg-[#1e1e1e]">
      {/* Header / toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-2 w-full px-3 py-1.5 bg-[#252526] hover:bg-[#2d2d2d] transition-colors text-left"
      >
        <span className="text-[#858585]">
          {collapsed ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </span>
        <FileCode className="w-3.5 h-3.5 text-[#e5c07b] shrink-0" />
        <span className="text-xs text-[#d4d4d4] font-medium truncate">
          {fileName}
        </span>
        <span className="text-[10px] text-[#858585] ml-auto">
          {isExisting ? (
            <>
              <span className="text-[#98c379]">+{added}</span>
              <span className="mx-1">/</span>
              <span className="text-[#e06c75]">-{removed}</span>
              <span className="mx-1">·</span>
              <span>{totalChanges} changes</span>
            </>
          ) : (
            <span className="text-[#98c379]">New file · {modified.split("\n").length} lines</span>
          )}
        </span>
      </button>

      {/* Diff content */}
      {!collapsed && (
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full border-collapse font-mono text-[11px] leading-[18px]">
            <tbody>
              {lines.map((line) => (
                <tr
                  key={line.key}
                  className={`${
                    line.kind === "add"
                      ? "bg-[#1e2d1e]"
                      : line.kind === "remove"
                        ? "bg-[#2d1e1e]"
                        : ""
                  }`}
                >
                  {/* Line number */}
                  <td className="select-none text-right text-[10px] text-[#555] px-2 w-12 border-r border-[#333333]">
                    {line.kind === "remove" || line.kind === "same"
                      ? line.lineNumber
                      : ""}
                  </td>
                  {/* Diff marker */}
                  <td className="select-none text-center w-5 text-[#555]">
                    {line.kind === "add"
                      ? "+"
                      : line.kind === "remove"
                        ? "-"
                        : " "}
                  </td>
                  {/* Content */}
                  <td
                    className={`whitespace-pre px-2 ${
                      line.kind === "add"
                        ? "text-[#98c379]"
                        : line.kind === "remove"
                          ? "text-[#e06c75]"
                          : "text-[#d4d4d4]"
                    }`}
                  >
                    {line.text || " "}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
