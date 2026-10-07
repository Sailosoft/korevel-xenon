"use client";

import Markdown from "react-markdown";
import React, { useCallback, useEffect, useState } from "react";
import {
  Card,
  Separator,
  Button,
  Input,
  TextArea,
  Select,
  ListBox,
} from "@heroui/react";
import Link from "next/link";
import {
  ArrowLeft,
  UserCircle,
  Tag,
  ChevronRight,
  ChevronDown,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { BUIOutlineEntity } from "./bui.outline.entity";
import { BUIOutlineRepository } from "./bui.outline.repository";
import { BUITopicRepository } from "../topics/bui.topic.repository";
import { BUITopicEntity } from "../topics/bui.topic.entity";
import BUIAuthorRepository from "../authors/bui.author.repository";
import { BUIAuthor } from "../authors/bui.author.entity";
import { BUI_OUTLINE_GENERATION_TYPES } from "./bui.outline.prompt";
import { buiOutlineChapterPromptContent } from "./bui.outline-chapter.prompt.content";

interface BUIOutlineComponentCardProps {
  outlineId: number;
}

interface BUIOutlineMetaDraft {
  title: string;
  description: string;
  additionalPrompt: string;
  summary: string;
  generationType: string;
  generationMode: string;
  topicId?: number;
  authorId?: number;
  minItems?: number;
  maxItems?: number;
  minWords?: number;
  maxWords?: number;
}

const NONE_VALUE = "none";

const TYPE_OPTIONS = BUI_OUTLINE_GENERATION_TYPES.map((type) => ({
  label: type.name,
  value: type.key,
}));

const MODE_OPTIONS = buiOutlineChapterPromptContent.modes.map((mode) => ({
  label: mode.label,
  value: mode.key,
}));

function typeLabel(key?: string): string {
  return (
    BUI_OUTLINE_GENERATION_TYPES.find((type) => type.key === key)?.name ||
    key ||
    "—"
  );
}

function modeLabel(key?: string): string {
  return (
    buiOutlineChapterPromptContent.modes.find((mode) => mode.key === key)
      ?.label ||
    key ||
    "—"
  );
}

function toOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1 ${className ?? ""}`}>
      <span className="text-[11px] font-bold uppercase text-default-400 tracking-wide">
        {label}
      </span>
      {children}
    </div>
  );
}

function MetaSelect({
  ariaLabel,
  value,
  options,
  onChange,
}: {
  ariaLabel: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <Select
      aria-label={ariaLabel}
      fullWidth
      value={value}
      onChange={(key) => onChange(String(key))}
    >
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {options.map((option) => (
            <ListBox.Item
              key={option.value}
              id={option.value}
              textValue={option.label}
            >
              {option.label}
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

function RelationSelect({
  ariaLabel,
  value,
  options,
  placeholder,
  onChange,
}: {
  ariaLabel: string;
  value?: number;
  options: { label: string; value: number }[];
  placeholder: string;
  onChange: (value: number | undefined) => void;
}) {
  return (
    <Select
      aria-label={ariaLabel}
      fullWidth
      placeholder={placeholder}
      value={value != null ? String(value) : NONE_VALUE}
      onChange={(key) => {
        const next = String(key);
        onChange(next === NONE_VALUE ? undefined : Number(next));
      }}
    >
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          <ListBox.Item id={NONE_VALUE} textValue="None">
            None
          </ListBox.Item>
          {options.map((option) => (
            <ListBox.Item
              key={option.value}
              id={String(option.value)}
              textValue={option.label}
            >
              {option.label}
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

function MetaSection({
  label,
  children,
  defaultOpen = false,
}: {
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState<boolean>(defaultOpen);

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex items-center gap-1 text-[11px] font-bold uppercase text-default-400 tracking-wide hover:text-default-600 transition-colors w-fit"
      >
        {open ? (
          <ChevronDown className="w-3.5 h-3.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" />
        )}
        <span>{label}</span>
      </button>
      {open && <div className="flex flex-col gap-1">{children}</div>}
    </div>
  );
}

export function BUIOutlineComponentCard({
  outlineId,
}: BUIOutlineComponentCardProps) {
  const [outline, setOutline] = useState<BUIOutlineEntity | null>(null);
  const [topic, setTopic] = useState<{ title: string; description?: string } | null>(
    null,
  );
  const [authorName, setAuthorName] = useState<string | null>(null);
  const [authorDescription, setAuthorDescription] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [draft, setDraft] = useState<BUIOutlineMetaDraft | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [topicList, setTopicList] = useState<BUITopicEntity[]>([]);
  const [authorList, setAuthorList] = useState<BUIAuthor[]>([]);

  const resolveRelations = useCallback(async (data: BUIOutlineEntity) => {
    setTopic(null);
    setAuthorName(null);
    setAuthorDescription("");

    if (data?.topicId != null) {
      try {
        const topicRepo = new BUITopicRepository();
        const topicRecord = await topicRepo.panelGetOne(Number(data.topicId));
        setTopic({
          title: topicRecord.title,
          description: topicRecord.description,
        });
      } catch {
        console.warn(
          `Topic ${data.topicId} could not be found; continuing without it.`,
        );
      }
    }

    if (data?.authorId) {
      try {
        const authorRepo = new BUIAuthorRepository();
        const authorResult = await authorRepo.get(Number(data.authorId));
        if (authorResult.isSuccess) {
          setAuthorName(authorResult.value.name);
          setAuthorDescription(authorResult.value.description || "");
        }
      } catch (error) {
        console.error("Failed to resolve outline author:", error);
      }
    }
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const repo = new BUIOutlineRepository();
        const data = await repo.panelGetOne(outlineId);
        setOutline(data);
        await resolveRelations(data);
      } catch (error) {
        console.error("Failed to load outline context:", error);
      } finally {
        setLoading(false);
      }
    }

    if (outlineId) load();
  }, [outlineId, resolveRelations]);

  const loadRelationOptions = useCallback(async () => {
    if (topicList.length === 0) {
      try {
        const topicResult = await new BUITopicRepository().getList({});
        if (topicResult.isSuccess) setTopicList(topicResult.value);
      } catch (error) {
        console.error("Failed to load topics for outline meta:", error);
      }
    }

    if (authorList.length === 0) {
      try {
        const authorResult = await new BUIAuthorRepository().getList({});
        if (authorResult.isSuccess) setAuthorList(authorResult.value);
      } catch (error) {
        console.error("Failed to load authors for outline meta:", error);
      }
    }
  }, [topicList.length, authorList.length]);

  const startEditing = useCallback(() => {
    if (!outline) return;
    setSaveError(null);
    setDraft({
      title: outline.title ?? "",
      description: outline.description ?? "",
      additionalPrompt: outline.additionalPrompt ?? "",
      summary: outline.summary ?? "",
      generationType: outline.generationType ?? "guide",
      generationMode: outline.generationMode ?? "sequential",
      topicId: outline.topicId,
      authorId: outline.authorId,
      minItems: outline.minItems,
      maxItems: outline.maxItems,
      minWords: outline.minWords,
      maxWords: outline.maxWords,
    });
    setIsEditing(true);
    void loadRelationOptions();
  }, [outline, loadRelationOptions]);

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
    setDraft(null);
    setSaveError(null);
  }, []);

  const updateDraft = useCallback((patch: Partial<BUIOutlineMetaDraft>) => {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const handleSave = useCallback(async () => {
    if (!outline || !draft || !outlineId) return;

    if (!draft.title.trim()) {
      setSaveError("Title is required.");
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      const repo = new BUIOutlineRepository();
      const payload: BUIOutlineEntity = {
        ...outline,
        kind: "outline",
        title: draft.title.trim(),
        description: draft.description.trim() || undefined,
        additionalPrompt: draft.additionalPrompt.trim() || undefined,
        summary: draft.summary,
        generationType: draft.generationType,
        generationMode: draft.generationMode,
        topicId: draft.topicId,
        authorId: draft.authorId,
        minItems: draft.minItems,
        maxItems: draft.maxItems,
        minWords: draft.minWords,
        maxWords: draft.maxWords,
      };

      await repo.panelUpdate(outlineId, payload);
      setOutline(payload);
      await resolveRelations(payload);
      setIsEditing(false);
      setDraft(null);
    } catch (error) {
      console.error("Failed to update outline meta:", error);
      setSaveError(
        error instanceof Error
          ? error.message
          : "Failed to save the outline changes.",
      );
    } finally {
      setSaving(false);
    }
  }, [outline, draft, outlineId, resolveRelations]);

  if (loading) {
    return (
      <Card className="w-full border border-default-200 shadow-sm rounded-xl">
        <div className="h-[140px] w-full animate-pulse bg-default-100 rounded-xl" />
      </Card>
    );
  }

  if (!outline) {
    return (
      <div className="p-4 text-sm text-danger bg-danger-50 rounded-xl border border-danger-200">
        Outline information could not be found.
      </div>
    );
  }

  const authorOptions = authorList
    .filter((author) => author.id != null)
    .map((author) => ({ label: author.name, value: author.id as number }));

  const topicOptions = topicList
    .filter((item) => item.id != null)
    .map((item) => ({ label: item.title, value: item.id as number }));

  return (
    <Card className="w-full border border-default-200 shadow-sm rounded-xl bg-background">
      <Card.Header className="flex flex-col items-start px-6 pt-5 pb-2 gap-0.5">
        <div className="flex w-full items-center justify-between gap-3 mb-3">
          <Link
            href="/modules/bunny-ai/outlines"
            className="flex items-center gap-1.5 text-xs font-semibold text-[#ff2d20] hover:text-red-600 transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            Back to Outlines
          </Link>

          {!isEditing && (
            <Button
              size="sm"
              variant="secondary"
              onPress={startEditing}
              className="flex items-center gap-1"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit meta
            </Button>
          )}
        </div>

        {isEditing ? (
          <span className="text-xs font-semibold uppercase tracking-wider text-default-400">
            Editing Outline Meta
          </span>
        ) : (
          <>
            <span className="text-xs font-semibold uppercase tracking-wider text-default-400">
              Outline Workspace For
            </span>
            <Card.Title className="text-2xl font-bold text-foreground tracking-tight">
              {outline.title}
            </Card.Title>

            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                {typeLabel(outline.generationType)}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-default-100 text-default-600 border border-default-200">
                {modeLabel(outline.generationMode)}
              </span>
              {authorName && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-default-50 text-default-500 border border-default-200">
                  <UserCircle className="w-3 h-3" />
                  {authorName}
                </span>
              )}
              {(outline.minItems != null || outline.maxItems != null) && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-default-50 text-default-500 border border-default-200">
                  Items:{" "}
                  {outline.minItems != null ? outline.minItems : "—"}–
                  {outline.maxItems != null ? outline.maxItems : "—"}
                </span>
              )}
              {(outline.minWords != null || outline.maxWords != null) && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-default-50 text-default-500 border border-default-200">
                  Words:{" "}
                  {outline.minWords != null ? outline.minWords : "—"}–
                  {outline.maxWords != null ? outline.maxWords : "—"}
                </span>
              )}
            </div>
          </>
        )}
      </Card.Header>

      <Separator />

      {isEditing && draft ? (
        <Card.Content className="px-6 py-4 flex flex-col gap-4">
          {saveError && (
            <div className="p-2.5 text-xs text-danger bg-danger-50 border border-danger-200 rounded-lg">
              {saveError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Title" className="md:col-span-2">
              <Input
                fullWidth
                value={draft.title}
                onChange={(event) => updateDraft({ title: event.target.value })}
              />
            </Field>

            <Field label="Generation Type">
              <MetaSelect
                ariaLabel="Generation Type"
                value={draft.generationType}
                options={TYPE_OPTIONS}
                onChange={(value) => updateDraft({ generationType: value })}
              />
            </Field>

            <Field label="Generation Mode">
              <MetaSelect
                ariaLabel="Generation Mode"
                value={draft.generationMode}
                options={MODE_OPTIONS}
                onChange={(value) => updateDraft({ generationMode: value })}
              />
            </Field>

            <Field label="Author (optional)">
              <RelationSelect
                ariaLabel="Author"
                value={draft.authorId}
                options={authorOptions}
                placeholder="No author"
                onChange={(value) => updateDraft({ authorId: value })}
              />
            </Field>

            <Field label="Topic (optional)">
              <RelationSelect
                ariaLabel="Topic"
                value={draft.topicId}
                options={topicOptions}
                placeholder="No topic"
                onChange={(value) => updateDraft({ topicId: value })}
              />
            </Field>

            <Field label="Minimum items (optional)">
              <Input
                fullWidth
                type="number"
                min={0}
                value={draft.minItems != null ? String(draft.minItems) : ""}
                onChange={(event) =>
                  updateDraft({ minItems: toOptionalNumber(event.target.value) })
                }
              />
            </Field>

            <Field label="Maximum items (optional)">
              <Input
                fullWidth
                type="number"
                min={0}
                value={draft.maxItems != null ? String(draft.maxItems) : ""}
                onChange={(event) =>
                  updateDraft({ maxItems: toOptionalNumber(event.target.value) })
                }
              />
            </Field>

            <Field label="Minimum words (optional)">
              <Input
                fullWidth
                type="number"
                min={0}
                value={draft.minWords != null ? String(draft.minWords) : ""}
                onChange={(event) =>
                  updateDraft({ minWords: toOptionalNumber(event.target.value) })
                }
              />
            </Field>

            <Field label="Maximum words (optional)">
              <Input
                fullWidth
                type="number"
                min={0}
                value={draft.maxWords != null ? String(draft.maxWords) : ""}
                onChange={(event) =>
                  updateDraft({ maxWords: toOptionalNumber(event.target.value) })
                }
              />
            </Field>

            <Field label="Description" className="md:col-span-2">
              <TextArea
                fullWidth
                rows={4}
                value={draft.description}
                onChange={(event) =>
                  updateDraft({ description: event.target.value })
                }
              />
            </Field>

            <Field label="Outline AI Instruction" className="md:col-span-2">
              <TextArea
                fullWidth
                rows={3}
                value={draft.additionalPrompt}
                onChange={(event) =>
                  updateDraft({ additionalPrompt: event.target.value })
                }
              />
            </Field>

            <Field label="AI Summary" className="md:col-span-2">
              <TextArea
                fullWidth
                rows={6}
                value={draft.summary}
                onChange={(event) =>
                  updateDraft({ summary: event.target.value })
                }
              />
            </Field>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button
              variant="primary"
              onPress={handleSave}
              isDisabled={saving}
              className="flex items-center gap-1"
            >
              <Check className="w-4 h-4" />
              {saving ? "Saving…" : "Save changes"}
            </Button>
            <Button
              variant="ghost"
              onPress={cancelEditing}
              isDisabled={saving}
              className="flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Cancel
            </Button>
          </div>
        </Card.Content>
      ) : (
        <Card.Content className="px-6 py-4 flex flex-col gap-4">
          {authorName && (
            <div className="p-3 bg-default-50 border border-default-200 rounded-xl flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-default-500 uppercase tracking-wider">
                <UserCircle className="w-4 h-4 text-default-400" />
                <span>Author Information Profile</span>
              </div>
              <div className="pl-5 flex flex-col gap-0.5">
                <span className="text-sm font-bold text-default-800">
                  {authorName}
                </span>
                <div className="text-xs text-default-500 italic leading-relaxed prose dark:prose-invert max-w-none">
                  <Markdown>
                    {authorDescription || "No biography details assigned."}
                  </Markdown>
                </div>
              </div>
            </div>
          )}

          <MetaSection label="Outline Meta">
            {topic ? (
              <div className="p-3 bg-default-50 border border-default-200 rounded-xl flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-default-500 uppercase tracking-wider">
                  <Tag className="w-4 h-4 text-default-400" />
                  <span>Topic</span>
                </div>
                <div className="pl-5 flex flex-col gap-0.5">
                  <span className="text-sm font-bold text-default-800">
                    {topic.title}
                  </span>
                  {topic.description && (
                    <div className="text-xs text-default-500 italic leading-relaxed prose dark:prose-invert max-w-none">
                      <Markdown>{topic.description}</Markdown>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <span className="text-sm text-default-400 italic">
                No topic assigned.
              </span>
            )}

            {outline.description && (
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase text-default-400 tracking-wide">
                  Description
                </span>
                <div className="text-sm text-default-700 prose dark:prose-invert max-w-none leading-relaxed">
                  <Markdown>{outline.description}</Markdown>
                </div>
              </div>
            )}

            {outline.additionalPrompt && (
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase text-default-400 tracking-wide">
                  Outline AI Instruction
                </span>
                <p className="text-sm text-default-600 italic">
                  {outline.additionalPrompt}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold uppercase text-default-400 tracking-wide">
                AI Summary
              </span>
              <div className="text-sm text-default-700 prose dark:prose-invert max-w-none leading-relaxed">
                <Markdown>{outline.summary || "*Not generated yet.*"}</Markdown>
              </div>
            </div>
          </MetaSection>
        </Card.Content>
      )}
    </Card>
  );
}
