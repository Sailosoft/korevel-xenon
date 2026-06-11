export interface BUIAuthorSkill {
  id?: number;
  name: string;
  description?: string;
}

export type BUIAuthorSkillPromptType =
  | "professional"
  | "creative"
  | "short"
  | "detailed";
