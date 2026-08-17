export interface BUIAuthor {
  id?: number;
  name: string;
  description?: string;
  // tags?: string[];
}

/**
 * Shape of the author create form payload — extends BUIAuthor with the
 * transient `skillNames` selection produced by the preselect-skills field.
 */
export type BUIAuthorFormData = BUIAuthor & {
  skillNames?: string[];
};

export interface BUIAuthorPrompt {
  key: string;
  name: string;
  systemPrompt: string;
  userPrompt: string;
}
