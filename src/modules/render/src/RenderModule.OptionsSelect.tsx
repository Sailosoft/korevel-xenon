"use client";

// ───────────────────────────────────────────────────────────────────────────────
// Render Module — RenderOptionsSelect Component
//
// A dropdown/select component that lists all registered render formats.
// Each module that has registered custom adapters will see their options
// appear automatically.
//
// Usage:
// ```tsx
// <RenderOptionsSelect
//   value={format}
//   onChange={(format) => setFormat(format)}
// />
//
// // Only show options from a specific module:
// <RenderOptionsSelect
//   sourceModule="lemon-coder"
//   value={format}
//   onChange={setFormat}
// />
// ```
// ───────────────────────────────────────────────────────────────────────────────

import { useRenderOptions } from "./RenderModule.UseRenderOptions";
import type { RenderFormat, RenderOptionItem } from "./RenderModule.Types";

export interface RenderOptionsSelectProps {
  /** Currently selected format */
  value: RenderFormat;
  /** Called when the user selects a different format */
  onChange: (format: RenderFormat) => void;
  /** Optional: filter to only formats from a specific source module */
  sourceModule?: string;
  /** Optional CSS class name */
  className?: string;
  /** Optional placeholder when no options are available */
  placeholder?: string;
  /** Whether to show description in tooltip. Defaults to true */
  showDescriptions?: boolean;
  /** Whether to group options by source module. Defaults to false */
  groupByModule?: boolean;
  /** Disabled state */
  disabled?: boolean;
}

/**
 * A select dropdown populated with all registered render formats.
 * Built-in formats appear first, followed by module-registered formats.
 */
export default function RenderOptionsSelect({
  value,
  onChange,
  sourceModule,
  className = "",
  placeholder = "Select render format...",
  showDescriptions = true,
  groupByModule = false,
  disabled = false,
}: RenderOptionsSelectProps) {
  const options = useRenderOptions(sourceModule);

  if (options.length === 0) {
    return (
      <select
        disabled
        className={className}
        style={{
          padding: "0.375rem 0.75rem",
          borderRadius: "6px",
          border: "1px solid #444",
          background: "#1a1a1a",
          color: "#858585",
          fontSize: "0.8rem",
          cursor: "not-allowed",
        }}
      >
        <option>{placeholder}</option>
      </select>
    );
  }

  // Group by source module if requested
  const groups = groupByModule
    ? groupBySourceModule(options)
    : [{ label: "Formats", items: options }];

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value as RenderFormat);
  };

  return (
    <select
      value={value}
      onChange={handleChange}
      disabled={disabled}
      className={className}
      style={{
        padding: "0.375rem 0.75rem",
        borderRadius: "6px",
        border: "1px solid #444444",
        background: "#1a1a1a",
        color: "#d4d4d4",
        fontSize: "0.8rem",
        cursor: disabled ? "not-allowed" : "pointer",
        maxWidth: "100%",
      }}
    >
      {groups.map((group, gi) => (
        <optgroup key={gi} label={group.label}>
          {group.items.map((opt) => (
            <option
              key={opt.format}
              value={opt.format}
              title={showDescriptions ? opt.description : undefined}
            >
              {opt.displayName}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

// ─── Grouping helper ────────────────────────────────────────────────────────

interface OptionGroup {
  label: string;
  items: RenderOptionItem[];
}

function groupBySourceModule(options: RenderOptionItem[]): OptionGroup[] {
  const groups = new Map<string, RenderOptionItem[]>();

  for (const opt of options) {
    const key = opt.isBuiltin ? "Built-in" : (opt.sourceModule ?? "Other");
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(opt);
  }

  const result: OptionGroup[] = [];
  // Built-in first
  const builtins = groups.get("Built-in");
  if (builtins) {
    result.push({ label: "Built-in", items: builtins });
    groups.delete("Built-in");
  }
  // Then alphabetical by module
  const rest = Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  for (const [label, items] of rest) {
    result.push({ label, items });
  }

  return result;
}
