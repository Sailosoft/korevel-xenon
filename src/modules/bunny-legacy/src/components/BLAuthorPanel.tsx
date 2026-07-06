/**
 * BLAuthorPanel - Author management component.
 *
 * Single Responsibility: Author CRUD UI using heroUI, tailwind, lucide-react.
 * No shadcn/ui or radix-ui dependencies.
 */

"use client";

import React from "react";
import { Card, Button, Input, Badge, Separator } from "@heroui/react";
import {
  UserPlus,
  Plus,
  Trash2,
  Save,
  Loader2,
} from "lucide-react";
import type { IBLAuthor } from "../core/BLEntity";

export interface IBLAuthorPanelProps {
  authors: IBLAuthor[];
  selectedAuthorId: string;
  authorName: string;
  authorDesc: string;
  skills: Array<{ name?: string; description?: string; type?: string }>;
  newSkillName: string;
  isLoading: boolean;
  onSelectAuthor: (id: string) => void;
  onAuthorNameChange: (name: string) => void;
  onAuthorDescChange: (desc: string) => void;
  onNewSkillNameChange: (name: string) => void;
  onAddSkill: () => void;
  onRemoveSkill: (index: number) => void;
  onSaveAuthor: () => void;
}

export const BLAuthorPanel: React.FC<IBLAuthorPanelProps> = ({
  authors,
  selectedAuthorId,
  authorName,
  authorDesc,
  skills,
  newSkillName,
  isLoading,
  onSelectAuthor,
  onAuthorNameChange,
  onAuthorDescChange,
  onNewSkillNameChange,
  onAddSkill,
  onRemoveSkill,
  onSaveAuthor,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onAddSkill();
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Author Selector */}
      <Card className="md:col-span-1">
        <Card.Header>
          <h2 className="text-lg font-semibold">Authors</h2>
        </Card.Header>
        <Card.Content>
          <select
            className="w-full p-2 border border-default-200 rounded-lg bg-background text-foreground text-sm"
            value={selectedAuthorId}
            onChange={(e) => onSelectAuthor(e.target.value)}
          >
            <option value="new">+ New Author</option>
            {authors.map((auth) => (
              <option key={auth.id?.toString() || ""} value={auth.id?.toString() || ""}>
                {auth.name}
              </option>
            ))}
          </select>
        </Card.Content>
      </Card>

      {/* Author Editor */}
      <Card className="md:col-span-2">
        <Card.Header>
          <h2 className="text-lg font-semibold">
            {selectedAuthorId === "new" ? "Create Author" : "Edit Author"}
          </h2>
        </Card.Header>
        <Card.Content className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Name</label>
            <Input
              value={authorName}
              onChange={(e) => onAuthorNameChange(e.target.value)}
              placeholder="Author name"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Bio</label>
            <Input
              value={authorDesc}
              onChange={(e) => onAuthorDescChange(e.target.value)}
              placeholder="Brief biography"
            />
          </div>
          <Separator />
          <div className="space-y-2">
            <label className="text-sm font-medium">Skills</label>
            <div className="flex gap-2">
              <Input
                value={newSkillName}
                onChange={(e) => onNewSkillNameChange(e.target.value)}
                placeholder="e.g. Fantasy Writing"
                onKeyDown={handleKeyDown}
              />
              <Button isIconOnly variant="secondary" onPress={onAddSkill}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {skills.length === 0 && (
                <span className="text-xs text-default-400 italic">
                  No skills added yet
                </span>
              )}
              {skills.map((s, i) => (
                <Badge key={i} variant="soft">
                  {s.name}
                  <button
                    onClick={() => onRemoveSkill(i)}
                    className="ml-1.5 hover:text-danger transition-colors"
                    aria-label={`Remove ${s.name}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        </Card.Content>
        <Card.Footer>
          <Button
            className="w-full"
            variant="primary"
            onPress={onSaveAuthor}
            isDisabled={!authorName.trim() || isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {isLoading ? "Saving..." : "Save Profile"}
          </Button>
        </Card.Footer>
      </Card>
    </div>
  );
};

