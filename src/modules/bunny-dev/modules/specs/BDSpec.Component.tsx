"use client";

import { Eye, PenLine, Trash2 } from "lucide-react";
import { useState } from "react";
import type { BDSpecDocMode, BDSpecRecord } from "../../BDDomain.Types";
import {
  BD_SPEC_DOC_MODE_OPTIONS,
  BD_SPEC_STATUS_OPTIONS,
  BD_SPEC_TYPE_OPTIONS,
  inferDocMode,
} from "./BDSpec.Types";
import { toSpecMarkdown } from "./BDSpecExport";
import BDSpecSectionsEditor from "./BDSpecSectionsEditor.Component";
import BDButton from "../../components/BDButton";
import BDWysiwygEditor from "../../components/BDWysiwygEditor";
import BDMarkdownView from "../../components/BDMarkdownView";
import BDBadge from "../../components/BDBadge";

export interface BDSpecComponentProps {
  record: BDSpecRecord;
  onChange: (patch: Partial<BDSpecRecord>) => void;
  onCreateVariant: () => void;
  onDelete: () => void;
}

const CELL =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400";

export function BDSpecComponent({
  record,
  onChange,
  onCreateVariant,
  onDelete,
}: BDSpecComponentProps) {
  const [preview, setPreview] = useState(false);
  const docMode = inferDocMode(record);

  const setDocMode = (mode: BDSpecDocMode) => onChange({ docMode: mode });

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            className={`${CELL} flex-1 font-semibold`}
            value={record.name}
            onChange={(e) => onChange({ name: e.target.value })}
          />
          <select
            className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm outline-none focus:border-blue-400"
            value={record.type}
            onChange={(e) =>
              onChange({ type: e.target.value as BDSpecRecord["type"] })
            }
          >
            {BD_SPEC_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm outline-none focus:border-blue-400"
            value={record.status}
            onChange={(e) =>
              onChange({ status: e.target.value as BDSpecRecord["status"] })
            }
          >
            {BD_SPEC_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {record.variantLabel && (
            <BDBadge color="info">{record.variantLabel}</BDBadge>
          )}
          <BDButton size="sm" variant="secondary" onClick={onCreateVariant}>
            Create variant
          </BDButton>
          <BDButton size="sm" variant="danger" icon={Trash2} onClick={onDelete}>
            Delete
          </BDButton>
        </div>
        <div className="mt-3">
          <BDWysiwygEditor
            value={record.summary ?? ""}
            onChange={(value) => onChange({ summary: value })}
            placeholder="Summary"
            variant="compact"
            minHeight={96}
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-700">Body</h3>
            <div className="flex rounded-lg border border-slate-200 p-0.5">
              {BD_SPEC_DOC_MODE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDocMode(opt.value)}
                  className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                    docMode === opt.value
                      ? "bg-blue-50 font-medium text-blue-700"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPreview((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-100"
          >
            {preview ? (
              <>
                <PenLine className="h-3.5 w-3.5" /> Edit
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5" /> Preview
              </>
            )}
          </button>
        </div>
        {preview ? (
          <div className="min-h-[200px] rounded-lg border border-slate-200 p-4">
            <BDMarkdownView content={toSpecMarkdown(record)} />
          </div>
        ) : docMode === "single" ? (
          <BDWysiwygEditor
            value={record.content ?? ""}
            onChange={(value) => onChange({ content: value })}
            placeholder="Write the spec document…"
          />
        ) : (
          <p className="text-xs text-slate-400">
            This document is authoring as titled sections — edit them below.
          </p>
        )}
      </div>

      {docMode === "sectioned" && (
        <BDSpecSectionsEditor
          sections={record.sections}
          onChange={(sections) => onChange({ sections })}
        />
      )}
    </div>
  );
}

export default BDSpecComponent;
