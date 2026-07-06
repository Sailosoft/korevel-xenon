/**
 * BLBookSelector - Saved books list component.
 *
 * Single Responsibility: Display and select saved book generations.
 * Uses heroUI components and lucide-react icons. No shadcn/ui.
 */

"use client";

import React from "react";
import { Card } from "@heroui/react";
import { BookText } from "lucide-react";
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
        <select
          className="w-full p-2 border border-default-200 rounded-lg bg-background text-foreground text-sm"
          value={selectedGenerationId?.toString() || ""}
          onChange={(e) => {
            const val = e.target.value;
            onSelectGeneration(val ? parseInt(val) : null);
          }}
        >
          <option value="">Select a saved book...</option>
          {generations.map((gen) => (
            <option key={gen.id?.toString() || ""} value={gen.id?.toString() || ""}>
              {gen.title}
            </option>
          ))}
        </select>
      </Card.Content>
    </Card>
  );
};

export default BLBookSelector;
