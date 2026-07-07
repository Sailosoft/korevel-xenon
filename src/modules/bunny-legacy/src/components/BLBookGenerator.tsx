/**
 * BLBookGenerator - AI Book Generation form component.
 *
 * Single Responsibility: Form UI for generating new book outlines.
 * Uses heroUI components, Tailwind CSS, and lucide-react icons.
 */

"use client";

import React from "react";
import { Card, Button, Input, Checkbox } from "@heroui/react";
import { Sparkles, BookOpen, Loader2 } from "lucide-react";
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
    <Card className="border border-primary/20 bg-primary/5">
      <Card.Header>
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="w-5 h-5" />
          <h2 className="text-lg font-semibold">AI Book Builder</h2>
        </div>
        <p className="text-sm text-default-500 mt-1">
          Generate a new book chapter outline using your selected author.
        </p>
      </Card.Header>
      <Card.Content className="space-y-5">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Book Title</label>
          <Input
            aria-label="Book title"
            placeholder="e.g. The Secrets of TypeScript..."
            value={bookTitle}
            onChange={(e) => onBookTitleChange(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Concept / Description</label>
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
            Automatically generate all chapters in sequence
          </Checkbox.Content>
        </Checkbox>
      </Card.Content>
      <Card.Footer>
        <Button
          className="w-full font-medium"
          variant="primary"
          size="lg"
          onPress={onGenerateBook}
          isDisabled={!canGenerate || isGeneratingOutline}
        >
          {isGeneratingOutline ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Generating Outline...
            </>
          ) : (
            <>
              <BookOpen className="w-5 h-5 mr-2" />
              Generate Chapter Outline
            </>
          )}
        </Button>
      </Card.Footer>
    </Card>
  );
};

export default BLBookGenerator;
