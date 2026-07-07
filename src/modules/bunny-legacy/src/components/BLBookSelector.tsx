/**
 * BLBookSelector - Saved books list component.
 *
 * Single Responsibility: Display and select saved book generations.
 * Uses heroUI components and lucide-react icons. No shadcn/ui.
 */

"use client";

import React from "react";
import { Card, Select, ListBox } from "@heroui/react";
import { BookText, ChevronDown, BookMarked, Library } from "lucide-react";
import type { IBLGeneration } from "../core/BLEntity";

export interface IBLBookSelectorProps {
  generations: IBLGeneration[];
  selectedGenerationId: number | null;
  onSelectGeneration: (id: number | null) => void;
}

export const BLBookSelector: React.FC<IBLBookSelectorProps> = ({
  generations,
  selectedGenerationId,
  onSelectGeneration,
}) => {
  return (
    <Card className="bg-gradient-to-br from-content1 to-content1/80 border border-[lab(44.7267%_-21.5987_-26.118_/_0.15)]">
      <Card.Header>
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[lab(44.7267%_-21.5987_-26.118_/_0.1)]">
            <Library className="w-5 h-5 text-[lab(44.7267%_-21.5987_-26.118)]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">My Books</h2>
            <p className="text-xs sm:text-sm text-default-500">
              Select a book to view and edit its chapters
            </p>
          </div>
        </div>
      </Card.Header>
      <Card.Content>
        <Select
          aria-label="Select a saved book"
          className="w-full"
          placeholder="Select a saved book..."
          selectedKey={selectedGenerationId}
          onSelectionChange={(key) => {
            onSelectGeneration(key as number | null);
          }}
        >
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator>
              <ChevronDown className="size-4" />
            </Select.Indicator>
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {generations.length === 0 && (
                <ListBox.Item id="__empty" textValue="No books yet" isDisabled>
                  <span className="text-default-400 italic">No saved books yet</span>
                </ListBox.Item>
              )}
              {generations.map((gen) => (
                <ListBox.Item
                  key={gen.id?.toString() || ""}
                  id={gen.id}
                  textValue={gen.title || ""}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-md bg-[lab(44.7267%_-21.5987_-26.118_/_0.1)]">
                      <BookMarked className="size-4 text-[lab(44.7267%_-21.5987_-26.118)]" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium">{gen.title}</span>
                      {gen.description && (
                        <span className="text-xs text-default-400 truncate max-w-[200px] sm:max-w-[300px]">
                          {gen.description}
                        </span>
                      )}
                    </div>
                  </div>
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
      </Card.Content>
    </Card>
  );
};

export default BLBookSelector;
