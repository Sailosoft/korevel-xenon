// bui.wizard.tsx
//
// BUIWizard — a single-page wizard that displays all three sections
// (Author, Book, Chapters) on one page. Each section is wrapped in
// its own BunnyHeadless context with the appropriate module config.
//
// Data flows through: Author → Book → Chapters.

"use client";

import React, { useCallback, useState } from "react";
import {
  Rabbit,
  ChevronLeft,
  UserPlus,
  BookPlus,
  ListPlus,
} from "lucide-react";
import type { BUIAuthor } from "../authors/bui.author.entity";
import type { BUIBookEntity } from "../books/bui.book.entity";
import BUIWizardAuthorStep from "./bui.wizard.author";
import BUIWizardBookStep from "./bui.wizard.book";
import BUIWizardChapterStep from "./bui.wizard.chapter";

// ── Section Header ─────────────────────────────────────────────────────────────

function SectionHeader({
  number,
  icon: Icon,
  title,
  subtitle,
}: {
  number: number;
  icon: React.ElementType;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ff2d20] to-[#f43f5e] flex items-center justify-center">
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
        <p className="text-xs text-slate-400">{subtitle}</p>
      </div>
    </div>
  );
}

// ── Main Wizard Component ──────────────────────────────────────────────────────

export default function BUIWizard() {
  const [author, setAuthor] = useState<BUIAuthor | null>(null);
  const [book, setBook] = useState<BUIBookEntity | null>(null);

  const handleAuthorDone = useCallback((a: BUIAuthor) => {
    setAuthor(a);
  }, []);

  const handleBookDone = useCallback((b: BUIBookEntity) => {
    setBook(b);
  }, []);

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 md:px-6 space-y-8">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="text-center">
        <div className="w-14 h-14 bg-gradient-to-br from-[#ff2d20] to-[#f43f5e] rounded-2xl flex items-center justify-center shadow-lg shadow-red-100 mx-auto mb-4">
          <Rabbit className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Book Wizard</h1>
        <p className="text-sm text-slate-400 mt-1">
          Create an author, a book, and outline chapters in one flow
        </p>
      </div>

      {/* ── Section 1: Author ──────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <SectionHeader
          number={1}
          icon={UserPlus}
          title="Author"
          subtitle={
            author ? `${author.name} selected` : "Create or select an author"
          }
        />
        <BUIWizardAuthorStep onComplete={handleAuthorDone} />
      </div>

      {/* ── Section 2: Book ────────────────────────────────────── */}
      <div
        className={`bg-white rounded-2xl border shadow-sm p-6 transition-all ${
          author
            ? "border-slate-200"
            : "border-slate-100 opacity-50 pointer-events-none"
        }`}
      >
        <SectionHeader
          number={2}
          icon={BookPlus}
          title="Book"
          subtitle={
            book
              ? `${book.title} created`
              : author
                ? "Fill in book details"
                : "Select an author first"
          }
        />
        {author ? (
          <BUIWizardBookStep author={author} onComplete={handleBookDone} />
        ) : (
          <p className="text-sm text-slate-400 text-center py-8">
            Please create or select an author above first
          </p>
        )}
      </div>

      {/* ── Section 3: Chapters ────────────────────────────────── */}
      <div
        className={`bg-white rounded-2xl border shadow-sm p-6 transition-all ${
          book
            ? "border-slate-200"
            : "border-slate-100 opacity-50 pointer-events-none"
        }`}
      >
        <SectionHeader
          number={3}
          icon={ListPlus}
          title="Chapters"
          subtitle={book ? `For "${book.title}"` : "Create a book first"}
        />
        {book ? (
          <BUIWizardChapterStep book={book} />
        ) : (
          <p className="text-sm text-slate-400 text-center py-8">
            Please create a book above first
          </p>
        )}
      </div>

      {/* ── Back to Dashboard ──────────────────────────────────── */}
      <div className="flex items-center justify-center">
        <button
          onClick={() => {
            window.location.href = "/modules/bunny-ai";
          }}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
