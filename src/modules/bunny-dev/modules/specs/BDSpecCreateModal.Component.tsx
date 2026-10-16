"use client";

// BDSpecCreateModal — new-document dialog. Pick a document mode (single
// content vs sectionized), author the initial body inline, and preview the
// rendered markdown before creating.

import { useState } from "react";
import { Eye, PenLine, Plus } from "lucide-react";
import type { BDSpecRecord, BDSpecSection } from "../../BDDomain.Types";
import {
  BD_SPEC_DOC_MODE_OPTIONS,
  BD_SPEC_EMPTY_FORM,
  BD_SPEC_STATUS_OPTIONS,
  BD_SPEC_TYPE_OPTIONS,
  createSection,
  slugify,
  specDraftToMarkdown,
  type BDSpecForm,
} from "./BDSpec.Types";
import BDSpecSectionsEditor from "./BDSpecSectionsEditor.Component";
import BDModal from "../../components/BDModal";
import BDButton from "../../components/BDButton";
import BDMarkdownView from "../../components/BDMarkdownView";
import BDWysiwygEditor from "../../components/BDWysiwygEditor";
import { useBDToast } from "../../components/BDToast";

export interface BDSpecCreateInput {
  form: BDSpecForm;
  content: string;
  sections: BDSpecSection[];
}

export interface BDSpecCreateModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: BDSpecCreateInput) => Promise<void>;
}

type PreviewRecord = Pick<BDSpecRecord, "name" | "summary" | "content" | "sections">;

const CELL =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400";
const LABEL = "text-[11px] font-medium text-slate-500";

export function BDSpecCreateModal({
  open,
  onClose,
  onSubmit,
}: BDSpecCreateModalProps) {
  const { toast } = useBDToast();

  const [form, setForm] = useState<BDSpecForm>(BD_SPEC_EMPTY_FORM);
  const [slugTouched, setSlugTouched] = useState(false);
  const [content, setContent] = useState("");
  const [sections, setSections] = useState<BDSpecSection[]>([]);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setForm(BD_SPEC_EMPTY_FORM);
      setSlugTouched(false);
      setContent("");
      setSections([]);
      setPreview(false);
      setBusy(false);
    }
  }

  const update = (patch: Partial<BDSpecForm>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  const previewRecord: PreviewRecord = {
    name: form.name,
    summary: form.summary || undefined,
    content: content || undefined,
    sections,
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast({ title: "Name is required", status: "warning" });
      return;
    }
    setBusy(true);
    try {
      await onSubmit({ form, content, sections });
    } finally {
      setBusy(false);
    }
  };

  return (
    <BDModal
      open={open}
      onClose={onClose}
      title="New spec document"
      description="Choose how the document body is authored."
      size="lg"
      footer={
        <>
          <BDButton variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </BDButton>
          <BDButton isLoading={busy} onClick={handleSubmit}>
            Create document
          </BDButton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className={LABEL}>Name</span>
            <input
              className={CELL}
              value={form.name}
              onChange={(e) => {
                const name = e.target.value;
                setForm((prev) => ({
                  ...prev,
                  name,
                  slug: slugTouched ? prev.slug : slugify(name),
                }));
              }}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className={LABEL}>Slug</span>
            <input
              className={CELL}
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true);
                update({ slug: e.target.value });
              }}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className={LABEL}>Type</span>
            <select
              className={CELL}
              value={form.type}
              onChange={(e) =>
                update({ type: e.target.value as BDSpecForm["type"] })
              }
            >
              {BD_SPEC_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className={LABEL}>Status</span>
            <select
              className={CELL}
              value={form.status}
              onChange={(e) =>
                update({ status: e.target.value as BDSpecForm["status"] })
              }
            >
              {BD_SPEC_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-1">
          <span className={LABEL}>Summary</span>
          <textarea
            className={`${CELL} resize-y`}
            rows={3}
            value={form.summary}
            onChange={(e) => update({ summary: e.target.value })}
          />
        </label>

        <div className="flex flex-col gap-2">
          <span className={LABEL}>Document mode</span>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {BD_SPEC_DOC_MODE_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 text-xs ${
                  form.docMode === opt.value
                    ? "border-blue-300 bg-blue-50/60"
                    : "border-slate-200"
                }`}
              >
                <input
                  type="radio"
                  className="mt-0.5"
                  name="bd-spec-doc-mode"
                  checked={form.docMode === opt.value}
                  onChange={() => update({ docMode: opt.value })}
                />
                <span className="flex flex-col gap-0.5">
                  <span className="font-medium text-slate-700">{opt.label}</span>
                  <span className="text-slate-400">{opt.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className={LABEL}>
              {form.docMode === "single" ? "Content" : "Sections"}
            </span>
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
            <div className="min-h-[160px] rounded-lg border border-slate-200 p-4">
              <BDMarkdownView content={specDraftToMarkdown(previewRecord)} />
            </div>
          ) : form.docMode === "single" ? (
            <BDWysiwygEditor
              value={content}
              onChange={setContent}
              placeholder="Write the spec document…"
              minHeight={160}
            />
          ) : sections.length === 0 ? (
            <div className="flex flex-col items-start gap-2 rounded-lg border border-dashed border-slate-200 p-4">
              <p className="text-xs text-slate-400">
                No sections yet — add the first one, or preview the shell.
              </p>
              <BDButton
                size="sm"
                variant="secondary"
                icon={Plus}
                onClick={() => setSections([createSection("New section", 2, 0)])}
              >
                Add section
              </BDButton>
            </div>
          ) : (
            <BDSpecSectionsEditor sections={sections} onChange={setSections} />
          )}
        </div>
      </div>
    </BDModal>
  );
}

export default BDSpecCreateModal;
