// bui.skills-market.lib.ts
//
// Library layer for the Skills Market. It bridges the market catalog
// (constant object) with the Author Skills registry (`buiDatabase.authorSkills`):
//   - computing the "added" state per market skill,
//   - finding same-named conflicts for the override warning,
//   - adding a single skill or the whole catalog.
//
// The marketplace never writes into Author Skills implicitly — every write
// happens through the explicit row/header actions in the module.

import { buiDatabase } from "../../database/bui.database";
import { BUIAuthorSkill } from "../author-skills/bui.author-skills.entity";
import { buiSkillsMarketGetAll } from "./bui.skills-market.constant";
import {
  BUISkillsMarketAddResult,
  BUISkillsMarketRow,
  BUISkillsMarketSkill,
} from "./bui.skills-market.entity";

/** Normalizes a skill name for case-insensitive matching. */
export function buiSkillsMarketNameKey(name?: string): string {
  return (name ?? "").trim().toLowerCase();
}

/** Names currently present in the Author Skills registry (case-insensitive). */
export async function buiSkillsMarketGetInstalledNames(): Promise<Set<string>> {
  const skills = await buiDatabase.authorSkills.toArray();
  return new Set(skills.map((skill) => buiSkillsMarketNameKey(skill.name)));
}

/** Builds marketplace rows enriched with the "added" state. */
export async function buiSkillsMarketBuildRows(): Promise<
  BUISkillsMarketRow[]
> {
  const installed = await buiSkillsMarketGetInstalledNames();
  return buiSkillsMarketGetAll().map((skill) => ({
    name: skill.name,
    description: skill.description,
    added: installed.has(buiSkillsMarketNameKey(skill.name)),
  }));
}

/** Market skills that are not yet present in the Author Skills registry. */
export async function buiSkillsMarketGetMissingSkills(): Promise<
  BUISkillsMarketSkill[]
> {
  const installed = await buiSkillsMarketGetInstalledNames();
  return buiSkillsMarketGetAll().filter(
    (skill) => !installed.has(buiSkillsMarketNameKey(skill.name)),
  );
}

/** Finds an Author Skill record whose name matches (case-insensitive). */
export async function buiSkillsMarketFindAuthorSkill(
  name: string,
): Promise<BUIAuthorSkill | undefined> {
  const key = buiSkillsMarketNameKey(name);
  const skills = await buiDatabase.authorSkills.toArray();
  return skills.find(
    (skill) => buiSkillsMarketNameKey(skill.name) === key,
  );
}

/**
 * Adds a market skill to the Author Skills registry.
 *
 * - When no same-named skill exists it is created.
 * - When a same-named skill exists and `override` is true, its description is
 *   overwritten. Otherwise nothing is written and `existed` is returned true —
 *   the caller decides whether to surface the override warning.
 */
export async function buiSkillsMarketAddToAuthorSkills(
  skill: BUISkillsMarketSkill,
  options?: { override?: boolean },
): Promise<BUISkillsMarketAddResult> {
  const override = options?.override ?? false;
  const existing = await buiSkillsMarketFindAuthorSkill(skill.name);

  if (existing) {
    if (!override) {
      return { skill, added: false, existed: true, overridden: false };
    }
    if (existing.id !== undefined) {
      await buiDatabase.authorSkills.update(existing.id, {
        name: skill.name,
        description: skill.description,
      });
    }
    return { skill, added: true, existed: true, overridden: true };
  }

  await buiDatabase.authorSkills.add({
    name: skill.name,
    description: skill.description,
  });
  return { skill, added: true, existed: false, overridden: false };
}

/** Resolves selected market row keys (skill names) to catalog skills. */
export function buiSkillsMarketGetSkillsByNames(
  names: ReadonlyArray<string | number | null | undefined>,
): BUISkillsMarketSkill[] {
  const keys = new Set(
    names
      .filter((name) => name !== null && name !== undefined)
      .map((name) => buiSkillsMarketNameKey(String(name))),
  );
  return buiSkillsMarketGetAll().filter((skill) =>
    keys.has(buiSkillsMarketNameKey(skill.name)),
  );
}

/** Adds an explicit list of market skills to the Author Skills registry. */
export function buiSkillsMarketAddSkillsToAuthorSkills(
  skills: BUISkillsMarketSkill[],
  options?: { override?: boolean },
): Promise<BUISkillsMarketAddResult[]> {
  return Promise.all(
    skills.map((skill) => buiSkillsMarketAddToAuthorSkills(skill, options)),
  );
}

/**
 * Adds the whole market catalog to the Author Skills registry.
 * Honors the same override semantics as {@link buiSkillsMarketAddToAuthorSkills}.
 */
export function buiSkillsMarketAddAllToAuthorSkills(options?: {
  override?: boolean;
}): Promise<BUISkillsMarketAddResult[]> {
  return buiSkillsMarketAddSkillsToAuthorSkills(
    buiSkillsMarketGetAll(),
    options,
  );
}

/** Summarizes the effect of a batch add for the confirmation dialog. */
export function buiSkillsMarketSummarize(
  results: BUISkillsMarketAddResult[],
): { added: number; skipped: number; overridden: number } {
  return results.reduce(
    (acc, result) => {
      if (result.added) acc.added += 1;
      else acc.skipped += 1;
      if (result.overridden) acc.overridden += 1;
      return acc;
    },
    { added: 0, skipped: 0, overridden: 0 },
  );
}