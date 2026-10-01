"use client";

// BDForm — config-first form renderer.
//
// Renders a grid of fields from declarative `BDFormField` descriptors and
// reports a merged value object on every change. BDSchemaForm adapts the App
// Builder's `BDAppField[]` domain model onto these descriptors.

import { useState, type ReactNode } from "react";
import { Plus, Trash2, Upload } from "lucide-react";
import { cn } from "@heroui/react";
import BDButton from "./BDButton";

export type BDFormFieldType =
  | "text"
  | "textarea"
  | "number"
  | "select"
  | "relationSelect"
  | "multiSelect"
  | "toggle"
  | "date"
  | "color"
  | "tags"
  | "keyValue"
  | "repeater"
  | "fileUpload"
  | "hidden";

export interface BDFormOption {
  label: string;
  value: string;
}

export interface BDFormField {
  name: string;
  label: string;
  type: BDFormFieldType;
  placeholder?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  options?: BDFormOption[];
  rows?: number;
  accept?: string;
  columnSpan?: 1 | 2 | 3 | 4 | 6 | 12 | "full";
  multiple?: boolean;
  /** Render select/relationSelect as a type-ahead input (large option sets). */
  searchable?: boolean;
}

export type BDFormValues = Record<string, unknown>;

export interface BDFormProps {
  fields: BDFormField[];
  value: BDFormValues;
  onChange: (value: BDFormValues) => void;
  onSubmit?: (value: BDFormValues) => void | Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  columns?: 1 | 2 | 3 | 4;
  isLoading?: boolean;
  error?: string | null;
  footer?: ReactNode;
  className?: string;
}

const SPAN_CLASSES: Record<string, string> = {
  "1": "col-span-1",
  "2": "col-span-2",
  "3": "col-span-3",
  "4": "col-span-4",
  "6": "col-span-6",
  "12": "col-span-12",
  full: "col-span-full",
};

const INPUT_CLASS =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-colors focus:border-blue-400 disabled:bg-slate-50";

function Label({
  field,
  children,
}: {
  field: BDFormField;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-slate-600">
        {field.label}
        {field.required && <span className="ml-0.5 text-red-500">*</span>}
      </span>
      {children}
      {field.helperText && (
        <span className="text-[11px] text-slate-400">{field.helperText}</span>
      )}
    </label>
  );
}

