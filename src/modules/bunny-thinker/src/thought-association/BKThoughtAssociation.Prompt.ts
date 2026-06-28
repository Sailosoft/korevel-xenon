// BKThoughtAssociation.Prompt.ts
//
// Generative AI prompts for BKThoughtAssociation domain.
// Uses Handlebars template syntax {{variable}} for variable injection.

// ─── Prompt Entry Interface ───────────────────────────────────────────

export interface BKThoughtAssociationPromptEntry {
  key: string;
  name: string;
  systemPrompt: string;
  userPrompt: string;
}

// ─── Enhance Prompts ─────────────────────────────────────────────────

export const bkThoughtAssociationPrompts: {
  enhance: BKThoughtAssociationPromptEntry[];
} = {
  enhance: [
    {
      key: "generate",
      name: "Generate Association",
      systemPrompt: `You are populating a thought association for a given pattern.

Generate appropriate values for each slot based on the context provided. For each slot provide meaningful content that fills the variable with relevant information.

Output as a JSON object mapping slot names to their values.`,
      userPrompt: `Create association "{{associationName}}" for pattern "{{patternName}}" with slots:
{{slotsDescription}}
{{context}}
Context: {{context}}`,
    },
  ],
};

/**
 * Generate a system prompt for creating a Thought Association.
 */
export function BKPromptGenerateAssociation(
  associationName: string,
  patternName: string,
  patternSlots: Array<{ name: string; label?: string; type: string }>,
  context?: string,
): string {
  const slotsDescription = patternSlots
    .map(
      (s) => `- ${s.name}${s.label ? ` (${s.label})` : ""}: type=${s.type}`,
    )
    .join("\n");

  return `You are populating a thought association for the pattern "${patternName}".

Association Name: ${associationName}${context ? `\nContext: ${context}` : ""}

The pattern has the following slots that need values:
${slotsDescription}

Generate appropriate values for each slot based on the context provided. For each slot provide meaningful content that fills the variable with relevant information.

Output as a JSON object mapping slot names to their values.`;
}
