"use client";

// BDAppRecordAI.Component — AI helper that fills record values for the
// rendered app's Create form. Sends the resource's field definitions plus the
// candidate options for relation/select fields so the AI can choose valid
// values. Supports a single record (merged into the form) or a batch (shown as
// a preview, then created on confirmation).

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Sparkles } from "lucide-react";
import { bdDB } from "../../BDDatabase";
import type { BDAppField } from "../../BDDomain.Types";
import type { BDFormOption, BDFormValues } from "../../components/BDForm";
import { buildRecordAIFields } from "./BDApp.Types";
import { useBDAISettings } from "../ai-settings/BDAISettings.Context";
import { bdGenerateAppRecord } from "./BDAppBuilder.Server";
import BDModal from "../../components/BDModal";
import BDButton from "../../components/BDButton";

export interface BDAppRecordAIComponentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  /** Label of the resource being created (prompt context). */
  resourceLabel?: string;
  /** Rendered form fields for the resource. */
  fields: BDAppField[];
  /** Relation option candidates keyed by field name. */
  relationOptions: Record<string, BDFormOption[]>;
  /** Current form values, sent as context. */
  current: BDFormValues;
  /** Merge a single generated record into the form. */
  onAccept: (values: Record<string, unknown>) => void;
  /** Create a generated batch of records. */
  onAcceptBatch: (records: Record<string, unknown>[]) => void | Promise<void>;
}

type RecordAIMode = "single" | "batch";

const MODES: { key: RecordAIMode; label: string; hint: string }[] = [
  { key: "single", label: "Single", hint: "Fill the form with one record" },
  { key: "batch", label: "Batch", hint: "Generate many records at once" },
];

