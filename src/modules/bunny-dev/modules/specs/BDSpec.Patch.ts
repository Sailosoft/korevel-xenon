// BDSpec.Patch.ts — explicit document patch operations for the Specs AI
// assistants. Client-safe: no server-only imports.
//
// The AI returns operations against an existing document instead of a rewritten
// whole document. `applySpecPatches` hot-swaps only the referenced sections or
// content regions and preserves the identity of everything it does not touch.

import type {
  BDSpecDocMode,
  BDSpecRecord,
  BDSpecSection,
} from "../../BDDomain.Types";
import { applyTextPatches } from "../core/BDTextPatch";
import { createSection, inferDocMode, slugify } from "./BDSpec.Types";

/** Character budget for a Specs target document in patch prompts. */
export const BD_SPEC_PATCH_MAX_CHARS = 60000;

/**
 * Serialize a target document for patch prompts. Compact JSON fits noticeably
 * more of a long document under the prompt budget than pretty-printed JSON.
 */
export function serializeSpecTarget(
  record: unknown,
  maxChars = BD_SPEC_PATCH_MAX_CHARS,
): string {
  let json: string;
  try {
    json = JSON.stringify(record) ?? "null";
  } catch {
    json = String(record);
  }
  if (json.length <= maxChars) return json;
  return `${json.slice(0, maxChars)}\n…(truncated)`;
}

export interface BDSpecPatchSection {
  /** Existing section id (or anchor/title fallback) when reusing identity. */
  sectionId?: string;
  title: string;
  level?: number;
  summary?: string;
  content: string;
}

export type BDSpecPatchOp =
  | {
      op: "setMeta";
      name?: string;
      summary?: string;
      status?: string;
      type?: string;
    }
  | {
      op: "updateSection";
      /** Section id, anchor, or exact title of the section to update. */
      sectionId: string;
      /** New title; omit or repeat the current title to keep it. */
      title?: string;
      level?: number;
      summary?: string;
      /** Omit to keep the current body; an empty string clears it. */
      content?: string;
    }
  | {
      op: "insertSection";
      /** Insert after this section id/anchor/title; empty appends. */
      afterSectionId?: string;
      title: string;
      level?: number;
      summary?: string;
      content: string;
    }
  | {
      op: "deleteSection";
      sectionId: string;
    }
  | {
      op: "replaceSections";
      sections: BDSpecPatchSection[];
    }
  | {
      op: "replaceContent";
      patternStart: string;
      patternEnd: string;
      content: string;
    };

/** The document shape patch operations can be applied to. */
export interface BDSpecPatchable {
  name: string;
  summary?: string;
  status?: string;
  type?: string;
  content?: string;
  docMode?: BDSpecDocMode;
  sections: BDSpecSection[];
}

export interface BDSpecPatchSummary {
  operations: number;
  addedSections: number;
  updatedSections: number;
  deletedSections: number;
  replacedSections: number;
  metaChanged: boolean;
  contentChanged: boolean;
}

