// bui.author-skills.default.ts
//
// Built-in default author skills that ship with the bunny-ai module.
// These constants are merged with any database-persisted skills so that
// every writing workspace (chapter content, bulk generation, author creation)
// always has a sensible baseline set of skills to select from.
//
// They are treated as the "seed" source: when a default is selected or
// attached it is first persisted into the database so it receives a real id.

import { BUIAuthorSkill } from "./bui.author-skills.entity";

/**
 * Default author skills exposed as a constant object.
 *
 * - BeginnerGuideSkill: A skill for writing a guide specially for only beginners,
 *   avoiding complicated concepts.
 * - DescribePlanExecuteSkill: This skill focuses on describe, planning and
 *   execution content.
 * - TopicFocusSkill: This skill is to enable focus on a lenient topic focus approach.
 * - SubOutlineSkill: This writing skill is for making a suboutline per outline
 *   in each chapter.
 * - SummarizationSkill: This skill makes each chapter writing end with a summary
 *   part of it.
 */
export const BUI_DEFAULT_AUTHOR_SKILLS = {
  BeginnerGuideSkill: {
    name: "Beginner Guide Skill",
    description:
      "A skill for writing a guide specially for only beginners, avoiding complicated concepts.",
  },
  DescribePlanExecuteSkill: {
    name: "Describe, Plan, Execute Skill",
    description:
      "This skill focuses on describing, planning, and executing content.",
  },
  TopicFocusSkill: {
    name: "Topic Focus Skill",
    description:
      "This skill enables focus on a lenient topic-focus approach while writing.",
  },
  SubOutlineSkill: {
    name: "Sub Outline Skill",
    description:
      "This writing skill focuses on making a suboutline per outline in each chapter.",
  },
  SummarizationSkill: {
    name: "Summarization Skill",
    description:
      "This skill ensures each chapter writing ends with a summary part of it.",
  },
} as const satisfies Record<string, BUIAuthorSkill>;

/** Returns the default author skills as plain BUIAuthorSkill objects. */
export function buiAuthorSkillGetDefaultSkills(): BUIAuthorSkill[] {
  return Object.values(BUI_DEFAULT_AUTHOR_SKILLS).map((skill) => ({
    name: skill.name,
    description: skill.description,
  }));
}

/** Names of the default skills (case-insensitive), useful for filtering/preselect. */
export function buiAuthorSkillGetDefaultSkillNames(): Set<string> {
  return new Set(
    buiAuthorSkillGetDefaultSkills().map((skill) =>
      skill.name.trim().toLowerCase(),
    ),
  );
}
