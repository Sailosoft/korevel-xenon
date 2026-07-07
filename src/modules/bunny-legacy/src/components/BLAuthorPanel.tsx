/**
 * BLAuthorPanel - Author management component.
 *
 * Single Responsibility: Author CRUD UI using heroUI, tailwind, lucide-react.
 * No shadcn/ui or radix-ui dependencies.
 */

"use client";

import React from "react";
import {
  Card,
  Button,
  Input,
  TextArea,
  Separator,
  Select,
  ListBox,
  Chip,
} from "@heroui/react";
import {
  UserPlus,
  Plus,
  Trash2,
  Save,
  Loader2,
  ChevronDown,
  Check,
  X,
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
      {/* Author Selector */}
      <Card className="md:col-span-1 bg-gradient-to-br from-content1 to-content1/80 border border-[lab(44.7267%_-21.5987_-26.118_/_0.15)]">
        <Card.Header>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[lab(44.7267%_-21.5987_-26.118_/_0.1)]">
              <UserPlus className="w-5 h-5 text-[lab(44.7267%_-21.5987_-26.118)]" />
            </div>
            <h2 className="text-lg font-semibold">Authors</h2>
          </div>
        </Card.Header>
        <Card.Content>
          <Select
            aria-label="Select an author"
            className="w-full"
            placeholder="Select an author..."
            selectedKey={selectedAuthorId}
            onSelectionChange={(key) => onSelectAuthor(key as string)}
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator>
                <ChevronDown className="size-4" />
              </Select.Indicator>
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBox.Item id="new" textValue="+ New Author">
                  <span className="flex items-center gap-2 text-primary">
                    <UserPlus className="size-4" />
                    + New Author
                  </span>
                </ListBox.Item>
                {authors.map((auth) => (
                  <ListBox.Item
                    key={auth.id?.toString() || ""}
                    id={auth.id?.toString() || ""}
                    textValue={auth.name || ""}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span>{auth.name}</span>
                      {selectedAuthorId === auth.id?.toString() && (
                        <Check className="size-4 text-primary" />
                      )}
                    </div>
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        </Card.Content>
      </Card>

      {/* Author Editor */}
      <Card className="md:col-span-2 bg-gradient-to-br from-content1 to-content1/80 border border-primary/10">
        <Card.Header>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <UserPlus className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">
              {selectedAuthorId === "new" ? "Create Author" : "Edit Author"}
            </h2>
          </div>
        </Card.Header>
        <Card.Content className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-default-700">Name</label>
            <Input
              aria-label="Author name"
              value={authorName}
              onChange={(e) => onAuthorNameChange(e.target.value)}
              placeholder="Author name"
              className="w-full"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-default-700">Bio</label>
            <TextArea
              aria-label="Author biography"
              value={authorDesc}
              onChange={(e) => onAuthorDescChange(e.target.value)}
              placeholder="Brief biography"
              rows={3}
            />
          </div>
          <Separator className="bg-primary/5" />
          <div className="space-y-3">
            <label className="text-sm font-medium text-default-700">Skills</label>
            <div className="flex gap-2 w-full">
              <div className="flex-1 min-w-0">
                <Input
                  aria-label="New skill name"
                  value={newSkillName}
                  onChange={(e) => onNewSkillNameChange(e.target.value)}
                  placeholder="e.g. Fantasy Writing"
                  onKeyDown={handleKeyDown}
                  className="w-full"
                />
              </div>
              <Button isIconOnly variant="secondary" onPress={onAddSkill} aria-label="Add skill">
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
                <Chip key={i} variant="soft" className="bg-primary/5 border border-primary/10">
                  <span className="flex items-center gap-1">
                    {s.name}
                    <button
                      onClick={() => onRemoveSkill(i)}
                      className="ml-0.5 hover:text-danger transition-colors rounded-full focus:outline-none focus:ring-2 focus:ring-danger/30"
                      aria-label={`Remove ${s.name}`}
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                </Chip>
              ))}
            </div>
          </div>
        </Card.Content>
        <Card.Footer>
          <Button
            className="w-full font-medium text-white border-0 transition-all duration-300"
            variant="primary"
            onPress={onSaveAuthor}
            isDisabled={!authorName.trim() || isLoading}
            style={{
              background: "linear-gradient(135deg, lab(44.7267% -21.5987 -26.118), lab(32% -14 -18))",
            }}
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

