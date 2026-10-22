"use client";

// BDDocCreate.Component — new-doc dialog. Only a name is required; title,
// type, slug, and description live behind a collapsed "More options" section.

import { useState } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import {
  BD_DOC_EMPTY_FORM,
  BD_DOC_TYPE_OPTIONS,
  slugify,
  type BDDocForm,
} from "./BDDoc.Types";
import BDModal from "../../components/BDModal";
import BDButton from "../../components/BDButton";

const CELL =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-colors focus:border-blue-400";
const LABEL = "text-xs font-medium text-slate-600";

export interface BDDocCreateComponentProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (form: BDDocForm) => void | Promise<void>;
}

export function BDDocCreateComponent({
  open,
  onClose,
  onSubmit,
}: BDDocCreateComponentProps) {
  const [form, setForm] = useState<BDDocForm>(BD_DOC_EMPTY_FORM);
  const [advanced, setAdvanced] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [busy, setBusy] = useState(false);

  // Reset the dialog each time it opens so stale edits never carry over.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setForm(BD_DOC_EMPTY_FORM);
      setAdvanced(false);
      setSlugTouched(false);
      setBusy(false);
    }
  }

  const update = (patch: Partial<BDDocForm>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  const submit = async () => {
    const name = form.name.trim();
    if (!name) return;
    setBusy(true);
    try {
      await onSubmit({ ...form, name, slug: form.slug.trim() });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <BDModal
      open={open}
      onClose={onClose}
      title="New doc"
      description="Start with a name — everything else is optional."
      footer={
        <>
          <BDButton variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </BDButton>
          <BDButton
            icon={Plus}
            onClick={submit}
            disabled={!form.name.trim()}
            isLoading={busy}
          >
            Create doc
          </BDButton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className={LABEL}>
            Name <span className="text-red-500">*</span>
          </span>
          <input
            className={CELL}
            value={form.name}
            autoFocus
            placeholder="e.g. Developer onboarding guide"
            onChange={(e) => {
              const name = e.target.value;
              setForm((prev) => ({
                ...prev,
                name,
                slug: slugTouched ? prev.slug : slugify(name),
              }));
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void submit();
              }
            }}
          />
        </label>

        <button
          type="button"
          aria-expanded={advanced}
          onClick={() => setAdvanced((value) => !value)}
          className="flex w-fit items-center gap-1 rounded text-xs font-medium text-slate-500 transition-colors hover:text-slate-700"
        >
          {advanced ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
          More options
        </button>

        {advanced && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className={LABEL}>Title</span>
              <input
                className={CELL}
                value={form.title}
                placeholder="Display title"
                onChange={(e) => update({ title: e.target.value })}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className={LABEL}>Type</span>
              <select
                className={CELL}
                value={form.type}
                onChange={(e) =>
                  update({ type: e.target.value as BDDocForm["type"] })
                }
              >
                {BD_DOC_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className={LABEL}>Slug</span>
              <input
                className={CELL}
                value={form.slug}
                placeholder="auto-generated from name"
                onChange={(e) => {
                  setSlugTouched(true);
                  update({ slug: e.target.value });
                }}
              />
            </label>

            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className={LABEL}>Description</span>
              <textarea
                className={CELL}
                rows={3}
                value={form.description}
                placeholder="What is this doc about?"
                onChange={(e) => update({ description: e.target.value })}
              />
            </label>
          </div>
        )}
      </div>
    </BDModal>
  );
}

export default BDDocCreateComponent;
