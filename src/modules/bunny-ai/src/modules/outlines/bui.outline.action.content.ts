// bui.outline.action.content.ts
//
// Orchestration for outline structure generation and item content
// writing. All AI access is funneled through the two server actions; this file
// gathers context, drives the Generation Modes, and persists results.

import { BUIOutlineRepository } from "./bui.outline.repository";
import { BUIOutlineChapterRepository } from "./bui.outline-chapter.repository";
import { BUITopicRepository } from "../topics/bui.topic.repository";
import BUIAuthorRepository from "../authors/bui.author.repository";
import { buiOutlineServerGenerate } from "./bui.outline.server";
import { BUIOutlineEntity, BUIOutlineParams } from "./bui.outline.entity";
import type { HelixAIOption } from "@/src/modules/helix";
import { BUIAuthorSkill } from "../author-skills/bui.author-skills.entity";
import { buiAuthorSkillResolveForGeneration } from "../author-skills/bui.author-skills.util";

export type OutlineConflictMode = "overwrite" | "skip" | "extend";
export type OutlineSummaryMode = "replace" | "append";

export interface GenerateOutlineStructureOptions {
  conflictMode: OutlineConflictMode;
  includeTopic: boolean;
  summaryMode: OutlineSummaryMode;
  insertTopic: boolean;
  /** One-run Generation Type override; when omitted the outline's type is used. */
  generationType?: string;
  useAuthorProfile?: boolean;
  useAuthorSkills?: boolean;
  selectedSkillNames?: string[];
}

export interface GenerateItemContentOptions {
  /** One-run Generation Type override; when omitted the outline's type is used. */
  generationType?: string;
  /** Include the outline's selected Topic in the prompt (default: true). */
  includeTopic?: boolean;
  useAuthorProfile?: boolean;
  useAuthorSkills?: boolean;
  selectedSkillNames?: string[];
  /** Control mode only: include sibling/prior context (referencing) or not. */
  referencing?: boolean;
  /**
   * Control mode only: the item ids explicitly chosen as references for
   * this row. When omitted, all other items are referenced (or none when
   * `referencing` is false).
   */
  referencedIds?: number[];
}

interface ParsedItem {
  number: number;
  title: string;
  description?: string;
  additionalPrompt?: string;
}

interface ParsedStructure {
  summary: string;
  items: ParsedItem[];
}

// ── Context budget ─────────────────────────────────────────────────────────

const MAX_CONTEXT_ITEMS = 25;
const MAX_CONTEXT_CHARS = 16000;

type PriorResponse = NonNullable<BUIOutlineParams["priorResponses"]>[number];

/** Keep the nearest prior responses within a bounded count/character budget. */
function capPriorResponses(responses: PriorResponse[]): PriorResponse[] {
  const out: PriorResponse[] = [];
  let chars = 0;

  for (let i = responses.length - 1; i >= 0; i--) {
    const entry = responses[i];
    const len = entry.content?.length ?? 0;
    if (out.length >= MAX_CONTEXT_ITEMS || chars + len > MAX_CONTEXT_CHARS) {
      break;
    }
    out.unshift(entry);
    chars += len;
  }

  return out;
}

// ── Parsing helpers ────────────────────────────────────────────────────────

function extractJsonObject(raw: string): Record<string, unknown> {
  const cleaned = raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("The AI did not return a valid outline JSON object.");
  }

  return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
}

function parseOutlineStructure(raw: string): ParsedStructure {
  const parsed = extractJsonObject(raw);

  const rawItems = Array.isArray(parsed.items)
    ? (parsed.items as Record<string, unknown>[])
    : [];

  const items: ParsedItem[] = rawItems.map((item, index) => ({
    number: Number(item.number) || index + 1,
    title: String(item.title ?? `Item ${index + 1}`).trim(),
    description:
      item.description != null ? String(item.description).trim() : "",
    additionalPrompt:
      item.additionalPrompt != null
        ? String(item.additionalPrompt).trim()
        : undefined,
  }));

  return {
    summary: String(parsed.summary ?? "").trim(),
    items,
  };
}

/** Prefix the summary with the attached Topic's title/content. */
function applyTopicToSummary(
  summary: string,
  topic?: { title: string; description?: string },
): string {
  if (!topic) return summary;

  const block = `## Topic: ${topic.title}${
    topic.description ? `\n\n${topic.description}` : ""
  }`.trim();

  return summary ? `${block}\n\n${summary}` : block;
}

async function resolveOutlineAuthor(
  outline: BUIOutlineEntity,
): Promise<{ name: string; description: string } | undefined> {
  if (!outline.authorId) return undefined;

  try {
    const authorRepo = new BUIAuthorRepository();
    const author = await authorRepo.get(outline.authorId);

    if (author.isSuccess) {
      return {
        name: author.value.name,
        description: author.value.description || "",
      };
    }
  } catch (error) {
    console.error("Failed to resolve outline author:", error);
  }

  return undefined;
}

