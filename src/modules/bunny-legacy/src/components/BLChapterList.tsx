/**
 * BLChapterList - Chapters display component with actions.
 *
 * Single Responsibility: Display chapters with generate/preview/export actions.
 * Uses heroUI components, Tailwind CSS, and lucide-react icons.
 */

"use client";

import React from "react";
import { Card, Button } from "@heroui/react";
import {
  Edit3,
  Eye,
  Loader2,
  RefreshCw,
  FileText,
  Globe,
} from "lucide-react";
import type { IBLChapter, IBLGeneration } from "../core/BLEntity";

export interface IBLChapterListProps {
  selectedGenerationId: number | null;
  generations: IBLGeneration[];
  chapters: IBLChapter[];
  generatingChapterId: number | null;
  bookTitle: string;
  onGenerateChapter: (chapter: IBLChapter) => void;
  onPreviewChapter: (chapter: IBLChapter | null) => void;
  onExportMarkdown: () => void;
  onExportHTML: () => void;
  onRegenerateDialogOpenChange: (open: boolean) => void;
}

export const BLChapterList: React.FC<IBLChapterListProps> = ({
  selectedGenerationId,
  generations,
  chapters,
  generatingChapterId,
  bookTitle,
  onGenerateChapter,
  onPreviewChapter,
  onExportMarkdown,
  onExportHTML,
  onRegenerateDialogOpenChange,
}) => {
  if (!selectedGenerationId || chapters.length === 0) {
    return null;
  }

  const currentGeneration = generations.find(
    (g) => g.id === selectedGenerationId,
  );

  return (
    <Card>
      <Card.Header className="flex flex-row items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            Chapters — {currentGeneration?.title || bookTitle}
          </h2>
          <p className="text-sm text-default-500 mt-1">
            {chapters.length} chapter{chapters.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onPress={() => onRegenerateDialogOpenChange(true)}
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Regenerate All
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onPress={onExportMarkdown}
          >
            <FileText className="w-4 h-4 mr-1" />
            .MD
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onPress={onExportHTML}
          >
            <Globe className="w-4 h-4 mr-1" />
            .HTML
          </Button>
        </div>
      </Card.Header>
      <Card.Content className="space-y-6">
        {chapters.map((chapter) => {
          const isGenerating = generatingChapterId === chapter.id;
          const hasContent = !!chapter.content && chapter.content.trim().length > 0;

          return (
            <div
              key={chapter.id}
              className="p-6 border rounded-xl bg-content1 hover:shadow-md transition-all"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <h3 className="font-bold text-xl mb-1">
                    Chapter {chapter.number}: {chapter.title}
                  </h3>
                  <p className="text-default-500 text-sm">
                    {chapter.description}
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    onPress={() => onGenerateChapter(chapter)}
                    isDisabled={isGenerating}
                  >
                    {isGenerating ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    ) : (
                      <Edit3 className="w-4 h-4 mr-1" />
                    )}
                    {isGenerating
                      ? "Generating..."
                      : hasContent
                        ? "Regenerate"
                        : "Write Chapter"}
                  </Button>
                  {hasContent && (
                    <Button
                      variant="primary"
                      size="sm"
                      onPress={() => onPreviewChapter(chapter)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Preview
                    </Button>
                  )}
                </div>
              </div>
              {hasContent && (
                <div className="mt-4 text-xs text-emerald-600 font-medium">
                  ✓ Content generated ({chapter.content!.length} characters)
                </div>
              )}
            </div>
          );
        })}
      </Card.Content>
    </Card>
  );
};

export default BLChapterList;
