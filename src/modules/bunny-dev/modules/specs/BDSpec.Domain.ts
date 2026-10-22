// BDSpec.Domain.ts — Spec Design domain model (ADR/RFC/plan/
// design/spec/roadmap/runbook/postmortem/changelog variants, sections,
// reviews, links).

import type { BDDocFormat, BDEntity } from "../core/BDShared.Types";

/** A group of spec documents — enables organising documents into sets. */
export interface BDSpecGroup extends BDEntity {
  projectId: string;
  name: string;
  description?: string;
  position: number;
}

export type BDSpecType =
  | "architecture"
  | "plan"
  | "adr"
  | "rfc"
  | "design"
  | "spec"
  | "roadmap"
  | "runbook"
  | "postmortem"
  | "readme"
  | "changelog"
  | "guide"
  | "proposal";

/**
 * How a document's body is authored:
 * - `single` — one free-form content body (`content`); `sections` is unused.
 * - `sectioned` — an ordered list of titled sections (`sections`); `content` is unused.
 */
export type BDSpecDocMode = "single" | "sectioned";

export type BDSpecStatus =
  | "draft"
  | "review"
  | "proposed"
  | "accepted"
  | "rejected"
  | "superseded"
  | "deprecated"
  | "inProgress"
  | "completed"
  | "archived";

export type BDSpecLinkType =
  | "supersedes"
  | "supersededBy"
  | "dependsOn"
  | "relatedTo"
  | "implements"
  | "references"
  | "blocks"
  | "blockedBy";

export interface BDSpecReference {
  id: string;
  title: string;
  url?: string;
  path?: string;
}

export interface BDSpecLink {
  id: string;
  type: BDSpecLinkType;
  targetId: string;
}

export interface BDSpecReview {
  id: string;
  reviewerId: string;
  status: "pending" | "approved" | "changesRequested";
  comment?: string;
  createdAt: string;
}

export interface BDSpecSection {
  id: string;
  title: string;
  level: 1 | 2 | 3 | 4 | 5 | 6;
  anchor: string;
  /** Optional one-line TL;DR shown under the section heading. */
  summary?: string;
  content: string;
  position: number;
  children?: BDSpecSection[];
  diagramIds?: string[];
  modelIds?: string[];
}

export interface BDSpecStep {
  id: string;
  position: number;
  title: string;
  command?: string;
  expected?: string;
}

export interface BDPlanMilestone {
  id: string;
  name: string;
  description?: string;
  dueDate?: string;
  status: BDSpecStatus;
  position: number;
}

export interface BDRisk {
  id: string;
  description: string;
  impact: "low" | "medium" | "high";
  likelihood: "low" | "medium" | "high";
  mitigation?: string;
}

export interface BDChangelogChange {
  id: string;
  kind: "added" | "changed" | "fixed" | "removed" | "deprecated" | "security";
  description: string;
}

export interface BDChangelogEntry {
  id: string;
  version: string;
  date: string;
  changes: BDChangelogChange[];
}

export interface BDSpecBase<T extends BDSpecType> extends BDEntity {
  projectId: string;
  groupId?: string;
  name: string;
  slug: string;
  type: T;
  status: BDSpecStatus;
  format: BDDocFormat;
  summary?: string;
  content?: string;
  sections: BDSpecSection[];
  diagramIds?: string[];
  modelIds?: string[];
  tagIds?: string[];
  authorIds?: string[];
  reviewers?: BDSpecReview[];
  references?: BDSpecReference[];
  links?: BDSpecLink[];
  attachmentIds?: string[];
  version?: string;
  archivedAt?: string;
}

export interface BDSpecAdr extends BDSpecBase<"adr"> {
  number: number;
  context: string;
  decision: string;
  consequences: string;
  alternatives?: string;
  deciderIds?: string[];
  decisionDate?: string;
}

export interface BDSpecRfc extends BDSpecBase<"rfc"> {
  number: number;
  motivation: string;
  proposal: string;
  drawbacks?: string;
  alternatives?: string;
  unresolvedQuestions?: string[];
}

export interface BDSpecPlan extends BDSpecBase<"plan"> {
  goal?: string;
  milestones: BDPlanMilestone[];
  sprintIds?: string[];
  taskIds?: string[];
}

export interface BDSpecDesign extends BDSpecBase<"design"> {
  goals: string[];
  nonGoals?: string[];
  constraints?: string[];
  risks?: BDRisk[];
  openQuestions?: string[];
}

export interface BDSpecDoc extends BDSpecBase<"spec"> {
  requirements: string[];
  acceptanceCriteria?: string[];
  apiRefs?: string[];
}

export interface BDSpecRoadmap extends BDSpecBase<"roadmap"> {
  horizon?: string;
  phases: BDPlanMilestone[];
}

export interface BDSpecRunbook extends BDSpecBase<"runbook"> {
  trigger?: string;
  steps: BDSpecStep[];
  rollback?: BDSpecStep[];
  escalation?: string;
}

export interface BDSpecPostmortem extends BDSpecBase<"postmortem"> {
  incidentDate: string;
  severity: "sev1" | "sev2" | "sev3" | "sev4";
  impact?: string;
  rootCause?: string;
  timeline?: BDSpecStep[];
  actionItems?: string[];
}

export interface BDSpecChangelog extends BDSpecBase<"changelog"> {
  entries: BDChangelogEntry[];
}

export type BDSpec =
  | BDSpecBase<"architecture">
  | BDSpecBase<"readme">
  | BDSpecBase<"guide">
  | BDSpecBase<"proposal">
  | BDSpecAdr
  | BDSpecRfc
  | BDSpecPlan
  | BDSpecDesign
  | BDSpecDoc
  | BDSpecRoadmap
  | BDSpecRunbook
  | BDSpecPostmortem
  | BDSpecChangelog;

/**
 * Storage shape for the single `specs` table.
 *
 * The `BDSpec` union above keeps per-variant type safety in components;
 * this flat record carries every variant's fields as optional so one Dexie
 * table can persist any variant (and `create` accepts object literals).
 */
export interface BDSpecRecord extends BDSpecBase<BDSpecType> {
  /** How the body is authored (single content vs sectionized). */
  docMode?: BDSpecDocMode;
  /** When this record is a variant, the spec it derives from. */
  variantOfId?: string;
  variantLabel?: string;
  number?: number;
  context?: string;
  decision?: string;
  consequences?: string;
  alternatives?: string;
  deciderIds?: string[];
  decisionDate?: string;
  motivation?: string;
  proposal?: string;
  drawbacks?: string;
  unresolvedQuestions?: string[];
  goal?: string;
  milestones?: BDPlanMilestone[];
  sprintIds?: string[];
  taskIds?: string[];
  goals?: string[];
  nonGoals?: string[];
  constraints?: string[];
  risks?: BDRisk[];
  openQuestions?: string[];
  requirements?: string[];
  acceptanceCriteria?: string[];
  apiRefs?: string[];
  horizon?: string;
  phases?: BDPlanMilestone[];
  trigger?: string;
  steps?: BDSpecStep[];
  rollback?: BDSpecStep[];
  escalation?: string;
  incidentDate?: string;
  severity?: "sev1" | "sev2" | "sev3" | "sev4";
  impact?: string;
  rootCause?: string;
  timeline?: BDSpecStep[];
  actionItems?: string[];
  entries?: BDChangelogEntry[];
}
