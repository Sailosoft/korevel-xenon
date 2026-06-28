// BKIdeas.Prompt.ts
//
// Generative AI prompts for BKIdea domain.
// Uses Handlebars template syntax {{variable}} for variable injection.

// ─── Prompt Entry Interface ───────────────────────────────────────────

export interface BKIdeaPromptEntry {
  key: string;
  name: string;
  systemPrompt: string;
  userPrompt: string;
}

// ─── Enhance Prompts ─────────────────────────────────────────────────

export const bkIdeaPrompts: {
  enhance: BKIdeaPromptEntry[];
} = {
  enhance: [
    {
      key: "generate-for-thought",
      name: "Generate Idea for Thought",
      systemPrompt: `Generate a reusable idea that can enhance the given thought.

The idea should be a modular prompt component that could be attached to this thought to extend its capabilities or provide additional context. Provide the idea content and relevant tags.

Output as a JSON object with fields: "name" (string), "idea" (string), "tags" (string).`,
      userPrompt: `Generate an idea for thought:
Name: {{thoughtName}}
Content: {{thoughtContent}}`,
    },
  ],
};

/**
 * Generate a system prompt for creating reusable ideas.
 */
export function BKPromptGenerateIdea(
  name: string,
  context?: string,
): string {
  return `You are an idea curator. Create a reusable "Idea" — a prompt template or conceptual building block that can be attached to thoughts or thought associations.

Idea Name: ${name}${context ? `\nContext: ${context}` : ""}

Generate the idea content: a well-crafted prompt template that can be reused across different thinking contexts. The idea should be:
1. Self-contained and modular
2. Expressive and clear
3. Easily adaptable to different thought contexts

Also suggest relevant tags (comma-separated) for categorizing this idea.`;
}

/**
 * Prompt to generate an idea specifically tailored to enhance a thought.
 */
export function BKPromptGenerateIdeaForThought(
  thoughtName: string,
  thoughtContent: string,
): string {
  return `Generate a reusable idea that can enhance the following thought:

Thought Name: ${thoughtName}
Thought Content: ${thoughtContent}

The idea should be a modular prompt component that could be attached to this thought to extend its capabilities or provide additional context. Provide the idea content and relevant tags.`;
}
