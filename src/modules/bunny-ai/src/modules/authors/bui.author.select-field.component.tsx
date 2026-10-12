// bui.author.select-field.component.tsx
//
// "custom" form field for the Book form's `authorId`. Renders a dropdown of
// existing authors plus an inline "New author" panel (name + optional
// description). Creating an author persists it, refreshes the list, and
// auto-selects it — all without leaving the book modal.

"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Button, Input, Label, ListBox, Select, TextArea } from "@heroui/react";
import { UserPlus, X } from "lucide-react";
import type { BunnyFieldRendererProps } from "@/src/modules/bunny/src/form/BunnyForm.Interface";
import { buiDatabase } from "../../database/bui.database";
import type { BUIAuthor } from "./bui.author.entity";

export default function BUIAuthorSelectField({
  field,
  value,
  onChange,
}: BunnyFieldRendererProps) {
  const [authors, setAuthors] = useState<BUIAuthor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // The BunnyFormBuilder already renders the field label + validation error for
  // custom fields, so this component only renders the control itself.
  const fieldName = field.name;
  const label = field.label || "Author";

  const refreshAuthors = useCallback(async () => {
    try {
      setAuthors(await buiDatabase.authors.toArray());
    } catch (error) {
      console.error("Failed to load authors:", error);
    }
  }, []);

  // Initial load. State is only set from the promise callbacks (never
  // synchronously in the effect body) to avoid cascading renders. The create
  // panel opens by default when there is nothing to select yet, so an empty
  // state is immediately actionable; cancelling it will not reopen because the
  // empty state is only evaluated once here.
  useEffect(() => {
    let isMounted = true;
    buiDatabase.authors
      .toArray()
      .then((rows) => {
        if (!isMounted) return;
        setAuthors(rows);
        if (rows.length === 0) setShowCreate(true);
      })
      .catch((error) => {
        console.error("Failed to load authors:", error);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const canCreate = name.trim().length > 0 && !isSaving;

  const handleSelect = useCallback(
    (val: unknown) => {
      if (val == null) {
        onChange(fieldName, undefined);
        return;
      }
      // HeroUI coerces option ids to strings; restore the numeric author id.
      onChange(fieldName, Number(val));
    },
    [fieldName, onChange],
  );

  const handleCreate = useCallback(async () => {
    const trimmedName = name.trim();
    if (!trimmedName || isSaving) return;
    setIsSaving(true);
    try {
      const id = await buiDatabase.authors.add({
        name: trimmedName,
        description: description.trim() || undefined,
      });
      await refreshAuthors();
      onChange(fieldName, id);
      setName("");
      setDescription("");
      setShowCreate(false);
    } catch (error) {
      console.error("Failed to create author:", error);
    } finally {
      setIsSaving(false);
    }
  }, [name, description, isSaving, fieldName, refreshAuthors, onChange]);

  const handleCancel = useCallback(() => {
    setName("");
    setDescription("");
    setShowCreate(false);
  }, []);

  const selectValue = value != null ? String(value) : null;

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <Select
            aria-label={label}
            fullWidth
            value={selectValue}
            onChange={handleSelect}
            placeholder={isLoading ? "Loading..." : "Select an author"}
            isDisabled={isLoading}
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover className="max-w-(--trigger-width)">
              <ListBox className="max-h-[320px] overflow-y-auto">
                {isLoading ? (
                  <ListBox.Item
                    id="loading"
                    textValue="Loading authors..."
                    className="text-default-400 italic"
                  >
                    Loading authors...
                  </ListBox.Item>
                ) : authors.length === 0 ? (
                  <ListBox.Item
                    id="empty"
                    textValue="No authors found"
                    className="text-default-400 italic"
                  >
                    No authors yet — create one below
                  </ListBox.Item>
                ) : (
                  authors.map((author) => (
                    <ListBox.Item
                      key={String(author.id)}
                      id={String(author.id)}
                      textValue={author.name}
                    >
                      {author.name}
                    </ListBox.Item>
                  ))
                )}
              </ListBox>
            </Select.Popover>
          </Select>
        </div>

        <Button
          type="button"
          size="sm"
          variant={showCreate ? "tertiary" : "secondary"}
          onPress={() => (showCreate ? handleCancel() : setShowCreate(true))}
          className="flex items-center gap-1 shrink-0"
          aria-label={showCreate ? "Cancel new author" : "Create a new author"}
        >
          {showCreate ? (
            <X className="w-3.5 h-3.5" />
          ) : (
            <UserPlus className="w-3.5 h-3.5" />
          )}
          {showCreate ? "Cancel" : "New"}
        </Button>
      </div>

      {showCreate && (
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
          <div className="flex flex-col gap-1">
            <Label
              htmlFor="bui-new-author-name"
              className="text-xs font-medium text-slate-600"
            >
              Author Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="bui-new-author-name"
              type="text"
              placeholder="e.g. Jane Austen"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label
              htmlFor="bui-new-author-description"
              className="text-xs font-medium text-slate-600"
            >
              Description (optional)
            </Label>
            <TextArea
              id="bui-new-author-description"
              placeholder="A brief bio or background..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[72px]"
            />
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              variant="primary"
              isDisabled={!canCreate}
              onPress={handleCreate}
              className="flex items-center gap-1"
            >
              <UserPlus className="w-3.5 h-3.5" />
              {isSaving ? "Creating..." : "Create & Select"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
