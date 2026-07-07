/**
 * BLBookSelector - Saved books list component.
 *
 * Single Responsibility: Display and select saved book generations.
 * Uses heroUI components and lucide-react icons. No shadcn/ui.
 */

"use client";

import React from "react";
import { Card, Select, ListBox } from "@heroui/react";
import { BookText, ChevronDown, BookMarked } from "lucide-react";
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
    <Card>
      <Card.Header>
        <div className="flex items-center gap-2">
          <BookText className="w-5 h-5" />
          <h2 className="text-lg font-semibold">My Books</h2>
        </div>
        <p className="text-sm text-default-500">
          Select a book to view and edit its chapters
        </p>
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
                  <div className="flex items-center gap-2">
                    <BookMarked className="size-4 text-default-500" />
                    <span>{gen.title}</span>
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