/**
 * Resolves the optional selected Topic. `topicId` may arrive as a string from a
 * select field, so it is coerced. A missing/stale Topic is non-fatal: the
 * generation simply proceeds without it.
 */
async function resolveTopic(
  topicRepo: BUITopicRepository,
  topicId: number | string | undefined,
): Promise<{ title: string; description?: string } | undefined> {
  if (topicId == null || topicId === "") return undefined;

  const numericId = Number(topicId);
  if (!Number.isFinite(numericId)) return undefined;

  try {
    const record = await topicRepo.panelGetOne(numericId);
    return { title: record.title, description: record.description };
  } catch {
    console.warn(
      `Topic ${numericId} could not be found; continuing without it.`,
    );
    return undefined;
  }
}

// ── Structure generation ───────────────────────────────────────────────────

/**
 * Generates the outline structure (summary + item rows), applying the
 * conflict mode and summary replacement/append behaviour.
 */
export async function generateOutlineStructureAction(
  outlineId: number,
  options: GenerateOutlineStructureOptions,
  aiConfig?: HelixAIOption,
) {
  const outlineRepo = new BUIOutlineRepository();
  const chapterRepo = new BUIOutlineChapterRepository();
  const topicRepo = new BUITopicRepository();

  const outline = (await outlineRepo.panelGetOne(
    outlineId,
  )) as BUIOutlineEntity;

  if (!outline) {
    throw new Error(`Outline ${outlineId} could not be found.`);
  }

  const existing = await chapterRepo.getItemsByOutline(outlineId);

  // Skip: keep everything as-is.
  if (options.conflictMode === "skip" && existing.length > 0) {
    return {
      success: true,
      skipped: true,
      created: 0,
      summary: outline.summary ?? "",
    };
  }

  // Resolve the optional selected Topic.
  const topic = await resolveTopic(topicRepo, outline.topicId);

  const author =
    options.useAuthorProfile !== false
      ? await resolveOutlineAuthor(outline)
      : undefined;

  let skills: BUIAuthorSkill[] = [];
  if (options.useAuthorSkills) {
    skills = await buiAuthorSkillResolveForGeneration(
      options.selectedSkillNames,
      outline.authorId,
    );
  }

  const params: BUIOutlineParams = {
    outline,
    topic,
    items: existing.map((item) => ({
      number: item.number,
      title: item.title,
      description: item.description || "",
    })),
    author,
    skills: skills.length > 0 ? skills : undefined,
  };

  const raw = await buiOutlineServerGenerate(
    params,
    options.generationType || outline.generationType || "guide",
    options.includeTopic,
    aiConfig,
  );

  const structure = parseOutlineStructure(raw);

  // Enforce the optional requested maximum (the AI is asked to respect it, but
  // clamp defensively so the range is honoured).
  const maxItems = Number(outline.maxItems);
  const generatedItems =
    Number.isFinite(maxItems) && maxItems > 0
      ? structure.items.slice(0, maxItems)
      : structure.items;

  // Conflict resolution.
  if (options.conflictMode === "overwrite" && existing.length > 0) {
    await Promise.all(existing.filter((s) => s.id).map((s) => chapterRepo.delete(s.id!)));
  }

  let numberOffset = 0;
  if (options.conflictMode === "extend" && existing.length > 0) {
    numberOffset = Math.max(...existing.map((s) => s.number));
  }

  for (const item of generatedItems) {
    await chapterRepo.panelCreate({
      bookId: outlineId,
      number: item.number + numberOffset,
      title: item.title,
      description: item.description || "",
      additionalPrompt: item.additionalPrompt,
      status: "pending",
    });
  }

  // Summary handling.
  let nextSummary = structure.summary;
  if (options.insertTopic && options.includeTopic && topic) {
    nextSummary = applyTopicToSummary(nextSummary, topic);
  }

  if (options.summaryMode === "append" && (outline.summary ?? "").trim()) {
    nextSummary = `${outline.summary}\n\n${nextSummary}`.trim();
  }

  await outlineRepo.panelUpdate(outlineId, {
    ...outline,
    kind: "outline",
    summary: nextSummary,
  });

  return {
    success: true,
    skipped: false,
    created: generatedItems.length,
    summary: nextSummary,
  };
}

// ── Item content generation ─────────────────────────────────────────

/**
 * Context injected by each Generation Mode. Exposed for the UI so it can explain
 * what a mode will include before running.
 */
