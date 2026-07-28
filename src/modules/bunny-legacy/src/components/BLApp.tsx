/**
 * BLApp - Main application component for Bunny Legacy Book Builder.
 *
 * This is the page-level entry point that binds all components together,
 * analogous to book-builder.component.tsx in the original module.
 *
 * Composition pattern: delegates UI to specialized components.
 * Uses heroUI + tailwind + lucide-react. No shadcn/ui or radix-ui.
 */

"use client";

import React from "react";
import { Toast } from "@heroui/react";
import { useBookBuilder } from "../hooks/useBookBuilder";
import { BLHeader } from "./BLHeader";
import { BLAIConfig } from "./BLAIConfig";
import { BLDialog } from "./BLDialog";
import { BLAuthorPanel } from "./BLAuthorPanel";
import { BLBookSelector } from "./BLBookSelector";
import { BLBookGenerator } from "./BLBookGenerator";
import { BLChapterList } from "./BLChapterList";
import { BLChapterPreview } from "./BLChapterPreview";
import { BLRegenerateDialog } from "./BLRegenerateDialog";
import "../core/BLTheme.css";

export const BLApp: React.FC = () => {
  const {
    selectedAuthorId,
    authorName,
    authorDesc,
    skills,
    newSkillName,
    bookTitle,
    bookDesc,
    isGeneratingOutline,
    isBulkGenerating,
    selectedGenerationId,
    chapters,
    generatingChapterId,
    previewChapter,
    isRegenerateDialogOpen,
    isBLDialogOpen,
    isDeleteBookDialogOpen,
    isDeleteChapterDialogOpen,
    isDeleteAllChaptersDialogOpen,
    isAIConfigOpen,
    isLoading,
    onSelectAuthor,
    onAuthorNameChange,
    onAuthorDescChange,
    onNewSkillNameChange,
    onAddSkill,
    onRemoveSkill,
    onSaveAuthor,
    onBookTitleChange,
    onBookDescChange,
    onBulkGeneratingChange,
    onGenerateBook,
    onSelectGeneration,
    onGenerateChapter,
    onPreviewChapter,
    onExportMarkdown,
    onExportHTML,
    onRegenerateDialogOpenChange,
    onRegenerationFlow,
    onBLDialogOpenChange,
    onBLDialogConfirm,
    onDeleteBook,
    onDeleteBookDialogOpenChange,
    onDeleteBookConfirm,
    onDeleteChapter,
    onDeleteChapterDialogOpenChange,
    onDeleteChapterConfirm,
    onDeleteAllChapters,
    onDeleteAllChaptersDialogOpenChange,
    onDeleteAllChaptersConfirm,
    onSaveBook,
    onNewBook,
    onAIConfigOpenChange,
    allAuthors,
    allGenerations,
    chapterCounts,
  } = useBookBuilder();

  const selectedBook = selectedGenerationId
    ? allGenerations.find((g) => g.id === selectedGenerationId)
    : null;
  const selectedBookTitle = selectedBook?.title || "this book";

  return (
    <>
      <Toast.Provider />
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-10 p-3 sm:p-6">
        {/* ─── Header: title, AI config, logout ─────────────────────────── */}
        <BLHeader onOpenAIConfig={() => onAIConfigOpenChange(true)} />

        {/* ─── AI Config Modal ──────────────────────────────────────────── */}
        <BLAIConfig
          isOpen={isAIConfigOpen}
          onOpenChange={onAIConfigOpenChange}
        />

        {/* ─── Chapter Regeneration Confirmation Dialog ─────────────────── */}
        <BLDialog
          isOpen={isBLDialogOpen}
          onOpenChange={onBLDialogOpenChange}
          title="Regenerate Chapter"
          message="Regenerate chapter before continuing? That content will be erased."
          confirmLabel="Regenerate"
          cancelLabel="Cancel"
          onConfirm={onBLDialogConfirm}
        />

        {/* ─── Delete Book Confirmation Dialog ──────────────────────────── */}
        <BLDialog
          isOpen={isDeleteBookDialogOpen}
          onOpenChange={onDeleteBookDialogOpenChange}
          title="Delete Book"
          message={`Are you sure you want to delete "${selectedBookTitle}"? This will permanently delete the book and ALL its chapters. This action cannot be undone.`}
          confirmLabel="Delete Book"
          cancelLabel="Cancel"
          onConfirm={onDeleteBookConfirm}
        />

        {/* ─── Delete Chapter Confirmation Dialog ───────────────────────── */}
        <BLDialog
          isOpen={isDeleteChapterDialogOpen}
          onOpenChange={onDeleteChapterDialogOpenChange}
          title="Delete Chapter"
          message="Are you sure you want to delete this chapter? This action cannot be undone."
          confirmLabel="Delete Chapter"
          cancelLabel="Cancel"
          onConfirm={onDeleteChapterConfirm}
        />

        {/* ─── Delete All Chapters Confirmation Dialog ──────────────────── */}
        <BLDialog
          isOpen={isDeleteAllChaptersDialogOpen}
          onOpenChange={onDeleteAllChaptersDialogOpenChange}
          title="Delete All Chapters"
          message={`Are you sure you want to delete ALL chapters from "${selectedBookTitle}"? The book outline will be preserved but all generated content will be lost. This action cannot be undone.`}
          confirmLabel="Delete All Chapters"
          cancelLabel="Cancel"
          onConfirm={onDeleteAllChaptersConfirm}
        />

        <BLAuthorPanel
          authors={allAuthors}
          selectedAuthorId={selectedAuthorId}
          authorName={authorName}
          authorDesc={authorDesc}
          skills={skills}
          newSkillName={newSkillName}
          isLoading={isLoading}
          onSelectAuthor={onSelectAuthor}
          onAuthorNameChange={onAuthorNameChange}
          onAuthorDescChange={onAuthorDescChange}
          onNewSkillNameChange={onNewSkillNameChange}
          onAddSkill={onAddSkill}
          onRemoveSkill={onRemoveSkill}
          onSaveAuthor={onSaveAuthor}
        />

        <BLBookSelector
          generations={allGenerations}
          selectedGenerationId={selectedGenerationId}
          chapterCounts={chapterCounts}
          onSelectGeneration={onSelectGeneration}
          onDeleteBook={onDeleteBook}
          onDeleteAllChapters={onDeleteAllChapters}
        />

        <BLBookGenerator
          bookTitle={bookTitle}
          bookDesc={bookDesc}
          isGeneratingOutline={isGeneratingOutline}
          isBulkGenerating={isBulkGenerating}
          selectedAuthorId={selectedAuthorId}
          selectedGenerationId={selectedGenerationId}
          isLoading={isLoading}
          onBookTitleChange={onBookTitleChange}
          onBookDescChange={onBookDescChange}
          onBulkGeneratingChange={onBulkGeneratingChange}
          onGenerateBook={onGenerateBook}
          onSaveBook={onSaveBook}
          onNewBook={onNewBook}
        />

        <BLChapterList
          selectedGenerationId={selectedGenerationId}
          generations={allGenerations}
          chapters={chapters}
          generatingChapterId={generatingChapterId}
          bookTitle={bookTitle}
          onGenerateChapter={onGenerateChapter}
          onPreviewChapter={onPreviewChapter}
          onExportMarkdown={onExportMarkdown}
          onExportHTML={onExportHTML}
          onRegenerateDialogOpenChange={onRegenerateDialogOpenChange}
          onDeleteChapter={onDeleteChapter}
        />

        <BLChapterPreview
          chapter={previewChapter}
          onClose={() => onPreviewChapter(null)}
        />

        <BLRegenerateDialog
          isOpen={isRegenerateDialogOpen}
          onOpenChange={onRegenerateDialogOpenChange}
          onConfirm={onRegenerationFlow}
        />
      </div>
    </>
  );
};

export default BLApp;
