"use client";

// BDOutlineEditor.Component — WYSIWYG + markdown preview editor for a topic.

import { useState } from "react";
import { Eye, PenLine } from "lucide-react";
import type { BDOutlineTopic } from "../../BDDomain.Types";
import { BDOutlineStatus } from "../../BDDomain.Types";
import { topicMarkdown } from "./BDOutline.Types";
import BDWysiwygEditor from "../../components/BDWysiwygEditor";
import BDMarkdownView from "../../components/BDMarkdownView";
import BDBadge from "../../components/BDBadge";

export interface BDOutlineEditorComponentProps {
  topic: BDOutlineTopic;
  onChange: (patch: Partial<BDOutlineTopic>) => void;
}

const CELL =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400";

export function BDOutlineEditorComponent({
  topic,
  onChange,
}: BDOutlineEditorComponentProps) {
  const [preview, setPreview] = useState(false);

  const setMarkdown = (value: string) => {
    onChange({
      content: [
        {
          id: topic.content?.[0]?.id ?? crypto.randomUUID(),
          kind: topic.content?.[0]?.kind ?? "paragraph",
          position: 0,
          text: value,
        },
      ],
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          className={`${CELL} flex-1 font-semibold`}
          value={topic.title}
          placeholder="Topic title"
          onChange={(e) => onChange({ title: e.target.value })}
        />
        <BDBadge color="primary">{topic.type}</BDBadge>
        <BDBadge>{topic.status}</BDBadge>
        <select
          className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs outline-none focus:border-blue-400"
          value={topic.status}
          onChange={(e) =>
            onChange({ status: e.target.value as BDOutlineTopic["status"] })
          }
        >
          {Object.keys(BDOutlineStatus).map((key) => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>
      </div>

      <textarea
        className={CELL}
        rows={2}
        placeholder="Summary"
        value={topic.summary ?? ""}
        onChange={(e) => onChange({ summary: e.target.value })}
      />

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setPreview(false)}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm ${
            !preview
              ? "bg-blue-100 font-semibold text-blue-700"
              : "text-slate-500 hover:bg-slate-100"
          }`}
        >
          <PenLine className="h-3.5 w-3.5" /> Edit
        </button>
        <button
          type="button"
          onClick={() => setPreview(true)}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm ${
            preview
              ? "bg-blue-100 font-semibold text-blue-700"
              : "text-slate-500 hover:bg-slate-100"
          }`}
        >
          <Eye className="h-3.5 w-3.5" /> Preview
        </button>
      </div>

      {preview ? (
        <div className="min-h-[220px] rounded-lg border border-slate-200 bg-white p-4">
          <BDMarkdownView content={topicMarkdown(topic)} />
        </div>
      ) : (
        <BDWysiwygEditor
          value={topicMarkdown(topic)}
          onChange={setMarkdown}
          placeholder="Write the topic content in markdown…"
        />
      )}
    </div>
  );
}

export default BDOutlineEditorComponent;
