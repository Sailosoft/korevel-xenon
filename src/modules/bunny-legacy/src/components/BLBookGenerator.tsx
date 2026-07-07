/**
 * BLBookGenerator - AI Book Generation form component.
 *
 * Single Responsibility: Form UI for generating new book outlines.
 * Uses heroUI components, Tailwind CSS, and lucide-react icons.
 */

"use client";

import React from "react";
import { Card, Button, Input, Checkbox } from "@heroui/react";
import { Sparkles, BookOpen, Loader2, Wand2 } from "lucide-react";
import BLEditor from "./BLEditor";

export interface IBLBookGeneratorProps {
  bookTitle: string;
  bookDesc: string;
  isGeneratingOutline: boolean;
  isBulkGenerating: boolean;
  selectedAuthorId: string;
  onBookTitleChange: (title: string) => void;
  onBookDescChange: (desc: string) => void;
  onBulkGeneratingChange: (value: boolean) => void;
  onGenerateBook: () => void;
}

export const BLBookGenerator: React.FC<IBLBookGeneratorProps> = ({
  bookTitle,
  bookDesc,
  isGeneratingOutline,
  isBulkGenerating,
  selectedAuthorId,
  onBookTitleChange,
  onBookDescChange,
  onBulkGeneratingChange,
  onGenerateBook,
}) => {
  const canGenerate =
    bookTitle.trim().length > 0 &&
    bookDesc.trim().length > 0 &&
    selectedAuthorId !== "new";

  return (
    <Card className="border border-[lab(44.7267%_-21.5987_-26.118_/_0.2)] bg-gradient-to-br from-[lab(44.7267%_-21.5987_-26.118_/_0.06)] via-transparent to-[lab(65%_-18_-22_/_0.06)]">
      <Card.Header>
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[lab(44.7267%_-21.5987_-26.118_/_0.1)]">
            <Wand2 className="w-5 h-5 text-[lab(44.7267%_-21.5987_-26.118)]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">AI Book Builder</h2>
            <p className="text-xs sm:text-sm text-default-500 mt-0.5">
              Generate a new book chapter outline using your selected author
            </p>
          </div>
        </div>
      </Card.Header>
      <Card.Content className="space-y-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-default-700">Book Title</label>
          <Input
            aria-label="Book title"
            placeholder="e.g. The Secrets of TypeScript..."
            value={bookTitle}
            onChange={(e) => onBookTitleChange(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-default-700">Concept / Description</label>
          <BLEditor
            markdown={bookDesc}
            onChange={onBookDescChange}
            minHeight="150px"
          />
        </div>
        <Checkbox
          isSelected={isBulkGenerating}
          onChange={(value) => onBulkGeneratingChange(value)}
          aria-label="Automatically generate all chapters in sequence"
        >
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            <span className="text-sm">Automatically generate all chapters in sequence</span>
          </Checkbox.Content>
        </Checkbox>
      </Card.Content>
      <Card.Footer>
        <Button
          className="w-full font-medium text-white border-0 transition-all duration-300"
          variant="primary"
          size="lg"
          onPress={onGenerateBook}
          isDisabled={!canGenerate || isGeneratingOutline}
          style={{
            background: "linear-gradient(135deg, lab(44.7267% -21.5987 -26.118), lab(32% -14 -18))",
          }}
        >
          {isGeneratingOutline ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Generating Outline...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              Generate Chapter Outline
            </>
          )}
        </Button>
      </Card.Footer>
    </Card>
  );
};

export default BLBookGenerator;
