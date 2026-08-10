// bc.study.entity.ts
//
// BCStudy — an AI-generated handbook / guide book produced from a case.
// A study is 1000-2000 words and provides insight about the case, better
// understanding, a handling guide, action items to practice, and a quick
// summary based on outline points for memorizing (feature #8).

export interface BCStudyOutlinePoint {
  /** Section title, e.g. "The Conflict" */
  title: string;
  /** Short bullet-style content for quick memorization */
  summary: string;
}

/**
 * Study "generate type" — the flavour / style of handbook produced (feature
 * #12): default handbook, manual, case study, generative instruction, tips &
 * guides, to-do list, beginner instruction or advanced instruction.
 */
export type BCStudyGenerateType =
  | "default"
  | "manual"
  | "case-study"
  | "generative-instruction"
  | "tips-guides"
  | "to-do-list"
  | "beginner"
  | "advanced";

export interface BCStudy {
  id?: number;
  caseId?: number;
  personaId?: number;
  caseTitle?: string;
  personaName?: string;
  /** Human-readable handbook title. */
  title: string;
  /** Full handbook body (1000-2000 words). */
  content: string;
  /** Quick-memorize outline points (section title + summary). */
  outline?: BCStudyOutlinePoint[];
  /** Word count of the generated content. */
  wordCount?: number;
  /** Which handbook flavour was generated (feature #12). */
  generateType?: BCStudyGenerateType;
  /** Training mode used (issue-handling / job-interview), single source of truth. */
  trainingMode?: string;
  createdAt?: number;
}

/** Structured output of the Study AI generation. */
export interface BCGeneratedStudy {
  title: string;
  content: string;
  outline: BCStudyOutlinePoint[];
}

/** Count words in a text string. */
export function bcStudyWordCount(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}
