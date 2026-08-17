// bui.author-skills.util.ts
//
// Utility layer for author skills selection. It bridges two sources:
//   1. Database-persisted skills (`buiDatabase.authorSkills`)
//   2. The built-in constant object (`BUI_DEFAULT_AUTHOR_SKILLS`)
//
// Default skills are seeded into the database on first access so they
// receive stable numeric ids and can be used in author-skill relations.

import { buiDatabase } from "../../database/bui.database";
import BUIAuthorSkillRelationRepository from "./bui.author-skills.relation.repository";
import { BUIAuthorSkill } from "./bui.author-skills.entity";
import {
  buiAuthorSkillGetDefaultSkillNames,
  buiAuthorSkillGetDefaultSkills,
} from "./bui.author-skills.default";

/**
 * Merges database skills with the default constant-object skills,
 * de-duplicating by name (database records win over defaults).
 */
export function buiAuthorSkillMerge(
  dbSkills: BUIAuthorSkill[],
  defaultSkills: BUIAuthorSkill[] = buiAuthorSkillGetDefaultSkills(),
): BUIAuthorSkill[] {
  const seen = new Set<string>();
  const merged: BUIAuthorSkill[] = [];

  for (const skill of [...dbSkills, ...defaultSkills]) {
    const key = (skill.name ?? "").trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(skill);
  }

  return merged;
}

/**
 * Ensures any missing default skills are persisted into the database so
 * they receive ids. Returns the updated (merged) full skill list.
 */
export async function buiAuthorSkillSeedDefaultsIfNeeded(): Promise<BUIAuthorSkill[]> {
  const dbSkills = await buiDatabase.authorSkills.toArray();
  const dbNames = new Set(
    dbSkills.map((skill) => (skill.name ?? "").trim().toLowerCase()),
  );

  const missingDefaults = buiAuthorSkillGetDefaultSkills().filter(
    (skill) => !dbNames.has((skill.name ?? "").trim().toLowerCase()),
  );

  if (missingDefaults.length > 0) {
    await buiDatabase.authorSkills.bulkAdd(missingDefaults);
  }

  return buiAuthorSkillMerge(await buiDatabase.authorSkills.toArray());
}

/**
 * Retrieves the full skills selection source: database + constant object,
 * seeding missing defaults along the way.
 */
export async function buiAuthorSkillGetAll(): Promise<BUIAuthorSkill[]> {
  return buiAuthorSkillSeedDefaultsIfNeeded();
}

/**
 * Ensures a single skill is persisted so it has a numeric id. Used when a
 * default (constant) skill needs to participate in author-skill relations.
 */
export async function buiAuthorSkillEnsurePersisted(
  skill: BUIAuthorSkill,
): Promise<BUIAuthorSkill> {
  if (skill.id !== undefined) return skill;

  const existing = await buiDatabase.authorSkills
    .where("name")
    .equals(skill.name)
    .first();
  if (existing?.id !== undefined) return existing;

  const id = await buiDatabase.authorSkills.add({
    name: skill.name,
    description: skill.description,
  });

  return { ...skill, id };
}

/**
 * Resolves a set of selected skill names into full skill objects, pulling
 * from both the database and the default constant object.
 *
 * @param selectedNames Optional list of selected skill names. When empty or
 *   undefined, falls back to the skills attached to `authorId`.
 * @param authorId Optional author whose attached skills are used as fallback.
 */
export async function buiAuthorSkillResolveForGeneration(
  selectedNames?: string[],
  authorId?: number,
): Promise<BUIAuthorSkill[]> {
  const allSkills = await buiAuthorSkillGetAll();

  if (selectedNames && selectedNames.length > 0) {
    const wanted = new Set(
      selectedNames.map((name) => name.trim().toLowerCase()).filter(Boolean),
    );
    return allSkills.filter((skill) =>
      wanted.has((skill.name ?? "").trim().toLowerCase()),
    );
  }

  if (authorId) {
    const relationRepo = new BUIAuthorSkillRelationRepository();
    return relationRepo.getSkillsByAuthor(authorId);
  }

  return [];
}

/**
 * Attaches a set of skills (matched by name) to the given author. Skills are
 * pulled from both the database and the default constant object, persisted if
 * needed, then linked via author-skill relations.
 *
 * @returns The skills that were attached.
 */
export async function buiAuthorSkillAttachSelectedToAuthor(
  authorId: number,
  selectedNames: string[],
): Promise<BUIAuthorSkill[]> {
  const wanted = new Set(
    selectedNames
      .map((name) => (name ?? "").trim().toLowerCase())
      .filter(Boolean),
  );
  if (wanted.size === 0) return [];

  const allSkills = await buiAuthorSkillGetAll();
  const matched = allSkills.filter((skill) =>
    wanted.has((skill.name ?? "").trim().toLowerCase()),
  );

  const persisted = await Promise.all(
    matched.map((skill) => buiAuthorSkillEnsurePersisted(skill)),
  );

  const skillIds = persisted
    .map((skill) => skill.id)
    .filter((id): id is number => typeof id === "number");

  if (skillIds.length > 0) {
    const relationRepo = new BUIAuthorSkillRelationRepository();
    await relationRepo.attachSkillsToAuthor(authorId, skillIds);
  }

  return persisted;
}

/**
 * Preselects (auto-attaches) all default skills to the given author.
 * Defaults are persisted first so they receive ids usable by relations.
 * Returns the skills that were attached.
 */
export async function buiAuthorSkillPreselectDefaultsForAuthor(
  authorId: number,
): Promise<BUIAuthorSkill[]> {
  return buiAuthorSkillAttachSelectedToAuthor(
    authorId,
    Array.from(buiAuthorSkillGetDefaultSkillNames()),
  );
}