export function resolveItemModeContext(
  generationMode: string,
  all: {
    id?: number;
    number: number;
    title: string;
    description?: string;
    additionalPrompt?: string;
    content?: string;
  }[],
  currentId: number | undefined,
  referencing: boolean,
  referencedIds?: number[],
): Pick<BUIOutlineParams, "priorResponses" | "siblingContext"> {
  const others = all.filter((item) => item.id !== currentId);

  if (generationMode === "chain_of_thought") {
    const prior = others
      .filter((item) => item.number < (all.find((s) => s.id === currentId)?.number ?? 0))
      .filter((item) => !!item.content && item.content.trim().length > 0)
      .sort((a, b) => a.number - b.number)
      .map((item) => ({
        number: item.number,
        title: item.title,
        description: item.description || "",
        additionalPrompt: item.additionalPrompt,
        content: item.content || "",
      }));

    return { priorResponses: capPriorResponses(prior) };
  }

  if (generationMode === "control") {
    if (!referencing) return {};

    const selected =
      referencedIds && referencedIds.length > 0
        ? others.filter(
            (item) => item.id != null && referencedIds.includes(item.id),
          )
        : others;

    return {
      siblingContext: selected.map((item) => ({
        number: item.number,
        title: item.title,
        description: item.description || "",
        content: item.content,
      })),
    };
  }

  // sequential / critique / consolidate / parallel / iterative_refine use the
  // full `items` map and/or the current content directly.
  return {};
}

/**
 * Client transport to the outline content Route Handler.
 *
 * Route Handlers (unlike Server Actions) are not serialized per client, so
 * several of these requests run concurrently. That is what makes the parallel
 * writing pool actually parallel.
 */
async function requestItemContent(
  params: BUIOutlineParams,
  generationType: string,
  generationMode: string,
  aiConfig?: HelixAIOption,
): Promise<string> {
  const response = await fetch("/api/bunny-ai/outlines/item-content", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ params, generationType, generationMode, aiConfig }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { success?: boolean; content?: string; error?: string }
    | null;

  if (!response.ok || !payload?.success) {
    throw new Error(
      payload?.error || "Failed to generate item content with AI.",
    );
  }

  return payload.content ?? "";
}

/**
 * Generates and persists content for a single item using the outline's
 * Generation Type and the supplied Generation Mode.
 */
export async function generateItemContentAction(
  itemId: number,
  generationMode: string,
  aiConfig?: HelixAIOption,
  options: GenerateItemContentOptions = {},
) {
  const chapterRepo = new BUIOutlineChapterRepository();
  const outlineRepo = new BUIOutlineRepository();
  const topicRepo = new BUITopicRepository();

  const item = await chapterRepo.panelGetOne(itemId);

  if (!item || !item.bookId) {
    throw new Error(
      `Item ${itemId} or its Outline relationship does not exist.`,
    );
  }

  await chapterRepo.panelUpdate(itemId, {
    ...item,
    status: "being_generated",
  });

  try {
    const outlineId = item.bookId;
    const outline = (await outlineRepo.panelGetOne(
      outlineId,
    )) as BUIOutlineEntity;

    const all = await chapterRepo.getItemsByOutline(outlineId);

    const topic =
      options.includeTopic === false
        ? undefined
        : await resolveTopic(topicRepo, outline.topicId);

    const useAuthorProfile = options.useAuthorProfile !== false;
    const author = useAuthorProfile
      ? await resolveOutlineAuthor(outline)
      : undefined;

    let skills: BUIAuthorSkill[] = [];
    if (options.useAuthorSkills) {
      skills = await buiAuthorSkillResolveForGeneration(
        options.selectedSkillNames,
        outline.authorId,
      );
    }

    const modeContext = resolveItemModeContext(
      generationMode,
      all,
      item.id,
      options.referencing !== false,
      options.referencedIds,
    );

    const params: BUIOutlineParams = {
      outline,
      topic,
      items: all.map((item) => ({
        number: item.number,
        title: item.title,
        description: item.description || "",
      })),
      currentItem: item,
      author,
      skills: skills.length > 0 ? skills : undefined,
      ...modeContext,
    };

    const content = await requestItemContent(
      params,
      options.generationType || outline.generationType || "guide",
      generationMode,
      aiConfig,
    );

    const wordCount = content.split(/\s+/).filter(Boolean).length;

    const finalRecord = {
      ...item,
      content,
      wordCount,
      status: "done" as const,
    };

    await chapterRepo.panelUpdate(itemId, finalRecord);

    return { success: true, record: finalRecord };
  } catch (error) {
    console.error(`Item generation failed for ${itemId}:`, error);
    await chapterRepo.panelUpdate(itemId, {
      ...item,
      status: "empty",
    });
    throw error;
  }
}
