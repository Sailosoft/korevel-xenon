// BDSpec.Types.ts — Spec Design form shapes, factories, and
// section helpers.

import type {
  BDSpecDocMode,
  BDSpecGroup,
  BDSpecRecord,
  BDSpecSection,
  BDSpecStatus,
  BDSpecType,
} from "./BDSpec.Domain";
import type { BDDocFormat } from "../core/BDShared.Types";

export type { BDSpecDocMode };

export interface BDSpecGroupForm {
  name: string;
  description: string;
}

export const BD_SPEC_GROUP_EMPTY: BDSpecGroupForm = {
  name: "",
  description: "",
};

export function toSpecGroupForm(
  group: BDSpecGroup,
): BDSpecGroupForm {
  return { name: group.name, description: group.description ?? "" };
}

export interface BDSpecForm {
  name: string;
  slug: string;
  type: BDSpecType;
  status: BDSpecStatus;
  summary: string;
  docMode: BDSpecDocMode;
}

export const BD_SPEC_DOC_MODE_OPTIONS: {
  label: string;
  value: BDSpecDocMode;
  hint: string;
}[] = [
  {
    label: "Single content",
    value: "single",
    hint: "One free-form body.",
  },
  {
    label: "Sectionized document",
    value: "sectioned",
    hint: "Ordered titled sections.",
  },
];

/** The document mode a record uses, inferring for legacy rows without one. */
export function inferDocMode(record: {
  docMode?: BDSpecDocMode;
  sections?: unknown[];
}): BDSpecDocMode {
  if (record.docMode) return record.docMode;
  return record.sections && record.sections.length > 0
    ? "sectioned"
    : "single";
}

export const BD_SPEC_TYPE_OPTIONS: {
  label: string;
  value: BDSpecType;
}[] = [
  "architecture",
  "plan",
  "adr",
  "rfc",
  "design",
  "spec",
  "roadmap",
  "runbook",
  "postmortem",
  "readme",
  "changelog",
  "guide",
  "proposal",
].map((value) => ({ label: value, value: value as BDSpecType }));

export const BD_SPEC_STATUS_OPTIONS: {
  label: string;
  value: BDSpecStatus;
}[] = [
  "draft",
  "review",
  "proposed",
  "accepted",
  "rejected",
  "superseded",
  "deprecated",
  "inProgress",
  "completed",
  "archived",
].map((value) => ({ label: value, value: value as BDSpecStatus }));

export const BD_SPEC_FORMAT_OPTIONS: {
  label: string;
  value: BDDocFormat;
}[] = (["markdown", "mdx", "asciidoc"] as BDDocFormat[]).map(
  (value) => ({ label: value, value }),
);

export function slugify(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .toLowerCase()
    .replace(/^-+|-+$/g, "");
}

const EMPTY_FORM: BDSpecForm = {
  name: "",
  slug: "",
  type: "architecture",
  status: "draft",
  summary: "",
  docMode: "sectioned",
};

export const BD_SPEC_EMPTY_FORM = EMPTY_FORM;

