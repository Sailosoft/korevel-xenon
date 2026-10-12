// BDSpec.Types.ts — Spec Design form shapes, factories, and
// section helpers.

import type {
  BDSpecGroup,
  BDSpecRecord,
  BDSpecSection,
  BDSpecStatus,
  BDSpecType,
} from "./BDSpec.Domain";
import type { BDDocFormat } from "../core/BDShared.Types";

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
  sections?: BDSpecSectionDraft[];
}

export interface BDSpecArtifact {
  specs: BDSpecDraft[];
}