export class BDSpecPatchError extends Error {
  constructor(
    public readonly opIndex: number,
    public readonly op: string,
    message: string,
  ) {
    super(message);
    this.name = "BDSpecPatchError";
  }
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

const PATCH_OP_NAMES: Record<string, BDSpecPatchOp["op"]> = {
  setmeta: "setMeta",
  updatesection: "updateSection",
  insertsection: "insertSection",
  deletesection: "deleteSection",
  replacesections: "replaceSections",
  replacecontent: "replaceContent",
};

/** Accept camelCase, snake_case, kebab-case, and case variants from the model. */
function normalizeOpName(value: unknown): BDSpecPatchOp["op"] | null {
  const key = asString(value)
    .trim()
    .replace(/[_\s-]+/g, "")
    .toLowerCase();
  return PATCH_OP_NAMES[key] ?? null;
}

function normalizeLevel(
  value: number | undefined,
  fallback: BDSpecSection["level"],
): BDSpecSection["level"] {
  if (value === undefined) return fallback;
  const level = Math.floor(value);
  if (level < 1 || level > 6) return fallback;
  return level as BDSpecSection["level"];
}

function normalizeTitle(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Resolve a section reference against the current sections. Prefers the exact
 * id, then the anchor, then a case/whitespace-insensitive title match. Throws
 * when a title is ambiguous so we never guess and silently edit the wrong one.
 */
function resolveSectionIndex(
  sections: BDSpecSection[],
  reference: string,
): number {
  if (!reference) return -1;

  const byId = sections.findIndex((section) => section.id === reference);
  if (byId !== -1) return byId;

  const anchor = slugify(reference);
  const byAnchor = sections.findIndex(
    (section) => section.anchor === reference || section.anchor === anchor,
  );
  if (byAnchor !== -1) return byAnchor;

  const wanted = normalizeTitle(reference);
  const matches: number[] = [];
  sections.forEach((section, index) => {
    if (normalizeTitle(section.title) === wanted) matches.push(index);
  });
  if (matches.length > 1) {
    throw new Error(
      `Section reference "${reference}" is ambiguous; use the exact section id.`,
    );
  }
  return matches[0] ?? -1;
}

function reindexSections(sections: BDSpecSection[]): BDSpecSection[] {
  return sections.map((section, index) =>
    section.position === index ? section : { ...section, position: index },
  );
}

function normalizePatchSection(raw: unknown): BDSpecPatchSection | null {
  if (!raw || typeof raw !== "object") return null;
  const entry = raw as Record<string, unknown>;
  const title = asString(entry.title).trim();
  if (!title) return null;
  return {
    sectionId: asString(entry.sectionId).trim() || undefined,
    title,
    level: asNumber(entry.level),
    summary: asString(entry.summary),
    content: asString(entry.content),
  };
}

/**
 * Flatten the strict JSON output from the AI into typed patch operations.
 * Unknown/malformed operations are dropped; every field is present in the
 * schema, so empty values mean "unused" (except section `content`, where an
 * empty string explicitly clears the body).
 */
export function normalizeSpecPatches(raw: unknown): BDSpecPatchOp[] {
  const list =
    raw && typeof raw === "object" && Array.isArray((raw as { patches?: unknown }).patches)
      ? ((raw as { patches: unknown[] }).patches)
      : [];

  const patches: BDSpecPatchOp[] = [];
  for (const entry of list) {
    if (!entry || typeof entry !== "object") continue;
    const value = entry as Record<string, unknown>;
    const op = normalizeOpName(value.op);
    if (!op) continue;

    if (op === "setMeta") {
      const name = asString(value.name).trim();
      const summary = asString(value.docSummary);
      const status = asString(value.status).trim();
      const type = asString(value.docType).trim();
      if (!name && !summary && !status && !type) continue;
      patches.push({
        op,
        name: name || undefined,
        summary: summary.trim() ? summary : undefined,
        status: status || undefined,
        type: type || undefined,
      });
      continue;
    }

    if (op === "updateSection") {
      const sectionId =
        asString(value.sectionId).trim() || asString(value.title).trim();
      if (!sectionId) continue;
      patches.push({
        op,
        sectionId,
        title: asString(value.title).trim() || undefined,
        level: asNumber(value.level),
        summary:
          typeof value.summary === "string" ? value.summary : undefined,
        content:
          typeof value.content === "string" ? value.content : undefined,
      });
      continue;
    }

    if (op === "insertSection") {
      const title = asString(value.title).trim();
      if (!title) continue;
      patches.push({
        op,
        afterSectionId: asString(value.afterSectionId).trim() || undefined,
        title,
        level: asNumber(value.level),
        summary: asString(value.summary),
        content: asString(value.content),
      });
      continue;
    }

    if (op === "deleteSection") {
      const sectionId =
        asString(value.sectionId).trim() || asString(value.title).trim();
      if (!sectionId) continue;
      patches.push({ op, sectionId });
      continue;
    }

    if (op === "replaceSections") {
      if (!Array.isArray(value.sections)) continue;
      const rawSections = value.sections;
      const sections = rawSections
        .map(normalizePatchSection)
        .filter((section): section is BDSpecPatchSection => section !== null);
      // A non-empty raw list that lost every entry is malformed output; do not
      // treat it as an intentional "clear all sections".
      if (rawSections.length > 0 && sections.length === 0) continue;
      patches.push({ op, sections });
      continue;
    }

    if (op === "replaceContent") {
      const patternStart = asString(value.patternStart);
      if (!patternStart.trim()) continue;
      patches.push({
        op,
        patternStart,
        patternEnd: asString(value.patternEnd),
        content: asString(value.content),
      });
    }
  }

  return patches;
}

function emptySummary(summary: string | undefined): string | undefined {
  return summary && summary.trim() ? summary : undefined;
}

/**
 * Apply every patch operation to a copy of `base`. All-or-nothing: any failed
 * operation throws `BDSpecPatchError` and the caller should discard the partial
 * result (the returned record is only produced after the full loop succeeds).
 */
export function applySpecPatches<T extends BDSpecPatchable>(
  base: T,
  patches: BDSpecPatchOp[],
): { record: T; summary: BDSpecPatchSummary } {
  const docMode = inferDocMode(base);
  const record: T = {
    ...base,
    sections: base.sections.map((section) => ({ ...section })),
  };

  const summary: BDSpecPatchSummary = {
    operations: patches.length,
    addedSections: 0,
    updatedSections: 0,
    deletedSections: 0,
    replacedSections: 0,
    metaChanged: false,
    contentChanged: false,
  };

  patches.forEach((patch, index) => {
    try {
      if (patch.op === "setMeta") {
        let changed = false;
        if (patch.name) {
          record.name = patch.name;
          changed = true;
        }
        if (patch.summary !== undefined) {
          record.summary = emptySummary(patch.summary);
          changed = true;
        }
        if (patch.status) {
          record.status = patch.status;
          changed = true;
        }
        if (patch.type) {
          record.type = patch.type;
          changed = true;
        }
        summary.metaChanged ||= changed;
        return;
      }

      if (docMode === "single" && patch.op !== "replaceContent") {
        throw new Error(
          "Section operations are only valid for sectioned documents.",
        );
      }
      if (docMode === "sectioned" && patch.op === "replaceContent") {
        throw new Error(
          "Content replacement is only valid for single-content documents.",
        );
      }

      if (patch.op === "updateSection") {
        const target = resolveSectionIndex(record.sections, patch.sectionId);
        if (target === -1) {
          throw new Error(`Section "${patch.sectionId}" was not found.`);
        }
        const existing = record.sections[target];
        const nextTitle = patch.title?.trim() || existing.title;
        const nextLevel = normalizeLevel(patch.level, existing.level);
        const nextAnchor =
          nextTitle === existing.title
            ? existing.anchor
            : slugify(nextTitle);
        record.sections[target] = {
          ...existing,
          title: nextTitle,
          level: nextLevel,
          anchor: nextAnchor,
          summary:
            patch.summary === undefined
              ? existing.summary
              : emptySummary(patch.summary),
          content:
            typeof patch.content === "string"
              ? patch.content
              : existing.content,
        };
        summary.updatedSections += 1;
        return;
      }

      if (patch.op === "insertSection") {
        const title = patch.title.trim();
        if (!title) throw new Error("An inserted section needs a title.");
        let insertAt = record.sections.length;
        if (patch.afterSectionId) {
          const after = resolveSectionIndex(
            record.sections,
            patch.afterSectionId,
          );
          if (after === -1) {
            throw new Error(
              `Insert anchor "${patch.afterSectionId}" was not found.`,
            );
          }
          insertAt = after + 1;
        }
        const section: BDSpecSection = {
          ...createSection(
            title,
            normalizeLevel(patch.level, 2),
            insertAt,
            emptySummary(patch.summary),
          ),
          content: patch.content,
        };
        record.sections.splice(insertAt, 0, section);
        record.sections = reindexSections(record.sections);
        summary.addedSections += 1;
        return;
      }

      if (patch.op === "deleteSection") {
        const target = resolveSectionIndex(record.sections, patch.sectionId);
        if (target === -1) {
          throw new Error(`Section "${patch.sectionId}" was not found.`);
        }
        record.sections.splice(target, 1);
        record.sections = reindexSections(record.sections);
        summary.deletedSections += 1;
        return;
      }

      if (patch.op === "replaceSections") {
        const existing = record.sections;
        const used = new Set<number>();
        const nextSections: BDSpecSection[] = patch.sections.map(
          (incoming, position) => {
            let match = -1;
            if (incoming.sectionId) {
              const byId = existing.findIndex(
                (section, existingIndex) =>
                  !used.has(existingIndex) &&
                  section.id === incoming.sectionId,
              );
              match =
                byId !== -1
                  ? byId
                  : existing.findIndex(
                      (section, existingIndex) =>
                        !used.has(existingIndex) &&
                        (section.anchor === incoming.sectionId ||
                          normalizeTitle(section.title) ===
                            normalizeTitle(incoming.sectionId ?? "")),
                    );
            } else {
              match = existing.findIndex(
                (section, existingIndex) =>
                  !used.has(existingIndex) &&
                  normalizeTitle(section.title) ===
                    normalizeTitle(incoming.title),
              );
            }

            const summaryValue = emptySummary(incoming.summary);
            if (match === -1) {
              summary.addedSections += 1;
              return {
                ...createSection(
                  incoming.title,
                  normalizeLevel(incoming.level, 2),
                  position,
                  summaryValue,
                ),
                content: incoming.content,
              };
            }

            used.add(match);
            const previous = existing[match];
            summary.updatedSections += 1;
            return {
              ...previous,
              title: incoming.title,
              level: normalizeLevel(incoming.level, previous.level),
              anchor:
                incoming.title === previous.title
                  ? previous.anchor
                  : slugify(incoming.title),
              summary: summaryValue,
              content: incoming.content,
              position,
            };
          },
        );

        summary.replacedSections += patch.sections.length;
        summary.deletedSections += existing.length - used.size;
        record.sections = reindexSections(nextSections);
        return;
      }

      if (patch.op === "replaceContent") {
        const result = applyTextPatches(record.content ?? "", [
          {
            patternToReplaceStart: patch.patternStart,
            patternToReplaceEnd: patch.patternEnd,
            contentReplace: patch.content,
          },
        ]);
        record.content = result.content;
        summary.contentChanged = true;
      }
    } catch (error) {
      if (error instanceof BDSpecPatchError) throw error;
      throw new BDSpecPatchError(
        index,
        patch.op,
        `Patch #${index + 1} (${patch.op}): ${
          error instanceof Error ? error.message : "could not be applied."
        }`,
      );
    }
  });

  record.sections = reindexSections(record.sections);
  return { record, summary };
}

/** Human-readable one-liner used by the review UI and toasts. */
export function describeSpecPatch(
  patch: BDSpecPatchOp,
  index: number,
): string {
  const prefix = `#${index + 1}`;
  switch (patch.op) {
    case "setMeta":
      return `${prefix} Updated document metadata`;
    case "updateSection":
      return `${prefix} Updated section “${patch.title ?? patch.sectionId}”`;
    case "insertSection":
      return `${prefix} Added section “${patch.title}”`;
    case "deleteSection":
      return `${prefix} Removed section “${patch.sectionId}”`;
    case "replaceSections":
      return `${prefix} Replaced document sections (${patch.sections.length})`;
    case "replaceContent":
      return `${prefix} Updated document content`;
  }
}

/** Section count guard used by prompts and diagnostics. */
export function isSectionedDocument(
  document: Pick<BDSpecPatchable, "docMode" | "sections">,
): boolean {
  return inferDocMode(document) === "sectioned";
}

/** Convenience type for callers that only need the prompt-visible record. */
export type BDSpecPatchTarget = Pick<
  BDSpecRecord,
  "name" | "summary" | "status" | "type" | "content" | "docMode" | "sections"
>;
