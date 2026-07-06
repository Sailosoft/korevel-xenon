/**
 * BLBookGenerator - AI Book Generation form component.
 *
 * Single Responsibility: Form UI for generating new book outlines.
 * Uses heroUI components, Tailwind CSS, and lucide-react icons.
 */

"use client";

import React from "react";
import { Card, Button, Input, TextArea, Checkbox } from "@heroui/react";
import { Sparkles, BookOpen, Loader2 } from "lucide-react";

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
            placeholder="e.g. The Secrets of TypeScript..."
            value={bookTitle}
            onChange={(e) => onBookTitleChange(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Concept / Description</label>
          <TextArea
            placeholder="What is this book about? Describe the concept, target audience, and key themes..."
            value={bookDesc}
            onChange={(e) => onBookDescChange(e.target.value)}
            className="min-h-[100px]"
          />
        </div>
        <Checkbox
          isSelected={isBulkGenerating}
          onChange={(value) => onBulkGeneratingChange(value)}
        >
          <span className="text-sm text-default-600">
            Automatically generate all chapters in sequence
          </span>
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
