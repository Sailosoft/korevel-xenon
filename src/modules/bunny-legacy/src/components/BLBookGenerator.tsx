/**
 * BLBookGenerator - AI Book Generation form component.
 *
 * Single Responsibility: Form UI for generating new book outlines.
 * Uses heroUI components, Tailwind CSS, and lucide-react icons.
 */

"use client";

import React from "react";
import { Card, Button, Input, Checkbox } from "@heroui/react";
import { Sparkles, BookOpen, Loader2, Wand2, Save, FilePlus2 } from "lucide-react";
import BLEditor from "./BLEditor";

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

export interface IBLBookGeneratorProps {
  bookTitle: string;
  bookDesc: string;
  isGeneratingOutline: boolean;
  isBulkGenerating: boolean;
  selectedAuthorId: string;
  selectedGenerationId: number | null;
  isLoading: boolean;
  onBookTitleChange: (title: string) => void;
  onBookDescChange: (desc: string) => void;
  onBulkGeneratingChange: (value: boolean) => void;
  onGenerateBook: () => void;
  onSaveBook: () => void;
  onNewBook: () => void;
}

export const BLBookGenerator: React.FC<IBLBookGeneratorProps> = ({
  bookTitle,
  bookDesc,
  isGeneratingOutline,
  isBulkGenerating,
  selectedAuthorId,
  selectedGenerationId,
  isLoading,
  onBookTitleChange,
  onBookDescChange,
  onBulkGeneratingChange,
  onGenerateBook,
  onSaveBook,
  onNewBook,
}) => {
  const canGenerate =
    bookTitle.trim().length > 0 &&
    bookDesc.trim().length > 0 &&
    selectedAuthorId !== "new";

  const isEditing = selectedGenerationId !== null;
  const hasBookData = bookTitle.trim().length > 0 || bookDesc.trim().length > 0;

  return (
    <Card className="border border-[lab(44.7267%_-21.5987_-26.118_/_0.2)] bg-gradient-to-br from-[lab(44.7267%_-21.5987_-26.118_/_0.06)] via-transparent to-[lab(65%_-18_-22_/_0.06)]">
      <Card.Header>
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[lab(44.7267%_-21.5987_-26.118_/_0.1)]">
            <Wand2 className="w-5 h-5 text-[lab(44.7267%_-21.5987_-26.118)]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">
              {isEditing ? "Edit Book" : "AI Book Builder"}
            </h2>
            <p className="text-xs sm:text-sm text-default-500 mt-0.5">
              {isEditing
                ? "Update the book details or generate a new outline"
                : "Generate a new book chapter outline using your selected author"}
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
      <Card.Footer className="flex flex-col sm:flex-row gap-2">
        <div className="flex gap-2 w-full sm:w-auto">
          {hasBookData && (
            <Button
              variant="secondary"
              size="sm"
              onPress={onNewBook}
              style={btnOutline}
              className="flex-1 sm:flex-none"
            >
              <FilePlus2 className="w-4 h-4 sm:mr-1" />
              <span className="text-xs sm:text-sm">New Book</span>
            </Button>
          )}
          {isEditing && (
            <Button
              variant="secondary"
              size="sm"
              onPress={onSaveBook}
              isDisabled={!bookTitle.trim() || isLoading}
              style={btnOutline}
              className="flex-1 sm:flex-none"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin sm:mr-1" />
              ) : (
                <Save className="w-4 h-4 sm:mr-1" />
              )}
              <span className="text-xs sm:text-sm">Save Book</span>
            </Button>
          )}
        </div>
        <Button
          className="w-full sm:flex-1 font-medium text-white border-0 transition-all duration-300"
          variant="primary"
          size="lg"
          onPress={onGenerateBook}
          isDisabled={!canGenerate || isGeneratingOutline}
          style={btnSolid}
        >
          {isGeneratingOutline ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Generating Outline...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              {isEditing ? "Regenerate Outline" : "Generate Chapter Outline"}
            </>
          )}
        </Button>
      </Card.Footer>
    </Card>
  );
};

export default BLBookGenerator;
