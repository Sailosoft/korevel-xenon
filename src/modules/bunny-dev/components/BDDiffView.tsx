"use client";

// BDDiffView — a line-by-line unified diff between two strings, in the
// editor's dark theme. Used by the file AI assistant to preview changes.

import { useMemo, useState } from "react";
import { diffLines, type Change } from "diff";
import { ChevronDown, ChevronRight, FileCode } from "lucide-react";
import { cn } from "@heroui/react";

export interface BDDiffViewProps {
  /** Original content (before the AI patches). */
  original: string;
  /** Modified content (after the AI patches). */
  modified: string;
  /** Optional label shown in the header (e.g. the file name). */
  fileName?: string;
  className?: string;
  /** Start collapsed. Defaults to true. */
  defaultCollapsed?: boolean;
}

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
    if (chunkLines[chunkLines.length - 1] === "") chunkLines.pop();

    if (change.added) {
      for (const text of chunkLines) {
        rightLine += 1;
        lines.push({ key: key++, kind: "add", text, lineNumber: rightLine });
        added += 1;
      }
    } else if (change.removed) {
      for (const text of chunkLines) {
        leftLine += 1;
        lines.push({ key: key++, kind: "remove", text, lineNumber: leftLine });
        removed += 1;
      }
    } else {
      for (const text of chunkLines) {
        leftLine += 1;
        rightLine += 1;
        lines.push({ key: key++, kind: "same", text, lineNumber: leftLine });
      }
    }
  }

  return { lines, added, removed };
}

export function BDDiffView({
  original,
  modified,
  fileName,
  className,
  defaultCollapsed = false,
}: BDDiffViewProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const normalizedOriginal = (original ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
  const normalizedModified = (modified ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  const { lines, added, removed } = useMemo(
    () => buildLines(diffLines(normalizedOriginal, normalizedModified)),
    [normalizedOriginal, normalizedModified],
  );

  const totalChanges = added + removed;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-[#333333] bg-[#1e1e1e]",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setCollapsed((value) => !value)}
        className="flex w-full items-center gap-2 bg-[#252526] px-3 py-1.5 text-left transition-colors hover:bg-[#2d2d2d]"
      >
        <span className="text-[#858585]">
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </span>
        <FileCode className="h-3.5 w-3.5 shrink-0 text-[#e5c07b]" />
        <span className="truncate text-xs font-medium text-[#d4d4d4]">
          {fileName ?? "Changes"}
        </span>
        <span className="ml-auto text-[10px] text-[#858585]">
          <span className="text-[#98c379]">+{added}</span>
          <span className="mx-1">/</span>
          <span className="text-[#e06c75]">-{removed}</span>
          <span className="mx-1">·</span>
          <span>{totalChanges} changes</span>
        </span>
      </button>

      {!collapsed && (
        <div className="max-h-[50vh] overflow-auto">
          <table className="w-full border-collapse font-mono text-[11px] leading-[18px]">
            <tbody>
              {lines.map((line) => (
                <tr
                  key={line.key}
                  className={
                    line.kind === "add"
                      ? "bg-[#1e2d1e]"
                      : line.kind === "remove"
                        ? "bg-[#2d1e1e]"
                        : ""
                  }
                >
                  <td className="w-12 select-none border-r border-[#333333] px-2 text-right text-[10px] text-[#555]">
                    {line.kind === "remove" || line.kind === "same"
                      ? line.lineNumber
                      : ""}
                  </td>
                  <td className="w-5 select-none text-center text-[#555]">
                    {line.kind === "add"
                      ? "+"
                      : line.kind === "remove"
                        ? "-"
                        : " "}
                  </td>
                  <td
                    className={cn(
                      "whitespace-pre px-2",
                      line.kind === "add"
                        ? "text-[#98c379]"
                        : line.kind === "remove"
                          ? "text-[#e06c75]"
                          : "text-[#d4d4d4]",
                    )}
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

export default BDDiffView;
