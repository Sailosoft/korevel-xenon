// bui.wizard.book.tsx
//
// Book step for the Book Wizard — wrapped in its own BunnyHeadless
// context with the book module config.

"use client";

import React, { useCallback, useState } from "react";
import { BookPlus, UserPlus } from "lucide-react";
import { BunnyHeadless } from "@/src/modules/bunny";
import { buiBookModule } from "../books/bui.book.module";
import { buiDatabase } from "../../database/bui.database";
import type { BUIAuthor } from "../authors/bui.author.entity";
import type { BUIBookEntity } from "../books/bui.book.entity";

// ── Props ──────────────────────────────────────────────────────────────────────

interface BUIWizardBookStepProps {
  author: BUIAuthor;
  onComplete: (book: BUIBookEntity) => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

function BUIWizardBookStepContent({
  author,
  onComplete,
}: BUIWizardBookStepProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");

  const canCreate = title.trim().length > 0;

  const handleCreate = useCallback(async () => {
    if (!canCreate || !author.id) return;
    const id = await buiDatabase.books.add({
      title: title.trim(),
      description: description.trim() || undefined,
      category: category.trim() || undefined,
      authorId: author.id,
    });
    onComplete({
      id,
      title: title.trim(),
      description: description.trim() || undefined,
      category: category.trim() || undefined,
      authorId: author.id,
      author,
    });
  }, [canCreate, title, description, category, author, onComplete]);

  return (
    <div className="space-y-4">
      {/* Selected author badge */}
      <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
        <UserPlus className="w-4 h-4 text-[#ff2d20]" />
        <span className="text-sm text-slate-600">
          Author: <strong>{author.name}</strong>
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-600">
          Book Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          placeholder="e.g. Pride and Prejudice"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full h-9 px-3 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff2d20]/20 focus:border-[#ff2d20] transition-all"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-600">
          Description (optional)
        </label>
        <textarea
          placeholder="A short summary or premise..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff2d20]/20 focus:border-[#ff2d20] transition-all resize-none"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-600">
          Category (optional)
        </label>
        <input
          type="text"
          placeholder="e.g. Fiction, Romance, Classic"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full h-9 px-3 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff2d20]/20 focus:border-[#ff2d20] transition-all"
        />
      </div>

      <button
        onClick={handleCreate}
        disabled={!canCreate}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#ff2d20] to-[#f43f5e] text-white font-medium py-2.5 rounded-xl shadow-md shadow-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg cursor-pointer"
      >
        <BookPlus className="w-4 h-4" />
        Create Book
      </button>
    </div>
  );
}

// ── Exported (wrapped in BunnyHeadless) ────────────────────────────────────────

export default function BUIWizardBookStep(props: BUIWizardBookStepProps) {
  return (
    <BunnyHeadless config={buiBookModule}>
      <BUIWizardBookStepContent {...props} />
    </BunnyHeadless>
  );
}