export function BDForm({
  fields,
  value,
  onChange,
  onSubmit,
  onCancel,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  columns = 2,
  isLoading = false,
  error = null,
  footer,
  className,
}: BDFormProps) {
  const [submitting, setSubmitting] = useState(false);

  const setField = (name: string, next: unknown) => {
    onChange({ ...value, [name]: next });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSubmit) return;
    setSubmitting(true);
    try {
      await onSubmit(value);
    } finally {
      setSubmitting(false);
    }
  };

  const gridCols =
    columns === 1
      ? "grid-cols-1"
      : columns === 2
        ? "grid-cols-1 md:grid-cols-2"
        : columns === 3
          ? "grid-cols-1 md:grid-cols-3"
          : "grid-cols-1 md:grid-cols-4";

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("flex flex-col gap-4", className)}
    >
      <div className={cn("grid gap-4", gridCols)}>
        {fields.map((field) => {
          const raw = value[field.name];
          const span = field.columnSpan
            ? SPAN_CLASSES[String(field.columnSpan)]
            : undefined;

          if (field.type === "hidden") return null;

          let control: ReactNode;

          switch (field.type) {
            case "textarea":
              control = (
                <textarea
                  value={typeof raw === "string" ? raw : ""}
                  onChange={(e) => setField(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  rows={field.rows ?? 4}
                  disabled={field.disabled}
                  className={INPUT_CLASS}
                />
              );
              break;

            case "number":
              control = (
                <input
                  type="number"
                  value={typeof raw === "number" ? raw : ""}
                  onChange={(e) =>
                    setField(
                      field.name,
                      e.target.value === "" ? undefined : Number(e.target.value),
                    )
                  }
                  placeholder={field.placeholder}
                  disabled={field.disabled}
                  className={INPUT_CLASS}
                />
              );
              break;

            case "select":
            case "relationSelect":
              control = field.searchable ? (
                <>
                  <input
                    list={`bd-${field.name}-options`}
                    value={typeof raw === "string" ? raw : ""}
                    onChange={(e) => setField(field.name, e.target.value)}
                    placeholder={field.placeholder ?? "Search…"}
                    disabled={field.disabled}
                    className={INPUT_CLASS}
                  />
                  <datalist id={`bd-${field.name}-options`}>
                    {field.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </datalist>
                </>
              ) : (
                <select
                  value={typeof raw === "string" ? raw : ""}
                  onChange={(e) => setField(field.name, e.target.value)}
                  disabled={field.disabled}
                  className={INPUT_CLASS}
                >
                  <option value="">{field.placeholder ?? "Select…"}</option>
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              );
              break;

            case "multiSelect": {
              const selected = Array.isArray(raw) ? (raw as string[]) : [];
              control = (
                <div className="bd-scroll flex max-h-40 flex-col gap-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
                  {field.options && field.options.length > 0 ? (
                    field.options.map((opt) => {
                      const checked = selected.includes(opt.value);
                      return (
                        <label
                          key={opt.value}
                          className="flex items-center gap-2 text-sm text-slate-700"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={field.disabled}
                            onChange={() =>
                              setField(
                                field.name,
                                checked
                                  ? selected.filter((v) => v !== opt.value)
                                  : [...selected, opt.value],
                              )
                            }
                          />
                          {opt.label}
                        </label>
                      );
                    })
                  ) : (
                    <span className="text-xs text-slate-400">No options.</span>
                  )}
                </div>
              );
              break;
            }

            case "toggle":
              control = (
                <button
                  type="button"
                  disabled={field.disabled}
                  onClick={() => setField(field.name, !raw)}
                  className={cn(
                    "flex h-9 w-16 items-center rounded-full p-1 transition-colors",
                    raw ? "bg-blue-500" : "bg-slate-300",
                  )}
                  aria-pressed={!!raw}
                >
                  <span
                    className={cn(
                      "h-7 w-7 rounded-full bg-white shadow transition-transform",
                      raw ? "translate-x-7" : "",
                    )}
                  />
                </button>
              );
              break;

            case "date":
              control = (
                <input
                  type="date"
                  value={typeof raw === "string" ? raw : ""}
                  onChange={(e) => setField(field.name, e.target.value)}
                  disabled={field.disabled}
                  className={INPUT_CLASS}
                />
              );
              break;

            case "color":
              control = (
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={typeof raw === "string" ? raw : "#1976d2"}
                    onChange={(e) => setField(field.name, e.target.value)}
                    disabled={field.disabled}
                    className="h-9 w-12 rounded border border-slate-200 bg-white"
                  />
                  <input
                    value={typeof raw === "string" ? raw : ""}
                    onChange={(e) => setField(field.name, e.target.value)}
                    disabled={field.disabled}
                    className={INPUT_CLASS}
                  />
                </div>
              );
              break;

            case "tags":
              control = (
                <input
                  value={
                    Array.isArray(raw) ? (raw as string[]).join(", ") : ""
                  }
                  onChange={(e) =>
                    setField(
                      field.name,
                      e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    )
                  }
                  placeholder={field.placeholder ?? "comma, separated, values"}
                  disabled={field.disabled}
                  className={INPUT_CLASS}
                />
              );
              break;

            case "keyValue":
              control = (
                <textarea
                  value={JSON.stringify(raw ?? {}, null, 2)}
                  onChange={(e) => {
                    try {
                      setField(field.name, JSON.parse(e.target.value));
                    } catch {
                      /* keep last valid JSON while typing */
                    }
                  }}
                  rows={field.rows ?? 4}
                  disabled={field.disabled}
                  className={cn(INPUT_CLASS, "font-mono text-xs")}
                />
              );
              break;

            case "repeater": {
              const items = Array.isArray(raw)
                ? (raw as Record<string, unknown>[])
                : [];
              control = (
                <div className="flex flex-col gap-2">
                  {items.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 rounded-lg border border-slate-200 p-2"
                    >
                      <textarea
                        value={JSON.stringify(item, null, 2)}
                        onChange={(e) => {
                          try {
                            const next = [...items];
                            next[index] = JSON.parse(e.target.value);
                            setField(field.name, next);
                          } catch {
                            /* ignore invalid JSON */
                          }
                        }}
                        rows={3}
                        className={cn(
                          INPUT_CLASS,
                          "font-mono text-xs",
                          "min-h-[60px]",
                        )}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setField(
                            field.name,
                            items.filter((_, i) => i !== index),
                          )
                        }
                        className="rounded p-2 text-slate-400 hover:bg-red-50 hover:text-red-500"
                        aria-label="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <BDButton
                    size="sm"
                    variant="secondary"
                    icon={Plus}
                    onClick={() => setField(field.name, [...items, {}])}
                  >
                    Add item
                  </BDButton>
                </div>
              );
              break;
            }

            case "fileUpload":
              control = (
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-500 hover:border-blue-400">
                  <Upload className="h-4 w-4" />
                  <span>
                    {typeof raw === "string" && raw
                      ? raw
                      : (field.placeholder ?? "Choose a file…")}
                  </span>
                  <input
                    type="file"
                    accept={field.accept}
                    multiple={field.multiple}
                    className="hidden"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (!files || files.length === 0) return;
                      setField(
                        field.name,
                        field.multiple
                          ? Array.from(files).map((f) => f.name)
                          : files[0].name,
                      );
                    }}
                  />
                </label>
              );
              break;

            default:
              control = (
                <input
                  value={typeof raw === "string" ? raw : ""}
                  onChange={(e) => setField(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  disabled={field.disabled}
                  className={INPUT_CLASS}
                />
              );
          }

          return (
            <div key={field.name} className={span}>
              <Label field={field}>{control}</Label>
            </div>
          );
        })}
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {(onSubmit || footer) && (
        <div className="flex items-center justify-end gap-2">
          {footer ?? (
            <>
              {onCancel && (
                <BDButton variant="ghost" onClick={onCancel}>
                  {cancelLabel}
                </BDButton>
              )}
              {onSubmit && (
                <BDButton
                  type="submit"
                  isLoading={submitting || isLoading}
                >
                  {submitLabel}
                </BDButton>
              )}
            </>
          )}
        </div>
      )}
    </form>
  );
}

export default BDForm;
