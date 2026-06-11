// bui.wizard.chapter.tsx
//
// Chapters step for the Book Wizard — displays the book card and the full
// Bunny chapter management table (list, status, generate, pipeline, export).
//
// Reuses the same pattern as bui.book-chapter.component.tsx.

"use client";

import React from "react";
import Bunny from "@/src/modules/bunny/src/Bunny";
import BunnyForm from "@/src/modules/bunny/src/form/BunnyForm";
import { buiBookChapterModule } from "../books/bui.book-chapter.module";
import { BUIBookComponentCard } from "../books/bui.book.component.card";
import type { BUIBookEntity } from "../books/bui.book.entity";

// ── Props ──────────────────────────────────────────────────────────────────────

interface BUIWizardChapterStepProps {
  book: BUIBookEntity;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function BUIWizardChapterStep({
  book,
}: BUIWizardChapterStepProps) {
  const bookId = book.id!;

  if (!bookId)
    return <div className="text-sm text-slate-400">Invalid Book ID</div>;

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Book info card — same as bui.book-chapter.component.tsx */}

      {/* Chapter management table — full Bunny CRUD with status, generate, pipeline, export */}
      <Bunny config={buiBookChapterModule(bookId)}>
        <BunnyForm />
      </Bunny>
    </div>
  );
}
