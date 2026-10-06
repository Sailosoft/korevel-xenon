// BDArchitecture.Types.ts — Architecture Design form shapes, factories, and
// section helpers.

import type {
  BDArchitectureGroup,
  BDArchitectureRecord,
  BDArchitectureSection,
  BDArchitectureStatus,
  BDArchitectureType,
} from "./BDArchitecture.Domain";
import type { BDArchitectureFormat } from "../core/BDShared.Types";

export interface BDArchitectureGroupForm {
  name: string;
  description: string;
}

export const BD_ARCHITECTURE_GROUP_EMPTY: BDArchitectureGroupForm = {
  name: "",
  description: "",
};

export function toArchitectureGroupForm(
  group: BDArchitectureGroup,
): BDArchitectureGroupForm {
  return { name: group.name, description: group.description ?? "" };
}

export interface BDArchitectureForm {
  name: string;
  slug: string;
  type: BDArchitectureType;
  status: BDArchitectureStatus;
  summary: string;
}

export const BD_ARCHITECTURE_TYPE_OPTIONS: {
  label: string;
  value: BDArchitectureType;
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
].map((value) => ({ label: value, value: value as BDArchitectureType }));

export const BD_ARCHITECTURE_STATUS_OPTIONS: {
  label: string;
  value: BDArchitectureStatus;
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
].map((value) => ({ label: value, value: value as BDArchitectureStatus }));

export const BD_ARCHITECTURE_FORMAT_OPTIONS: {
  label: string;
  value: BDArchitectureFormat;
}[] = (["markdown", "mdx", "asciidoc"] as BDArchitectureFormat[]).map(
  (value) => ({ label: value, value }),
);

export function slugify(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .toLowerCase()
    .replace(/^-+|-+$/g, "");
}

const EMPTY_FORM: BDArchitectureForm = {
  name: "",
  slug: "",
  type: "architecture",
  status: "draft",
  summary: "",
};

export const BD_ARCHITECTURE_EMPTY_FORM = EMPTY_FORM;

export function createArchitecture(
  projectId: string,
  form: BDArchitectureForm,
  groupId?: string,
): Omit<BDArchitectureRecord, "id"> {
  const now = new Date().toISOString();
  return {
    projectId,
    groupId,
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

export function toArchitectureForm(
  record: BDArchitectureRecord,
): BDArchitectureForm {
  return {
    name: record.name,
    slug: record.slug,
    type: record.type,
    status: record.status,
    summary: record.summary ?? "",
  };
}

export function createSection(
  title = "New section",
  level: BDArchitectureSection["level"] = 2,
  position = 0,
  summary?: string,
): BDArchitectureSection {
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

export function sectionMarkdown(section: BDArchitectureSection, depth = 0): string {
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

export interface BDArchitectureSectionDraft {
  title: string;
  level?: number;
  /** Optional one-line TL;DR for the section. */
  summary?: string;
  content?: string;
}

export interface BDArchitectureDraft {
  name: string;
  type?: string;
  status?: string;
  summary?: string;
  variantLabel?: string;
  sections?: BDArchitectureSectionDraft[];
}

export interface BDArchitectureArtifact {
  architectures: BDArchitectureDraft[];
}
