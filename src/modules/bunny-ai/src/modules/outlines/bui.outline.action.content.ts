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
import {
  BUIOutlineEntity,
  BUIOutlineItemEntity,
  BUIOutlineParams,
  BUIOutlineRefinementFinding,
  BUIOutlineRefinementPlan,
} from "./bui.outline.entity";
import type { HelixAIOption } from "@/src/modules/helix";
import { BUIAuthorSkill } from "../author-skills/bui.author-skills.entity";
import { buiAuthorSkillResolveForGeneration } from "../author-skills/bui.author-skills.util";
import { resolveOutlineGenerateMode } from "./bui.outline-chapter.generate-mode";
import { buiDatabase } from "../../database/bui.database";
import { diffWords } from "diff";

export type OutlineConflictMode = "overwrite" | "skip" | "extend";
export type OutlineSummaryMode = "replace" | "append";

export interface GenerateOutlineStructureOptions {
  conflictMode: OutlineConflictMode;
  includeTopic: boolean;
  summaryMode: OutlineSummaryMode;
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
  const mode = resolveOutlineGenerateMode(generationMode);
  if (mode.planOnly) {
    throw new Error(
      `${mode.name} is a plan-only mode. Use the Refine wizard instead of content writing.`,
    );
  }

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

    // Persisted per-item references (set from the item card's Reference
    // section) are the default; an explicit run override still wins.
    const persistedReferenceIds =
      Array.isArray(item.referenceIds) && item.referenceIds.length > 0
        ? item.referenceIds
        : undefined;

    const modeContext = resolveItemModeContext(
      generationMode,
      all,
      item.id,
      options.referencing !== false,
      options.referencedIds ?? persistedReferenceIds,
    );

