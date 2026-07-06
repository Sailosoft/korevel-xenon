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
import { useBookBuilder } from "../hooks/useBookBuilder";
import { BLAuthorPanel } from "./BLAuthorPanel";
import { BLBookSelector } from "./BLBookSelector";
import { BLBookGenerator } from "./BLBookGenerator";
import { BLChapterList } from "./BLChapterList";
import { BLChapterPreview } from "./BLChapterPreview";
import { BLRegenerateDialog } from "./BLRegenerateDialog";

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
    allAuthors,
    allGenerations,
  } = useBookBuilder();

  return (
    <div className="max-w-7xl mx-auto space-y-10 p-6">
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
  );
};

export default BLApp;
