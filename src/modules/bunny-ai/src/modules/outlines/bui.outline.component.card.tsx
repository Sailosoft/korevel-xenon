"use client";

import Markdown from "react-markdown";
import React, { useEffect, useState } from "react";
import { Card, Separator, Button } from "@heroui/react";
import Link from "next/link";
import {
  ArrowLeft,
  UserCircle,
  Tag,
  PlusCircle,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { BUIOutlineEntity } from "./bui.outline.entity";
import { BUIOutlineRepository } from "./bui.outline.repository";
import { BUITopicRepository } from "../topics/bui.topic.repository";
import BUIAuthorRepository from "../authors/bui.author.repository";
import { BUI_OUTLINE_GENERATION_TYPES } from "./bui.outline.prompt";
import { buiOutlineChapterPromptContent } from "./bui.outline-chapter.prompt.content";

interface BUIOutlineComponentCardProps {
  outlineId: number;
}

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

  useEffect(() => {
    async function load() {
      try {
        const repo = new BUIOutlineRepository();
        const data = await repo.panelGetOne(outlineId);
        setOutline(data);

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
      } catch (error) {
        console.error("Failed to load outline context:", error);
      } finally {
        setLoading(false);
      }
    }

    if (outlineId) load();
  }, [outlineId]);

  const handleInsertTopic = async () => {
    if (!outline || !topic) return;
    const repo = new BUIOutlineRepository();
    const block = `## Topic: ${topic.title}${
      topic.description ? `\n\n${topic.description}` : ""
    }`.trim();
    const nextSummary = outline.summary
      ? `${block}\n\n${outline.summary}`
      : block;
    await repo.panelUpdate(outlineId, {
      ...outline,
      kind: "outline",
      summary: nextSummary,
    });
    setOutline((prev) => (prev ? { ...prev, summary: nextSummary } : prev));
  };

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

  return (
    <Card className="w-full border border-default-200 shadow-sm rounded-xl bg-background">
      <Card.Header className="flex flex-col items-start px-6 pt-5 pb-2 gap-0.5">
        <Link
          href="/modules/bunny-ai/outlines"
          className="flex items-center gap-1.5 text-xs font-semibold text-[#ff2d20] hover:text-red-600 transition-colors mb-3 group"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
          Back to Outlines
        </Link>

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
          {(outline.minItems != null ||
            outline.maxItems != null) && (
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
      </Card.Header>

      <Separator />

      <Card.Content className="px-6 py-4 flex flex-col gap-4">
        {topic && (
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
            <div className="pl-5 pt-1">
              <Button
                size="sm"
                variant="secondary"
                onPress={handleInsertTopic}
                className="flex items-center gap-1"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Insert topic into summary
              </Button>
            </div>
          </div>
        )}

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
    </Card>
  );
}
