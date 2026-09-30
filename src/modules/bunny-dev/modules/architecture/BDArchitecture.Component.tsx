"use client";

import { Eye, PenLine, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type {
  BDArchitectureRecord,
  BDArchitectureSection,
} from "../../BDDomain.Types";
import {
  BD_ARCHITECTURE_STATUS_OPTIONS,
  BD_ARCHITECTURE_TYPE_OPTIONS,
  createSection,
  sectionMarkdown,
} from "./BDArchitecture.Types";
import { toArchitectureMarkdown } from "./BDArchitectureExport";
import BDButton from "../../components/BDButton";
import BDWysiwygEditor from "../../components/BDWysiwygEditor";
import BDMarkdownView from "../../components/BDMarkdownView";
import BDBadge from "../../components/BDBadge";

export interface BDArchitectureComponentProps {
  record: BDArchitectureRecord;
  onChange: (patch: Partial<BDArchitectureRecord>) => void;
  onCreateVariant: () => void;
  onDelete: () => void;
}

const CELL =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400";

export function BDArchitectureComponent({
  record,
  onChange,
  onCreateVariant,
  onDelete,
}: BDArchitectureComponentProps) {
  const [preview, setPreview] = useState(false);
  const [viewSections, setViewSections] = useState<Set<string>>(new Set());

  const updateSection = (
    index: number,
    patch: Partial<BDArchitectureSection>,
  ) => {
    onChange({
      sections: record.sections.map((s, i) =>
        i === index ? { ...s, ...patch } : s,
      ),
    });
  };

  const setSectionView = (id: string, view: boolean) =>
    setViewSections((prev) => {
      const next = new Set(prev);
      if (view) next.add(id);
      else next.delete(id);
      return next;
    });

  const allInView =
    record.sections.length > 0 &&
    record.sections.every((s) => viewSections.has(s.id));

  const toggleAllSections = () =>
    setViewSections(
      allInView ? new Set() : new Set(record.sections.map((s) => s.id)),
    );

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
              onChange({ type: e.target.value as BDArchitectureRecord["type"] })
            }
          >
            {BD_ARCHITECTURE_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm outline-none focus:border-blue-400"
            value={record.status}
            onChange={(e) =>
              onChange({ status: e.target.value as BDArchitectureRecord["status"] })
            }
          >
            {BD_ARCHITECTURE_STATUS_OPTIONS.map((opt) => (
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
        <textarea
          className={`${CELL} mt-3`}
          rows={2}
          placeholder="Summary"
          value={record.summary ?? ""}
          onChange={(e) => onChange({ summary: e.target.value })}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Content</h3>
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
            <BDMarkdownView content={toArchitectureMarkdown(record)} />
          </div>
        ) : (
          <BDWysiwygEditor
            value={record.content ?? ""}
            onChange={(value) => onChange({ content: value })}
            placeholder="Write the architecture document…"
          />
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">
            Sections ({record.sections.length})
          </h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleAllSections}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-100"
            >
              {allInView ? (
                <>
                  <PenLine className="h-3.5 w-3.5" /> Edit all
                </>
              ) : (
                <>
                  <Eye className="h-3.5 w-3.5" /> View all
                </>
              )}
            </button>
            <BDButton
              size="sm"
              variant="secondary"
              icon={Plus}
              onClick={() =>
                onChange({
                  sections: [
                    ...record.sections,
                    createSection("New section", 2, record.sections.length),
                  ],
                })
              }
            >
              Add section
            </BDButton>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          {record.sections.map((section, index) => (
            <div
              key={section.id}
              className="rounded-lg border border-slate-200 p-3"
            >
              <div className="flex items-center gap-2">
                <select
                  className="rounded border border-slate-200 px-1.5 py-1 text-xs"
                  value={section.level}
                  onChange={(e) =>
                    updateSection(index, {
                      level: Number(e.target.value) as BDArchitectureSection["level"],
                    })
                  }
                >
                  {[1, 2, 3, 4, 5, 6].map((l) => (
                    <option key={l} value={l}>
                      H{l}
                    </option>
                  ))}
                </select>
                <input
                  className={`${CELL} flex-1`}
                  value={section.title}
                  onChange={(e) =>
                    updateSection(index, { title: e.target.value })
                  }
                />
                <button
                  type="button"
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  onClick={() => setSectionView(section.id, !viewSections.has(section.id))}
                  aria-label={viewSections.has(section.id) ? "Edit section" : "View section"}
                >
                  {viewSections.has(section.id) ? (
                    <PenLine className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
                  onClick={() => {
                    setSectionView(section.id, false);
                    onChange({
                      sections: record.sections.filter((_, i) => i !== index),
                    });
                  }}
                  aria-label="Remove section"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              {viewSections.has(section.id) ? (
                <div className="mt-2 rounded-lg border border-slate-200 p-3">
                  <BDMarkdownView content={sectionMarkdown(section)} />
                </div>
              ) : (
                <textarea
                  className={`${CELL} mt-2`}
                  rows={3}
                  placeholder="Section content (markdown)"
                  value={section.content}
                  onChange={(e) =>
                    updateSection(index, { content: e.target.value })
                  }
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default BDArchitectureComponent;
