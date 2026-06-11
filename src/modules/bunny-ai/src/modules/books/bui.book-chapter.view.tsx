// bui.book-chapter.view.tsx
//
// Custom chapter view — renders inside BunnyHeadless so the embedded
// Generate / Pipeline / Export components have access to the Bunny kernel.
//
// Layout:
//   [Book info card]
//   [Generate] [Write Content] [Export]
//   [Chapter list with Read buttons → markdown viewer]

"use client";

import React, { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useRouter } from "next/navigation";
import {
  Rocket,
  NotebookPenIcon,
  MonitorDownIcon,
  BookOpen,
  BookPlus,
  ChevronLeft,
  X,
} from "lucide-react";
import { buiDatabase } from "../../database/bui.database";
import type { BUIBookEntity, BUIBookChapterEntity } from "./bui.book.entity";
import type { BUIAuthor } from "../authors/bui.author.entity";
import BUIBookChapterComponentGenerate from "./bui.book-chapter.component.generate";
import BUIBookChapterComponentPipeline from "./bui.book-chapter.component.pipeline";
import BUIBookComponentExportPreview from "./bui.book.export.component.chapter";
import { useBunnyKernel } from "@/src/modules/bunny/src/kernel";

// ── Props ──────────────────────────────────────────────────────────────────────

interface BUIBookChapterViewProps {
  bookId: number;
}

// ── Read Modal ─────────────────────────────────────────────────────────────────

function ChapterReadModal({
  chapter,
  onClose,
}: {
  chapter: BUIBookChapterEntity;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              Chapter {chapter.number}: {chapter.title}
            </h2>
            {chapter.wordCount && (
              <p className="text-xs text-slate-400 mt-0.5">
                {chapter.wordCount} words
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {chapter.content ? (
            <div className="prose prose-sm max-w-none prose-headings:text-slate-800 prose-headings:font-bold prose-p:text-slate-600 prose-a:text-[#ff2d20] prose-code:bg-slate-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-pre:bg-slate-50 prose-pre:border prose-pre:border-slate-200 prose-pre:rounded-xl prose-img:rounded-xl prose-blockquote:border-l-[#ff2d20] prose-blockquote:text-slate-500">
              <ReactMarkdown>{chapter.content}</ReactMarkdown>
            </div>
          ) : (
            <div className="text-center py-16">
              <BookOpen className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">
                No content available yet
              </p>
              <p className="text-xs text-slate-300 mt-1">
                Use the AI Writing Pipeline to generate content for this chapter
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function BUIBookChapterView({
  bookId,
}: BUIBookChapterViewProps) {
  const kernel = useBunnyKernel();
  const router = useRouter();
  const [book, setBook] = useState<BUIBookEntity | null>(null);
  const [chapters, setChapters] = useState<BUIBookChapterEntity[]>([]);
  const [readingChapter, setReadingChapter] =
    useState<BUIBookChapterEntity | null>(null);

  // Load book + chapters
  const loadData = useCallback(async () => {
    const [bookData, chapterData] = await Promise.all([
      buiDatabase.books.get(bookId),
      buiDatabase.chapters.where("bookId").equals(bookId).sortBy("number"),
    ]);
    if (bookData) {
      // Attach author if available
      if (bookData.authorId) {
        const author = await buiDatabase.authors.get(bookData.authorId);
        setBook({ ...bookData, author });
      } else {
        setBook(bookData);
      }
    }
    setChapters(chapterData);
  }, [bookId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const statusBadge = (status?: string) => {
    const mapping: Record<string, { label: string; className: string }> = {
      done: {
        label: "Done",
        className: "bg-green-100 text-green-700",
      },
      empty: {
        label: "Empty",
        className: "bg-slate-100 text-slate-400",
      },
      being_generated: {
        label: "Generating...",
        className: "bg-amber-100 text-amber-700 animate-pulse",
      },
      pending: {
        label: "Pending",
        className: "bg-blue-100 text-blue-600",
      },
    };
    const s = mapping[status ?? "empty"] ?? mapping.empty;
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.className}`}
      >
        {s.label}
      </span>
    );
  };

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 md:px-6 space-y-6">
      {/* ── Back button ──────────────────────────────────────── */}
      <button
        onClick={() => router.push("/modules/bunny-ai/books")}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#ff2d20] transition-colors cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Books
      </button>

      {/* ── Book card ────────────────────────────────────────── */}
      {book && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#ff2d20] to-[#f43f5e] rounded-xl flex items-center justify-center shadow-md shadow-red-100">
              <BookPlus className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-slate-800">{book.title}</h1>
              <p className="text-sm text-slate-400">
                {book.author?.name
                  ? `by ${book.author.name}`
                  : "No author assigned"}
                {book.category && ` · ${book.category}`}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400">Chapters</span>
              <p className="text-2xl font-bold text-slate-700">
                {chapters.length}
              </p>
            </div>
          </div>
          {book.description && (
            <p className="text-sm text-slate-500 mt-3 pt-3 border-t border-slate-100">
              {book.description}
            </p>
          )}
        </div>
      )}

      {/* ── Action buttons ───────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex items-center justify-center p-1 bg-slate-50 rounded-xl border border-slate-200 hover:border-[#ff2d20]/30 transition-colors">
          <BUIBookChapterComponentGenerate bookId={bookId} />
        </div>

        <div className="flex items-center justify-center p-1 bg-slate-50 rounded-xl border border-slate-200 hover:border-[#ff2d20]/30 transition-colors">
          <BUIBookChapterComponentPipeline
            bookId={bookId}
            context={kernel as never}
          />
        </div>

        <div className="flex items-center justify-center p-1 bg-slate-50 rounded-xl border border-slate-200 hover:border-[#ff2d20]/30 transition-colors">
          <BUIBookComponentExportPreview bookId={bookId} />
        </div>
      </div>

      {/* ── Chapter list ─────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">
            Chapter List
          </h2>
          <span className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">
            {chapters.length} chapter{chapters.length !== 1 ? "s" : ""}
          </span>
        </div>

        {chapters.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">No chapters yet</p>
            <p className="text-xs text-slate-300 mt-1">
              Use the Generate Chapters tool to create chapter outlines
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {chapters.map((ch) => (
              <div
                key={ch.id}
                className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors"
              >
                {/* Chapter number */}
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ff2d20] to-[#f43f5e] flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {ch.number}
                </div>

                {/* Chapter info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {ch.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {statusBadge(ch.status)}
                    {ch.wordCount ? (
                      <span className="text-xs text-slate-400">
                        {ch.wordCount} words
                      </span>
                    ) : null}
                    {ch.description && (
                      <span className="text-xs text-slate-400 truncate hidden md:inline">
                        {ch.description}
                      </span>
                    )}
                  </div>
                </div>

                {/* Read button */}
                <button
                  onClick={() => setReadingChapter(ch)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:border-[#ff2d20] hover:text-[#ff2d20] hover:bg-red-50 transition-all cursor-pointer shrink-0"
                >
                  <BookOpen className="w-4 h-4" />
                  Read
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Read modal ───────────────────────────────────────── */}
      {readingChapter && (
        <ChapterReadModal
          chapter={readingChapter}
          onClose={() => setReadingChapter(null)}
        />
      )}
    </div>
  );
}