    const params: BUIOutlineParams = {
      outline,
      topic,
      items: all.map((item) => ({
        id: item.id,
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

// ── Refinement pipeline (critique → apply → iterative refine) ───────────────

/** Options shared by the Refine-wizard actions. */
export interface RefinementRunOptions {
  includeTopic?: boolean;
  useAuthorProfile?: boolean;
  useAuthorSkills?: boolean;
  selectedSkillNames?: string[];
  /** One-run Generation Type override. */
  generationType?: string;
}

/** Result of a single consolidate merge call. */
export interface ConsolidateMergeResult {
  anchorId: number;
  sourceIds: number[];
  mergedContent: string;
}

export interface RefinePassLog {
  pass: number;
  changeRatio: number;
  content: string;
}

export interface RefineRunResult {
  itemId: number;
  passes: RefinePassLog[];
  content: string;
  record: BUIOutlineItemEntity;
}

export interface AppliedRefinementSummary {
  inserted: number;
  mergedGroups: number;
  deleted: number;
  renumbered: number;
  referencesRemapped: number;
}

const REFINE_CONVERGENCE_THRESHOLD = 0.05;
const REFINE_MAX_PASSES = 3;
const REFINE_DEFAULT_PASSES = 2;

function countWords(content: string): number {
  return content.split(/\s+/).filter(Boolean).length;
}

function clampPasses(passes: number | undefined): number {
  const value = Number.isFinite(passes ?? NaN)
    ? Number(passes)
    : REFINE_DEFAULT_PASSES;
  return Math.min(REFINE_MAX_PASSES, Math.max(1, Math.round(value)));
}

/** Fraction of characters changed between two markdown drafts. */
function changeRatio(prev: string, next: string): number {
  if (!prev && !next) return 0;
  if (!prev || !next) return 1;
  const changes = diffWords(prev, next);
  const changed = changes
    .filter((part) => part.added || part.removed)
    .reduce((sum, part) => sum + part.value.length, 0);
  const total = Math.max(prev.length, next.length) || 1;
  return changed / total;
}

/** Parses a critique JSON payload into validated, typed findings. */
function parseRefinementFindings(raw: string): BUIOutlineRefinementFinding[] {
  const parsed = extractJsonObject(raw);
  const list = Array.isArray(parsed.findings)
    ? (parsed.findings as Record<string, unknown>[])
    : [];

  const out: BUIOutlineRefinementFinding[] = [];

  list.forEach((entry, index) => {
    if (!entry || typeof entry !== "object") return;
    const id = String(entry.id ?? `f${index + 1}`);
    const type = String(entry.type ?? "");
    const rationale =
      entry.rationale != null ? String(entry.rationale) : undefined;

    if (type === "insert") {
      const title = String(entry.title ?? "").trim();
      if (!title) return;
      out.push({
        id,
        type: "insert",
        title,
        description:
          entry.description != null ? String(entry.description) : undefined,
        rationale,
      });
      return;
    }

    if (type === "merge") {
      const anchorId = Number(entry.anchorId);
      const sourceIds = Array.isArray(entry.sourceIds)
        ? entry.sourceIds.map((value) => Number(value)).filter(Number.isFinite)
        : [];
      if (!Number.isFinite(anchorId) || sourceIds.length === 0) return;
      out.push({ id, type: "merge", anchorId, sourceIds, rationale });
      return;
    }

    if (type === "reorder") {
      const order = Array.isArray(entry.order)
        ? entry.order.map((value) => Number(value)).filter(Number.isFinite)
        : [];
      if (order.length === 0) return;
      out.push({ id, type: "reorder", order, rationale });
      return;
    }

    if (type === "refine") {
      const itemId = Number(entry.itemId);
      const directive = String(entry.directive ?? "").trim();
      if (!Number.isFinite(itemId) || !directive) return;
      out.push({ id, type: "refine", itemId, directive, rationale });
    }
  });

  return out;
}

/** Loads outline + items + topic/author/skills for a refinement call. */
async function resolveRefinementContext(
  outlineId: number,
  options: RefinementRunOptions,
) {
  const outlineRepo = new BUIOutlineRepository();
  const chapterRepo = new BUIOutlineChapterRepository();
  const topicRepo = new BUITopicRepository();

  const outline = (await outlineRepo.panelGetOne(
    outlineId,
  )) as BUIOutlineEntity;
  if (!outline) throw new Error(`Outline ${outlineId} could not be found.`);

  const all = await chapterRepo.getItemsByOutline(outlineId);

  const topic =
    options.includeTopic === false
      ? undefined
      : await resolveTopic(topicRepo, outline.topicId);

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

  return {
    outline,
    all,
    topic,
    author,
    skills: skills.length > 0 ? skills : undefined,
  };
}

/** Persists the refinement plan (and its approval state) on the outline. */
export async function persistRefinementPlanAction(
  outlineId: number,
  plan: BUIOutlineRefinementPlan,
) {
  const outlineRepo = new BUIOutlineRepository();
  const outline = (await outlineRepo.panelGetOne(
    outlineId,
  )) as BUIOutlineEntity;

  await outlineRepo.panelUpdate(outlineId, {
    ...outline,
    kind: "outline",
    refinementPlan: plan,
    refinementPlanUpdatedAt: Date.now(),
  });
}

/**
 * Runs `critique` over the scope and persists a structured, actionable plan.
 * The findings are returned raw + approved by default; the wizard edits approvals.
 */
export async function runCritiquePlanAction(
  outlineId: number,
  scopeIds: number[] | undefined,
  aiConfig?: HelixAIOption,
  options: RefinementRunOptions = {},
): Promise<{ plan: BUIOutlineRefinementPlan }> {
  const { outline, all, topic, author, skills } =
    await resolveRefinementContext(outlineId, options);

  const scoped =
    scopeIds && scopeIds.length > 0
      ? all.filter((item) => item.id != null && scopeIds.includes(item.id))
      : all;

  const params: BUIOutlineParams = {
    outline,
    topic,
    items: scoped.map((item) => ({
      id: item.id,
      number: item.number,
      title: item.title,
      description: item.description || "",
      content: item.content || "",
    })),
    author,
    skills,
  };

  const raw = await requestItemContent(
    params,
    options.generationType || outline.generationType || "guide",
    "critique",
    aiConfig,
  );

  const findings = parseRefinementFindings(raw);
  const plan: BUIOutlineRefinementPlan = {
    scope: scoped
      .map((item) => item.id)
      .filter((id): id is number => id != null),
    findings,
    approvedIds: findings.map((finding) => finding.id),
    refinePasses: REFINE_DEFAULT_PASSES,
    generatedAt: Date.now(),
  };

  await persistRefinementPlanAction(outlineId, plan);
  return { plan };
}

/** Runs `consolidate` for one approved merge group and returns its merged content. */
export async function runConsolidateMergeAction(
  outlineId: number,
  group: { anchorId: number; sourceIds: number[] },
  aiConfig?: HelixAIOption,
  options: RefinementRunOptions = {},
): Promise<ConsolidateMergeResult> {
  const { outline, all, topic, author, skills } =
    await resolveRefinementContext(outlineId, options);

  const params: BUIOutlineParams = {
    outline,
    topic,
    items: all.map((item) => ({
      id: item.id,
      number: item.number,
      title: item.title,
      description: item.description || "",
      content: item.content || "",
    })),
    author,
    skills,
    mergeGroup: group,
  };

  const raw = await requestItemContent(
    params,
    options.generationType || outline.generationType || "guide",
    "consolidate",
    aiConfig,
  );

  const parsed = extractJsonObject(raw);
  const anchorId = Number(parsed.anchorId);
  const sourceIds = Array.isArray(parsed.sourceIds)
    ? parsed.sourceIds
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value))
    : group.sourceIds;

  return {
    anchorId: Number.isFinite(anchorId) ? anchorId : group.anchorId,
    sourceIds: sourceIds.length > 0 ? sourceIds : group.sourceIds,
    mergedContent: String(parsed.mergedContent ?? "").trim(),
  };
}

/**
 * Runs a bounded `iterative_refine` loop on one item, feeding each pass the
 * artifact + previous refined content + the optional directive. Stops early when
 * the diff change ratio drops below the convergence threshold.
 */
export async function runIterativeRefineAction(
  itemId: number,
  directive: string | undefined,
  passes: number | undefined,
  aiConfig?: HelixAIOption,
  options: RefinementRunOptions = {},
): Promise<RefineRunResult> {
  const chapterRepo = new BUIOutlineChapterRepository();
  const item = await chapterRepo.panelGetOne(itemId);

  if (!item || !item.bookId) {
    throw new Error(
      `Item ${itemId} or its Outline relationship does not exist.`,
    );
  }

  const { outline, all, topic, author, skills } =
    await resolveRefinementContext(item.bookId, options);

  const maxPasses = clampPasses(passes);
  let content = item.content || "";
  const log: RefinePassLog[] = [];

  for (let pass = 1; pass <= maxPasses; pass += 1) {
    const params: BUIOutlineParams = {
      outline,
      topic,
      items: all.map((entry) => ({
        id: entry.id,
        number: entry.number,
        title: entry.title,
        description: entry.description || "",
      })),
      currentItem: { ...item, content },
      refineDirective: directive,
      author,
      skills,
    };

    const next = await requestItemContent(
      params,
      options.generationType || outline.generationType || "guide",
      "iterative_refine",
      aiConfig,
    );

    const ratio = changeRatio(content, next);
    log.push({ pass, changeRatio: ratio, content: next });
    content = next;

    if (ratio < REFINE_CONVERGENCE_THRESHOLD) break;
  }

  const finalRecord: BUIOutlineItemEntity = {
    ...item,
    content,
    wordCount: countWords(content),
    status: "done",
  };
  await chapterRepo.panelUpdate(itemId, finalRecord);

  return { itemId, passes: log, content, record: finalRecord };
}

/**
 * Applies the approved plan transactionally: insertions, merges (content write +
 * row deletes), reorder, contiguous renumber, and reference remap. Precomputed
 * merge content must be supplied per approved `merge` finding id.
 */
export async function applyRefinementPlanAction(
  outlineId: number,
  plan: BUIOutlineRefinementPlan,
  merges: Record<string, ConsolidateMergeResult> = {},
): Promise<AppliedRefinementSummary> {
  const outlineRepo = new BUIOutlineRepository();
  const chapterRepo = new BUIOutlineChapterRepository();

  const outline = (await outlineRepo.panelGetOne(
    outlineId,
  )) as BUIOutlineEntity;
  if (!outline) throw new Error(`Outline ${outlineId} could not be found.`);

  const approved = plan.findings.filter((finding) =>
    plan.approvedIds.includes(finding.id),
  );

  const summary: AppliedRefinementSummary = {
    inserted: 0,
    mergedGroups: 0,
    deleted: 0,
    renumbered: 0,
    referencesRemapped: 0,
  };

  await buiDatabase.transaction(
    "rw",
    buiDatabase.books,
    buiDatabase.chapters,
    async () => {
      // 1. Insertions → new pending rows appended at the end.
      const initialRows = await chapterRepo.getItemsByOutline(outlineId);
      let maxNumber = initialRows.reduce(
        (max, row) => Math.max(max, row.number),
        0,
      );

      for (const finding of approved) {
        if (finding.type !== "insert") continue;
        maxNumber += 1;
        await chapterRepo.panelCreate({
          bookId: outlineId,
          number: maxNumber,
          title: finding.title,
          description: finding.description || "",
          content: "",
          wordCount: 0,
          status: "pending",
        });
        summary.inserted += 1;
      }

      // 2. Merges → write merged content to the anchor, delete absorbed rows.
      const deletedIds = new Set<number>();
      let rows = await chapterRepo.getItemsByOutline(outlineId);

      for (const finding of approved) {
        if (finding.type !== "merge") continue;
        const merge = merges[finding.id];
        if (!merge || !merge.mergedContent.trim()) continue;

        const anchor =
          rows.find((row) => row.id === merge.anchorId) ??
          rows.find((row) => row.id === finding.anchorId);
        if (!anchor || anchor.id == null) continue;

        await chapterRepo.panelUpdate(anchor.id, {
          ...anchor,
          content: merge.mergedContent,
          wordCount: countWords(merge.mergedContent),
          status: "done",
        });
        summary.mergedGroups += 1;

        const absorbed = merge.sourceIds.filter((id) => id !== anchor.id);
        for (const sourceId of absorbed) {
          const source = rows.find((row) => row.id === sourceId);
          if (!source || source.id == null) continue;
          await chapterRepo.panelDelete(source.id);
          deletedIds.add(source.id);
          summary.deleted += 1;
        }
      }

      // 3. Reorder → requested ids first, remaining keep relative order.
      let order = (await chapterRepo.getItemsByOutline(outlineId))
        .map((row) => row.id)
        .filter((id): id is number => id != null);

      const reorder = approved.find((finding) => finding.type === "reorder");
      if (reorder && reorder.type === "reorder") {
        const requested = reorder.order.filter((id) => order.includes(id));
        const remainder = order.filter((id) => !requested.includes(id));
        order = [...requested, ...remainder];
      }

      // 4. Renumber contiguous ascending by final order.
      rows = await chapterRepo.getItemsByOutline(outlineId);
      for (let index = 0; index < order.length; index += 1) {
        const row = rows.find((entry) => entry.id === order[index]);
        if (!row || row.id == null) continue;
        const targetNumber = index + 1;
        if (row.number !== targetNumber) {
          await chapterRepo.panelUpdate(row.id, { ...row, number: targetNumber });
          summary.renumbered += 1;
        }
      }

      // 5. Remap references → drop ids of deleted rows.
      if (deletedIds.size > 0) {
        rows = await chapterRepo.getItemsByOutline(outlineId);
        for (const row of rows) {
          if (row.id == null) continue;
          if (!Array.isArray(row.referenceIds) || row.referenceIds.length === 0) {
            continue;
          }
          const next = row.referenceIds.filter((id) => !deletedIds.has(id));
          if (next.length !== row.referenceIds.length) {
            await chapterRepo.panelUpdate(row.id, { ...row, referenceIds: next });
            summary.referencesRemapped += 1;
          }
        }
      }

      // 6. Record the apply on the persisted plan.
      const nextPlan: BUIOutlineRefinementPlan = {
        ...plan,
        appliedAt: Date.now(),
      };
      await outlineRepo.panelUpdate(outlineId, {
        ...outline,
        kind: "outline",
        refinementPlan: nextPlan,
        refinementPlanUpdatedAt: Date.now(),
      });
    },
  );

  return summary;
}
