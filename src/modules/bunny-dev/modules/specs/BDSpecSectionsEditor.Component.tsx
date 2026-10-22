"use client";

// BDSpecSectionsEditor — the ordered sections editor shared by the document
// drawer and the new-document modal. Owns per-section view/edit toggles.

import { useState } from "react";
import { Eye, PenLine, Plus, Trash2 } from "lucide-react";
import type { BDSpecSection } from "../../BDDomain.Types";
import { createSection, sectionMarkdown } from "./BDSpec.Types";
import BDButton from "../../components/BDButton";
import BDIconButton from "../../components/BDIconButton";
import BDWysiwygEditor from "../../components/BDWysiwygEditor";
import BDMarkdownView from "../../components/BDMarkdownView";

export interface BDSpecSectionsEditorProps {
  sections: BDSpecSection[];
  onChange: (sections: BDSpecSection[]) => void;
}

const CELL =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400";

export function BDSpecSectionsEditor({
  sections,
  onChange,
}: BDSpecSectionsEditorProps) {
  const [viewSections, setViewSections] = useState<Set<string>>(new Set());

  const updateSection = (index: number, patch: Partial<BDSpecSection>) => {
    onChange(sections.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  const setSectionView = (id: string, view: boolean) =>
    setViewSections((prev) => {
      const next = new Set(prev);
      if (view) next.add(id);
      else next.delete(id);
      return next;
    });

  const allInView =
    sections.length > 0 && sections.every((s) => viewSections.has(s.id));

  const toggleAllSections = () =>
    setViewSections(allInView ? new Set() : new Set(sections.map((s) => s.id)));

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">
          Sections ({sections.length})
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
              onChange([
                ...sections,
                createSection("New section", 2, sections.length),
              ])
            }
          >
            Add section
          </BDButton>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {sections.map((section, index) => (
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
                    level: Number(e.target.value) as BDSpecSection["level"],
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
              <BDIconButton
                icon={viewSections.has(section.id) ? PenLine : Eye}
                label={
                  viewSections.has(section.id) ? "Edit section" : "View section"
                }
                size="sm"
                onClick={() =>
                  setSectionView(section.id, !viewSections.has(section.id))
                }
              />
              <BDIconButton
                icon={Trash2}
                label="Remove section"
                size="sm"
                className="hover:bg-red-50 hover:text-red-500"
                onClick={() => {
                  setSectionView(section.id, false);
                  onChange(sections.filter((_, i) => i !== index));
                }}
              />
            </div>
            {viewSections.has(section.id) ? (
              <div className="mt-2 rounded-lg border border-slate-200 p-3">
                <BDMarkdownView content={sectionMarkdown(section)} />
              </div>
            ) : (
              <div className="mt-2 flex flex-col gap-2">
                <input
                  className={CELL}
                  placeholder="Section summary (one line)"
                  value={section.summary ?? ""}
                  onChange={(e) =>
                    updateSection(index, {
                      summary: e.target.value || undefined,
                    })
                  }
                />
                <BDWysiwygEditor
                  value={section.content}
                  onChange={(value) => updateSection(index, { content: value })}
                  placeholder="Section content (markdown)"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default BDSpecSectionsEditor;
