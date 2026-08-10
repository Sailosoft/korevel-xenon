// bc.generative-ai.dialog.tsx
//
// Reusable "Generate with AI" dialog body used by the Case Base and Agent
// Persona header actions. It renders native inputs (proven in the Bunny dialog
// contentOnly mode) plus the Training Mode selector, and drives generation via
// a caller-provided `onGenerate` callback. Using native controls avoids the
// framework dialog form-field rendering for selects, so the Generate button and
// the option selector always work.

"use client";

import { useCallback, useState } from "react";
import type { BCGenAIOptionId, BCGenAIOptions } from "./bc.generative-ai.entity";
import { BC_GEN_AI_DEFAULT_OPTION_ID } from "./bc.generative-ai.entity";
import { BCGenAIOptionSelector } from "./bc.generative-ai.selector";

/** A simple field definition for the generate dialog. */
export interface BCGenAIDialogField {
  name: string;
  label: string;
  type: "text" | "textarea";
  placeholder?: string;
  required?: boolean;
  rows?: number;
}

export interface BCGenerateAIFormDialogProps {
  /** Dialog heading. */
  title: string;
  /** Optional helper text under the heading. */
  description?: string;
  /** The input fields to render. */
  fields: BCGenAIDialogField[];
  /** When true, renders the Training Mode selector. */
  includeOption?: boolean;
  /** Label for the primary generate button. */
  generateLabel?: string;
  /** Runs generation with the collected values + selected option. */
  onGenerate: (
    values: Record<string, string>,
    aiOptions?: BCGenAIOptions,
  ) => Promise<{ success: boolean; message?: string }>;
  /** Called after a successful generate (close + refresh + notify). */
  onSaved?: (result: { success: boolean; message?: string }) => void;
  /** Dismisses the dialog. */
  onClose: () => void;
}

export function BCGenerateAIFormDialog({
  title,
  description,
  fields,
  includeOption = false,
  generateLabel = "Generate",
  onGenerate,
  onSaved,
  onClose,
}: BCGenerateAIFormDialogProps) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.name, ""])),
  );
  const [aiOption, setAiOption] = useState<BCGenAIOptionId>(
    BC_GEN_AI_DEFAULT_OPTION_ID,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const setValue = useCallback((name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleGenerate = useCallback(async () => {
    setError("");
    const missing = fields.find(
      (f) => f.required && !(values[f.name] ?? "").trim(),
    );
    if (missing) {
      setError(`${missing.label} is required.`);
      return;
    }
    setLoading(true);
    try {
      const result = await onGenerate(values, includeOption ? aiOption : undefined);
      if (!result.success) {
        setError(result.message ?? "Generation failed.");
        return;
      }
      onSaved?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setLoading(false);
    }
  }, [fields, values, includeOption, aiOption, onGenerate, onSaved]);

  return (
    <div className="space-y-4 w-full">
      <div>
        <h2 className="text-lg font-bold text-slate-800">{title}</h2>
        {description && (
          <p className="text-sm text-slate-400 mt-0.5">{description}</p>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      <div className="space-y-3">
        {fields.map((f) => (
          <div key={f.name}>
            <label className="text-xs font-semibold text-slate-500 uppercase">
              {f.label}
              {f.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {f.type === "textarea" ? (
              <textarea
                rows={f.rows ?? 3}
                value={values[f.name] ?? ""}
                onChange={(e) => setValue(f.name, e.target.value)}
                placeholder={f.placeholder}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            ) : (
              <input
                type="text"
                value={values[f.name] ?? ""}
                onChange={(e) => setValue(f.name, e.target.value)}
                placeholder={f.placeholder}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            )}
          </div>
        ))}

        {includeOption && (
          <BCGenAIOptionSelector value={aiOption} onChange={setAiOption} />
        )}
      </div>

      <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="px-4 py-2 rounded-xl text-sm font-medium text-slate-500 border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? "Generating…" : generateLabel}
        </button>
      </div>
    </div>
  );
}
