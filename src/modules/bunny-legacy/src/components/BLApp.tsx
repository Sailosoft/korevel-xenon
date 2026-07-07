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
    onAIConfigOpenChange,
    allAuthors,
    allGenerations,
  } = useBookBuilder();

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
          onSelectGeneration={onSelectGeneration}
        />

        <BLBookGenerator
          bookTitle={bookTitle}
          bookDesc={bookDesc}
          isGeneratingOutline={isGeneratingOutline}
          isBulkGenerating={isBulkGenerating}
          selectedAuthorId={selectedAuthorId}
          onBookTitleChange={onBookTitleChange}
          onBookDescChange={onBookDescChange}
          onBulkGeneratingChange={onBulkGeneratingChange}
          onGenerateBook={onGenerateBook}
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
