"use client";

import { cn } from "@heroui/react";
import { useMemo } from "react";
import {
  BunnyDisplayFieldConfig,
  BunnyFieldRendererProps,
} from "../BunnyForm.Interface";

/**
 * Resolves a value that may be a static string or a function receiving formData.
 */
function resolveValue<TForm = Record<string, unknown>>(
  value: string | ((formData: TForm) => string) | undefined,
  formData: TForm,
): string | undefined {
  if (typeof value === "function") return value(formData);
  return value;
}

/**
 * Renders a "display" form field — an information-only field that reacts
 * to form data changes and displays computed values.
 *
 * Modes:
 * - `"card"`: Styled card with title + subtitle
 * - `"badge"`: Compact badge/pill
 * - `"text"`: Plain text (title only)
 * - `"custom"`: Custom render function
 */
export default function BunnyFormDisplayField<TForm = Record<string, unknown>>({
  field,
  value,
  formData,
  onChange,
  error,
}: BunnyFieldRendererProps<TForm>) {
  const displayConfig = field.display as
    | BunnyDisplayFieldConfig<TForm>
    | undefined;

  const title = useMemo(() => {
    if (displayConfig?.title !== undefined) {
      return resolveValue(displayConfig.title, formData);
    }
    return value !== undefined && value !== null ? String(value) : "";
  }, [displayConfig?.title, formData, value]);

  const subtitle = useMemo(
    () => resolveValue(displayConfig?.subtitle, formData),
    [displayConfig?.subtitle, formData, displayConfig],
  );

  const mode = displayConfig?.mode ?? "card";

  // Custom mode — delegate to user-provided render function.
  if (mode === "custom" && displayConfig?.render) {
    return <>{displayConfig.render({ field, value, formData, onChange })}</>;
  }

  switch (mode) {
    case "badge":
      return (
        <div className="flex items-center gap-2">
          {field.label && (
            <span className="text-sm font-medium text-default-500">
              {field.label}
            </span>
          )}
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            {title}
          </span>
        </div>
      );

    case "text":
      return (
        <div className="flex flex-col gap-0.5">
          {field.label && (
            <span className="text-xs font-medium text-default-400 uppercase tracking-wider">
              {field.label}
            </span>
          )}
          <span className="text-sm text-default-700">{title}</span>
        </div>
      );

    case "card":
    default:
      return (
        <div
          className={cn(
            "rounded-lg border border-default-200 bg-default-50 p-4",
            "flex flex-col gap-1",
          )}
        >
          {field.label && (
            <span className="text-xs font-medium text-default-400 uppercase tracking-wider">
              {field.label}
            </span>
          )}
          {title && (
            <span className="text-sm font-semibold text-default-800">
              {title}
            </span>
          )}
          {subtitle && (
            <span className="text-xs text-default-500">{subtitle}</span>
          )}
        </div>
      );
  }
}
