// BDArchitecture.Domain.ts — Architecture Design domain model (ADR/RFC/plan/
// design/spec/roadmap/runbook/postmortem/changelog variants, sections,
// reviews, links).

import type { BDArchitectureFormat, BDEntity } from "../core/BDShared.Types";

/** A group of architecture documents — enables organising documents into sets. */
export interface BDArchitectureGroup extends BDEntity {
  projectId: string;
  name: string;
  description?: string;
  position: number;
}

export type BDArchitectureType =
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

export type BDArchitectureStatus =
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

export type BDArchitectureLinkType =
  | "supersedes"
  | "supersededBy"
  | "dependsOn"
  | "relatedTo"
  | "implements"
  | "references"
  | "blocks"
  | "blockedBy";

export interface BDArchitectureReference {
  id: string;
  title: string;
  url?: string;
  path?: string;
}

export interface BDArchitectureLink {
  id: string;
  type: BDArchitectureLinkType;
  targetId: string;
}

export interface BDArchitectureReview {
  id: string;
  reviewerId: string;
  status: "pending" | "approved" | "changesRequested";
  comment?: string;
  createdAt: string;
}

export interface BDArchitectureSection {
  id: string;
  title: string;
  level: 1 | 2 | 3 | 4 | 5 | 6;
  anchor: string;
  /** Optional one-line TL;DR shown under the section heading. */
  summary?: string;
  content: string;
  position: number;
  children?: BDArchitectureSection[];
  diagramIds?: string[];
  modelIds?: string[];
}

export interface BDArchitectureStep {
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
  status: BDArchitectureStatus;
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

export interface BDArchitectureBase<T extends BDArchitectureType> extends BDEntity {
  projectId: string;
  groupId?: string;
  name: string;
  slug: string;
  type: T;
  status: BDArchitectureStatus;
  format: BDArchitectureFormat;
  summary?: string;
  content?: string;
  sections: BDArchitectureSection[];
  diagramIds?: string[];
  modelIds?: string[];
  tagIds?: string[];
  authorIds?: string[];
  reviewers?: BDArchitectureReview[];
  references?: BDArchitectureReference[];
  links?: BDArchitectureLink[];
  attachmentIds?: string[];
  version?: string;
  archivedAt?: string;
}

export interface BDArchitectureAdr extends BDArchitectureBase<"adr"> {
  number: number;
  context: string;
  decision: string;
  consequences: string;
  alternatives?: string;
  deciderIds?: string[];
  decisionDate?: string;
}

export interface BDArchitectureRfc extends BDArchitectureBase<"rfc"> {
  number: number;
  motivation: string;
  proposal: string;
  drawbacks?: string;
  alternatives?: string;
  unresolvedQuestions?: string[];
}

export interface BDArchitecturePlan extends BDArchitectureBase<"plan"> {
  goal?: string;
  milestones: BDPlanMilestone[];
  sprintIds?: string[];
  taskIds?: string[];
}

export interface BDArchitectureDesign extends BDArchitectureBase<"design"> {
  goals: string[];
  nonGoals?: string[];
  constraints?: string[];
  risks?: BDRisk[];
  openQuestions?: string[];
}

export interface BDArchitectureSpec extends BDArchitectureBase<"spec"> {
  requirements: string[];
  acceptanceCriteria?: string[];
  apiRefs?: string[];
}

export interface BDArchitectureRoadmap extends BDArchitectureBase<"roadmap"> {
  horizon?: string;
  phases: BDPlanMilestone[];
}

export interface BDArchitectureRunbook extends BDArchitectureBase<"runbook"> {
  trigger?: string;
  steps: BDArchitectureStep[];
  rollback?: BDArchitectureStep[];
  escalation?: string;
}

export interface BDArchitecturePostmortem extends BDArchitectureBase<"postmortem"> {
  incidentDate: string;
  severity: "sev1" | "sev2" | "sev3" | "sev4";
  impact?: string;
  rootCause?: string;
  timeline?: BDArchitectureStep[];
  actionItems?: string[];
}

export interface BDArchitectureChangelog extends BDArchitectureBase<"changelog"> {
  entries: BDChangelogEntry[];
}

export type BDArchitecture =
  | BDArchitectureBase<"architecture">
  | BDArchitectureBase<"readme">
  | BDArchitectureBase<"guide">
  | BDArchitectureBase<"proposal">
  | BDArchitectureAdr
  | BDArchitectureRfc
  | BDArchitecturePlan
  | BDArchitectureDesign
  | BDArchitectureSpec
  | BDArchitectureRoadmap
  | BDArchitectureRunbook
  | BDArchitecturePostmortem
  | BDArchitectureChangelog;

/**
 * Storage shape for the single `architectures` table.
 *
 * The `BDArchitecture` union above keeps per-variant type safety in components;
 * this flat record carries every variant's fields as optional so one Dexie
 * table can persist any variant (and `create` accepts object literals).
 */
export interface BDArchitectureRecord extends BDArchitectureBase<BDArchitectureType> {
  /** When this record is a variant, the architecture it derives from. */
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
  steps?: BDArchitectureStep[];
  rollback?: BDArchitectureStep[];
  escalation?: string;
  incidentDate?: string;
  severity?: "sev1" | "sev2" | "sev3" | "sev4";
  impact?: string;
  rootCause?: string;
  timeline?: BDArchitectureStep[];
  actionItems?: string[];
  entries?: BDChangelogEntry[];
}
