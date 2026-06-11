import { buiDatabase } from "../../database/bui.database";
import { BUIAuthorSkillRelation } from "./bui.author-skills.relation.entity";
import { BUIAuthorSkill } from "./bui.author-skills.entity";
import { BUIAuthor } from "../authors/bui.author.entity";

export default class BUIAuthorSkillRelationRepository {
  async getSkillsByAuthor(authorId: number): Promise<BUIAuthorSkill[]> {
    const relations = await buiDatabase.authorSkillRelations
      .where("authorId")
      .equals(authorId)
      .toArray();

    const skillIds = relations.map((r) => r.skillId);
    if (skillIds.length === 0) return [];

    return buiDatabase.authorSkills.where(":id").anyOf(skillIds).toArray();
  }

  async getAuthorsBySkill(skillId: number): Promise<BUIAuthor[]> {
    const relations = await buiDatabase.authorSkillRelations
      .where("skillId")
      .equals(skillId)
      .toArray();

    const authorIds = relations.map((r) => r.authorId);
    if (authorIds.length === 0) return [];

    return buiDatabase.authors.where(":id").anyOf(authorIds).toArray();
  }

  async attachSkillsToAuthor(
    authorId: number,
    skillIds: number[],
  ): Promise<void> {
    // Remove existing relations for this author
    await buiDatabase.authorSkillRelations
      .where("authorId")
      .equals(authorId)
      .delete();

    // Add new relations
    const relations = skillIds.map((skillId) => ({
      authorId,
      skillId,
    }));
    await buiDatabase.authorSkillRelations.bulkAdd(relations);
  }

  async getSkillIdsByAuthor(authorId: number): Promise<number[]> {
    const relations = await buiDatabase.authorSkillRelations
      .where("authorId")
      .equals(authorId)
      .toArray();

    return relations.map((r) => r.skillId);
  }

  async detachSkillFromAuthor(
    authorId: number,
    skillId: number,
  ): Promise<void> {
    const relation = await buiDatabase.authorSkillRelations
      .where({ authorId, skillId })
      .first();

    if (relation?.id) {
      await buiDatabase.authorSkillRelations.delete(relation.id);
    }
  }
}
