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
  BookOpen,
} from "lucide-react";
import type { IBLChapter, IBLGeneration } from "../core/BLEntity";

/** Teal: lab(44.7267% -21.5987 -26.118) ≈ #007399 */
const TEAL = "#007399";
const TEAL_DARK = "#00557a";

const btnSolid = {
  background: `linear-gradient(135deg, ${TEAL}, ${TEAL_DARK})`,
  color: "#fff",
  border: "none",
};

const btnOutline = {
  borderColor: TEAL,
  color: TEAL,
  background: "#f0f0f0",
};

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
    <Card
      className="bg-gradient-to-br from-content1 to-content1/80"
      style={{ borderColor: `${TEAL}26` }}
    >
      <Card.Header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div
              className="p-1.5 rounded-lg"
              style={{ background: `${TEAL}15` }}
            >
              <BookOpen className="w-5 h-5" style={{ color: TEAL }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold">
                Chapters — {currentGeneration?.title || bookTitle}
              </h2>
              <p className="text-xs sm:text-sm text-default-500 mt-0.5">
                {chapters.length} chapter{chapters.length !== 1 ? "s" : ""} total
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button
            size="sm"
            className="flex-1 sm:flex-none"
            onPress={() => onRegenerateDialogOpenChange(true)}
            style={btnSolid}
          >
            <RefreshCw className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">Regenerate All</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="flex-1 sm:flex-none"
            onPress={onExportMarkdown}
            style={btnOutline}
          >
            <FileText className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">.MD</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="flex-1 sm:flex-none"
            onPress={onExportHTML}
            style={btnOutline}
          >
            <Globe className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">.HTML</span>
          </Button>
        </div>
      </Card.Header>
      <Card.Content className="space-y-4 sm:space-y-6">
        {chapters.map((chapter) => {
          const isGenerating = generatingChapterId === chapter.id;
          const hasContent = !!chapter.content && chapter.content.trim().length > 0;

          return (
            <div
              key={chapter.id}
              className="p-4 sm:p-6 border rounded-xl bg-gradient-to-br from-content1/50 to-content1/30 hover:shadow-lg transition-all duration-300 group"
              style={{ borderColor: `${TEAL}26` }}
            >
              <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4">
                <div className="flex-1 min-w-0 w-full sm:w-auto">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold"
                      style={{
                        background: `${TEAL}15`,
                        color: TEAL,
                      }}
                    >
                      {chapter.number}
                    </span>
                    <h3 className="font-bold text-base sm:text-xl truncate">
                      {chapter.title}
                    </h3>
                  </div>
                  <p className="text-default-500 text-xs sm:text-sm ml-9 line-clamp-2">
                    {chapter.description}
                  </p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto flex-shrink-0">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1 sm:flex-none"
                    onPress={() => onGenerateChapter(chapter)}
                    isDisabled={isGenerating}
                    style={btnOutline}
                  >
                    {isGenerating ? (
                      <Loader2 className="w-4 h-4 animate-spin sm:mr-1" />
                    ) : (
                      <Edit3 className="w-4 h-4 sm:mr-1" />
                    )}
                    <span className="text-xs sm:text-sm">
                      {(() => {
                        if (isGenerating) return "Generating...";
                        if (hasContent) return "Regenerate";
                        return "Generate";
                      })()}
                    </span>
                  </Button>
                  {hasContent && (
                    <Button
                      size="sm"
                      className="flex-1 sm:flex-none"
                      onPress={() => onPreviewChapter(chapter)}
                      style={btnSolid}
                    >
                      <Eye className="w-4 h-4 sm:mr-1" />
                      <span className="text-xs sm:text-sm">Preview</span>
                    </Button>
                  )}
                </div>
              </div>
              {hasContent && (
                <div
                  className="mt-3 sm:mt-4 flex items-center gap-2 text-xs font-medium"
                  style={{ color: TEAL }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full animate-pulse"
                    style={{ background: TEAL }}
                  />
                  Content generated ({chapter.content!.length.toLocaleString()} characters)
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
