// bui.skills-market.hooks.ts
//
// React hooks used by the Skills Market. They expose live, reactive state
// about the Author Skills registry so the marketplace (status column,
// summary badges, etc.) stays in sync when skills are added elsewhere.

"use client";

import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { buiDatabase } from "../../database/bui.database";
import { BUIAuthorSkill } from "../author-skills/bui.author-skills.entity";
import { buiSkillsMarketNameKey } from "./bui.skills-market.lib";

export interface BUISkillsMarketInstalledState {
  /** Case-insensitive names currently in the Author Skills registry. */
  installedNames: Set<string>;
  /** Number of skills currently in the Author Skills registry. */
  installedCount: number;
  /** True while the initial registry snapshot is still loading. */
  isLoading: boolean;
}

/**
 * Live view of the Author Skills registry.
 *
 * Re-renders whenever the registry changes (via Dexie live query).
 */
export function useBuiSkillsMarketInstalled(): BUISkillsMarketInstalledState {
  const skills = useLiveQuery<BUIAuthorSkill[]>(
    () => buiDatabase.authorSkills.toArray(),
    [],
  );

  const installedNames = useMemo(
    () =>
      new Set(
        (skills ?? []).map((skill) =>
          buiSkillsMarketNameKey(skill.name),
        ),
      ),
    [skills],
  );

  return {
    installedNames,
    installedCount: installedNames.size,
    isLoading: skills === undefined,
  };
}