export function BDAppRecordAIComponent({
  open,
  onOpenChange,
  projectId,
  resourceLabel,
  fields,
  relationOptions,
  current,
  onAccept,
  onAcceptBatch,
}: BDAppRecordAIComponentProps) {
  const { aiConfig: globalAiConfig } = useBDAISettings();

  // Per-project override (project-{id}) wins over the global singleton.
  const overrideKey = `project-${projectId}`;
  const projectOverride = useLiveQuery(
    () => bdDB.aiSettings.get(overrideKey),
    [overrideKey],
  );
  const aiConfig = projectOverride
    ? { provider: projectOverride.provider, model: projectOverride.model }
    : globalAiConfig;

  const [mode, setMode] = useState<RecordAIMode>("single");
  const [instruction, setInstruction] = useState("");
  const [minRecords, setMinRecords] = useState("");
  const [maxRecords, setMaxRecords] = useState("");
  const [preview, setPreview] = useState<Record<string, unknown>[] | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const busy = isGenerating || isCreating;

  const reset = () => {
    setInstruction("");
    setError(null);
    setPreview(null);
  };

  const close = () => {
    if (busy) return;
    reset();
    onOpenChange(false);
  };

  const parseCount = (value: string): number | undefined => {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number.parseInt(trimmed, 10);
    return Number.isNaN(parsed) ? undefined : parsed;
  };

  const selectMode = (next: RecordAIMode) => {
    setMode(next);
    setPreview(null);
    setError(null);
  };

  const previewLine = (record: Record<string, unknown>): string => {
    const parts: string[] = [];
    for (const field of fields) {
      const value = record[field.name];
      if (value === undefined || value === null || value === "") continue;
      let text: string;
      if (field.type === "relationSelect") {
        const opts = relationOptions[field.name] ?? [];
        const list = Array.isArray(value) ? value : [value];
        text = list
          .map((v) => opts.find((o) => o.value === v)?.label ?? String(v))
          .join(", ");
      } else if (Array.isArray(value)) {
        text = value.join(", ");
      } else {
        text = String(value);
      }
      parts.push(`${field.label ?? field.name}: ${text}`);
      if (parts.length >= 4) break;
    }
    return parts.join(" · ") || "—";
  };

  const handleGenerate = async () => {
    if (!instruction.trim()) {
      setError("Describe the record first.");
      return;
    }

    const min = mode === "batch" ? parseCount(minRecords) : undefined;
    const max = mode === "batch" ? parseCount(maxRecords) : undefined;
    if (min !== undefined && min < 1) {
      setError("Minimum records must be at least 1.");
      return;
    }
    if (max !== undefined && max < 1) {
      setError("Maximum records must be at least 1.");
      return;
    }
    if (min !== undefined && max !== undefined && min > max) {
      setError("Minimum records cannot exceed the maximum.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    try {
      const records = await bdGenerateAppRecord({
        instruction: instruction.trim(),
        resourceLabel,
        mode,
        minRecords: min,
        maxRecords: max,
        fields: buildRecordAIFields(fields, relationOptions),
        current,
        aiConfig: { provider: aiConfig.provider, model: aiConfig.model },
      });
      if (records.length === 0) {
        setError("AI returned no usable values. Try a more specific instruction.");
        return;
      }
      if (mode === "single") {
        onAccept(records[0]);
        reset();
        onOpenChange(false);
      } else {
        setPreview(records);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConfirmBatch = async () => {
    if (!preview || preview.length === 0) return;
    setIsCreating(true);
    setError(null);
    try {
      await onAcceptBatch(preview);
      reset();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create records.");
    } finally {
      setIsCreating(false);
    }
  };

  const footer = preview ? (
    <>
      <BDButton
        variant="ghost"
        onClick={() => setPreview(null)}
        disabled={isCreating}
      >
        Back
      </BDButton>
      <BDButton
        icon={Plus}
        isLoading={isCreating}
        onClick={handleConfirmBatch}
      >
        Create {preview.length} record{preview.length === 1 ? "" : "s"}
      </BDButton>
    </>
  ) : (
    <>
      <BDButton variant="ghost" onClick={close} disabled={busy}>
        Cancel
      </BDButton>
      <BDButton
        icon={Sparkles}
        isLoading={isGenerating}
        onClick={handleGenerate}
      >
        Generate
      </BDButton>
    </>
  );

  return (
    <BDModal
      open={open}
      onClose={close}
      title="Generate record with AI"
      description={
        resourceLabel
          ? `Fill the fields for a new "${resourceLabel}" record, then review before creating.`
          : "Fill the fields, then review before creating."
      }
      size="lg"
      footer={footer}
    >
      <div className="flex flex-col gap-4">
        {preview ? (
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-medium text-slate-500">
              {preview.length} record{preview.length === 1 ? "" : "s"} generated
              — review before creating
            </span>
            <div className="bd-scroll flex max-h-72 flex-col gap-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
              {preview.map((record, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 rounded-md bg-slate-50 px-2 py-1.5 text-xs text-slate-600"
                >
                  <span className="mt-0.5 shrink-0 font-medium text-slate-400">
                    #{index + 1}
                  </span>
                  <span className="break-words">{previewLine(record)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-medium text-slate-500">
                Mode
              </span>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {MODES.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => selectMode(item.key)}
                    className={`flex flex-col gap-0.5 rounded-lg border p-2 text-left text-xs ${
                      mode === item.key
                        ? "border-blue-400 bg-blue-50 text-blue-700"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span className="font-medium">{item.label}</span>
                    <span className="text-slate-400">{item.hint}</span>
                  </button>
                ))}
              </div>

              {mode === "batch" && (
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-end gap-3">
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] font-medium text-slate-500">
                        Min records
                      </span>
                      <input
                        type="number"
                        min={1}
                        value={minRecords}
                        onChange={(e) => setMinRecords(e.target.value)}
                        placeholder="optional"
                        disabled={busy}
                        className="w-28 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-blue-400 disabled:bg-slate-50 disabled:text-slate-400"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] font-medium text-slate-500">
                        Max records
                      </span>
                      <input
                        type="number"
                        min={1}
                        value={maxRecords}
                        onChange={(e) => setMaxRecords(e.target.value)}
                        placeholder="optional"
                        disabled={busy}
                        className="w-28 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-blue-400 disabled:bg-slate-50 disabled:text-slate-400"
                      />
                    </label>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Optional. Leave blank to let the AI decide how many records
                    to create.
                  </span>
                </div>
              )}
            </div>

            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-slate-500">
                Instruction
              </span>
              <textarea
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="e.g. A mid-range wireless headphone with a sensible category and price"
                rows={5}
                disabled={busy}
                className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 disabled:bg-slate-50 disabled:text-slate-400"
              />
            </label>
          </>
        )}

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-600">
            {error}
          </p>
        )}

        <p className="text-[11px] text-slate-400">
          Using {aiConfig.provider} / {aiConfig.model}
        </p>
      </div>
    </BDModal>
  );
}

export default BDAppRecordAIComponent;
