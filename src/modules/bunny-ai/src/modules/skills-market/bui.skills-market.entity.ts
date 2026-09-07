// bui.skills-market.entity.ts
//
// Data model for the Skills Market module. A market skill is a browsable
// skill offered by the marketplace. Skills are never persisted on the market
// side — they only become part of the Author Skills registry when the user
// explicitly adds them via the row/header actions.

/** A skill offered on the marketplace. */
export interface BUISkillsMarketSkill {
  name: string;
  description?: string;
}

/** A marketplace row — a market skill plus its "added" state. */
export interface BUISkillsMarketRow extends BUISkillsMarketSkill {
  /** True when a skill with the same name already exists in Author Skills. */
  added: boolean;
}

/** Result of an add-to-author-skills operation. */
export interface BUISkillsMarketAddResult {
  skill: BUISkillsMarketSkill;
  /** True when the skill now exists in the Author Skills registry. */
  added: boolean;
  /** True when a same-named skill already existed before the operation. */
  existed: boolean;
  /** True when an existing same-named skill was overwritten. */
  overridden: boolean;
}