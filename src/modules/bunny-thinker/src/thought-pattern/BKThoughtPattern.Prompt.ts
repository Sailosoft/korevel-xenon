// BKThoughtPattern.Prompt.ts
//
// Generative AI prompts for BKThoughtPattern domain.
// Uses Handlebars template syntax {{variable}} for variable injection.

// ─── Prompt Entry Interface ───────────────────────────────────────────

export interface BKThoughtPatternPromptEntry {
  key: string;
  name: string;
  systemPrompt: string;
  userPrompt: string;
}

// ─── Enhance Prompts ─────────────────────────────────────────────────

export const bkThoughtPatternPrompts: {
  enhance: BKThoughtPatternPromptEntry[];
} = {
  enhance: [
    {
      key: "generate",
      name: "Generate Pattern",
      systemPrompt: `You are a thought architect. Create a "Thought Pattern" that defines the variable structure for a thinking process.

Generate a set of memory slots (variables) that this pattern should have. Each slot represents a piece of information that needs to be collected or provided when using this pattern.

For each slot, provide:
- name: A unique identifier for the slot
- label: A human-readable label
- type: One of: "text", "textarea", "editor", "code-editor"
- defaultValue: A sensible default value
- required: boolean

Output as a JSON array of slots. Generate 2-5 slots that make sense for this pattern.`,
      userPrompt: "Create a thought pattern named: {{name}}{{description}}, description: {{description}}",
    },
    {
      key: "derive",
      name: "Derive Patterns",
      systemPrompt: `Analyze the given request and determine what thought patterns (variable templates) would be needed to properly address it.

For each pattern, provide:
- name: A descriptive name for the pattern
- description: What this pattern represents
- slots: Array of variable slots needed

Output as a JSON array.`,
      userPrompt: "Derive patterns from: {{request}}",
    },
  ],
};

/**
 * Generate a system prompt for creating a Thought Pattern.
 */
export function BKPromptGeneratePattern(
  name: string,
  description?: string,
): string {
  return `You are a thought architect. Create a "Thought Pattern" that defines the variable structure for a thinking process.

Pattern Name: ${name}${description ? `\nDescription: ${description}` : ""}

Generate a set of memory slots (variables) that this pattern should have. Each slot represents a piece of information that needs to be collected or provided when using this pattern.

For each slot, provide:
- name: A unique identifier for the slot
- label: A human-readable label
- type: One of: "text", "textarea", "editor", "code-editor"
- defaultValue: A sensible default value
- required: boolean

Output as a JSON array of slots. Generate 2-5 slots that make sense for this pattern.`;
}

/**
 * Prompt to analyze a user request and derive appropriate thought patterns.
 */
export function BKPromptDerivePatternsFromRequest(
  request: string,
): string {
  return `Analyze the following request and determine what thought patterns (variable templates) would be needed to properly address it.

Request: ${request}

For each pattern, provide:
- name: A descriptive name for the pattern
- description: What this pattern represents
- slots: Array of variable slots needed

Output as a JSON array.`;
}
