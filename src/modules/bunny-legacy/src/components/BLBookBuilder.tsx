/**
 * BLBookBuilder - Main orchestrator component.
 *
 * Uses composition pattern to delegate concerns to specialized components.
 * Single Responsibility: Layout orchestration and composition.
 * No shadcn/ui or radix-ui - uses heroUI + tailwind + lucide-react.
 * No references to book-builder module.
 */

"use client";

import React from "react";
import { useBookBuilder } from "../hooks/useBookBuilder";
import { BLAuthorPanel } from "./BLAuthorPanel";
import { BLBookSelector } from "./BLBookSelector";
import { BLBookGenerator } from "./BLBookGenerator";
import { BLChapterList } from "./BLChapterList";
import { BLChapterPreview } from "./BLChapterPreview";
import { BLRegenerateDialog } from "./BLRegenerateDialog";

export const BLBookBuilder: React.FC = () => {
  const {
    // State
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
    isLoading,

    // Actions
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

    // Queries
    allAuthors,
    allGenerations,
  } = useBookBuilder();

  return (
    <div className="max-w-7xl mx-auto space-y-10 p-6">
      {/* Author Management Section */}
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

      {/* Saved Books Section */}
      <BLBookSelector
        generations={allGenerations}
        selectedGenerationId={selectedGenerationId}
        onSelectGeneration={onSelectGeneration}
      />

      {/* AI Book Generator Section */}
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

      {/* Chapters Section */}
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

      {/* Preview Modal */}
      <BLChapterPreview
        chapter={previewChapter}
        onClose={() => onPreviewChapter(null)}
      />

      {/* Regenerate Dialog */}
      <BLRegenerateDialog
        isOpen={isRegenerateDialogOpen}
        onOpenChange={onRegenerateDialogOpenChange}
        onConfirm={onRegenerationFlow}
      />
    </div>
  );
};

export default BLBookBuilder;