export function createSpec(
  projectId: string,
  form: BDSpecForm,
  groupId?: string,
): Omit<BDSpecRecord, "id"> {
  const now = new Date().toISOString();
  return {
    projectId,
    groupId,
    docMode: form.docMode,
    name: form.name,
    slug: form.slug || slugify(form.name),
    type: form.type,
    status: form.status,
    format: "markdown",
    summary: form.summary || undefined,
    content: "",
    sections: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function toSpecForm(
  record: BDSpecRecord,
): BDSpecForm {
  return {
    name: record.name,
    slug: record.slug,
    type: record.type,
    status: record.status,
    summary: record.summary ?? "",
    docMode: inferDocMode(record),
  };
}

export function createSection(
  title = "New section",
  level: BDSpecSection["level"] = 2,
  position = 0,
  summary?: string,
): BDSpecSection {
  return {
    id: crypto.randomUUID(),
    title,
    level,
    anchor: slugify(title),
    summary: summary || undefined,
    content: "",
    position,
  };
}

export function sectionMarkdown(section: BDSpecSection, depth = 0): string {
  const hashes = "#".repeat(Math.min(section.level + depth, 6));
  const lines = [`${hashes} ${section.title}`];
  if (section.summary) lines.push("", `_${section.summary}_`);
  if (section.content) lines.push("", section.content);
  for (const child of section.children ?? []) {
    lines.push("", sectionMarkdown(child, 1));
  }
  return lines.join("\n");
}

// ── AI artifact drafts ─────────────────────────────────────────────────────

export interface BDSpecSectionDraft {
  title: string;
  level?: number;
  /** Optional one-line TL;DR for the section. */
  summary?: string;
  content?: string;
}

export interface BDSpecDraft {
  name: string;
  type?: string;
  status?: string;
  summary?: string;
  variantLabel?: string;
  /** Full markdown body for single-content documents. */
  content?: string;
  sections?: BDSpecSectionDraft[];
}

export interface BDSpecArtifact {
  specs: BDSpecDraft[];
}

// ── Document preview ───────────────────────────────────────────────────────

export interface BDSpecPreviewInput {
  name: string;
  summary?: string;
  content?: string;
  sections?: {
    title: string;
    level?: number;
    summary?: string;
    content?: string;
  }[];
}

/** Render a document (record or draft) to markdown for preview. */
export function specDraftToMarkdown(input: BDSpecPreviewInput): string {
  const lines: string[] = [`# ${input.name || "Untitled document"}`];
  if (input.summary) lines.push("", `_${input.summary}_`);
  if (input.content) lines.push("", input.content);
  for (const section of input.sections ?? []) {
    if (!section.title) continue;
    const hashes = "#".repeat(Math.min(Math.max(section.level ?? 2, 1), 6));
    lines.push("", `${hashes} ${section.title}`);
    if (section.summary) lines.push("", `_${section.summary}_`);
    if (section.content) lines.push("", section.content);
  }
  return lines.join("\n");
}

// ── AI Document Assist refinement ──────────────────────────────────────────

export type BDSpecRefineLevel = "low" | "medium" | "high" | "max";

export interface BDSpecRefineLevelConfig {
  label: string;
  /** Number of Q&A → revise turns. */
  turns: number;
  /** Inclusive question-count range the AI picks from, per turn. */
  minQuestions: number;
  maxQuestions: number;
  hint: string;
}

export const BD_SPEC_REFINE_LEVELS: Record<
  BDSpecRefineLevel,
  BDSpecRefineLevelConfig
> = {
  low: {
    label: "Low",
    turns: 1,
    minQuestions: 1,
    maxQuestions: 3,
    hint: "Quick pass · 1 to 3 questions",
  },
  medium: {
    label: "Medium",
    turns: 1,
    minQuestions: 3,
    maxQuestions: 5,
    hint: "Balanced · 3 to 5 questions",
  },
  high: {
    label: "High",
    turns: 2,
    minQuestions: 1,
    maxQuestions: 5,
    hint: "Thorough · 2 turns of 1 to 5 questions",
  },
  max: {
    label: "Max",
    turns: 3,
    minQuestions: 1,
    maxQuestions: 5,
    hint: "Exhaustive · 3 turns of 1 to 5 questions",
  },
};

export const BD_SPEC_REFINE_LEVEL_ORDER: BDSpecRefineLevel[] = [
  "low",
  "medium",
  "high",
  "max",
];

/** Generic fallback refinement type, always available. */
export const BD_SPEC_REFINEMENT_GENERIC = "Generic refinement";

/** Per-document-type refinement type choices (plus the generic fallback). */
export const BD_SPEC_REFINEMENT_TYPES: Record<BDSpecType, string[]> = {
  architecture: [
    "Clarify boundaries",
    "Add component detail",
    "Sharpen trade-offs",
    "Add risks",
    "Tighten wording",
  ],
  plan: [
    "Clarify milestones",
    "Add sequencing",
    "Call out dependencies",
    "Surface risks",
    "Tighten scope",
  ],
  adr: [
    "Sharpen the decision",
    "Expand alternatives",
    "Strengthen rationale",
    "Add consequences",
    "Tighten wording",
  ],
  rfc: [
    "Clarify motivation",
    "Sharpen the proposal",
    "Add drawbacks",
    "Resolve open questions",
    "Tighten wording",
  ],
  design: [
    "Clarify goals",
    "Fill gaps",
    "Sharpen trade-offs",
    "Add risks",
    "Tighten wording",
  ],
  spec: [
    "Clarify requirements",
    "Add acceptance criteria",
    "Remove ambiguity",
    "Add edge cases",
    "Tighten wording",
  ],
  roadmap: [
    "Clarify phases",
    "Add sequencing",
    "Align to goals",
    "Surface risks",
    "Tighten scope",
  ],
  runbook: [
    "Clarify steps",
    "Add validation",
    "Add rollback",
    "Remove ambiguity",
    "Tighten wording",
  ],
  postmortem: [
    "Sharpen root cause",
    "Expand timeline",
    "Strengthen action items",
    "Remove blame",
    "Tighten wording",
  ],
  readme: [
    "Clarify purpose",
    "Add quickstart",
    "Improve structure",
    "Add examples",
    "Tighten wording",
  ],
  changelog: [
    "Clarify entries",
    "Group changes",
    "Call out breaking changes",
    "Tighten wording",
  ],
  guide: [
    "Clarify steps",
    "Add examples",
    "Improve structure",
    "Remove ambiguity",
    "Tighten wording",
  ],
  proposal: [
    "Clarify problem",
    "Sharpen proposal",
    "Add alternatives",
    "Surface risks",
    "Tighten wording",
  ],
};

/** Refinement types for a document type (never includes the generic option). */
export function specRefinementTypes(type: BDSpecType): string[] {
  return BD_SPEC_REFINEMENT_TYPES[type] ?? [];
}

export interface BDSpecRefineOption {
  label: string;
  description?: string;
  recommended: boolean;
}

export interface BDSpecRefineQuestion {
  id: string;
  question: string;
  rationale?: string;
  /** Exactly four options; the recommended one is first. */
  options: BDSpecRefineOption[];
}

export interface BDSpecRefineAnswer {
  question: string;
  answer: string;
}

/** Which AI Document Assist mode the wizard is running. */
export type BDSpecAssistMode = "refine" | "enhance";

/** One improvement area found by the Enhance analysis. */
export interface BDSpecEnhancementArea {
  id: string;
  label: string;
  rationale?: string;
  recommended: boolean;
}

/** Document assessment produced before the Enhance question turns. */
export interface BDSpecEnhancementAnalysis {
  summary: string;
  areas: BDSpecEnhancementArea[];
}

/** Labels the user should start with selected, i.e. the recommended areas. */
export function recommendedEnhancementAreas(
  analysis: BDSpecEnhancementAnalysis,
): string[] {
  return analysis.areas.filter((area) => area.recommended).map((a) => a.label);
}

/** The revised document produced by a refine revision call. */
export interface BDSpecRefineRevision {
  name?: string;
  summary?: string;
  content?: string;
  sections?: BDSpecSectionDraft[];
}
