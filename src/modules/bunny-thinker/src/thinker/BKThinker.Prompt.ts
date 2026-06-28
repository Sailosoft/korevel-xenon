// BKThinker.Prompt.ts
//
// Generative AI prompts for BKThinker domain.
// Uses Handlebars template syntax {{variable}} for variable injection.

import type { BKThinkerRole } from "./BKThinker.Types";

// ─── Prompt Entry Interface ───────────────────────────────────────────

export interface BKThinkerPromptEntry {
  key: string;
  name: string;
  systemPrompt: string;
  userPrompt: string;
}

// ─── Enhance Prompts ─────────────────────────────────────────────────

export const bkThinkerPrompts: {
  enhance: BKThinkerPromptEntry[];
} = {
  enhance: [
    {
      key: "swarm",
      name: "Thinker Swarm",
      systemPrompt: `You are a creative persona designer. Based on the user's request, generate a diverse set of "Thinker" personas that can collaboratively solve or analyze the given topic.

For each thinker, provide:
- name: A distinctive name
- role: One of: SoftwareEngineer, ProjectManager, BusinessAnalyst, SoftwareDeveloper, MedicalReviewer, MedicalPractioner, WebDesigner, QualityAssurance, Vlogger
- specialization: Their area of expertise
- description: A 2-3 sentence description of their perspective

Generate 3-5 thinkers that bring different viewpoints to this topic.`,
      userPrompt: "Generate thinkers for: {{request}}",
    },
    {
      key: "generate",
      name: "Generate Thinker",
      systemPrompt: `You are a creative persona designer. Create a detailed "Thinker" persona with specific attributes.

Generate a compelling description for this thinker that captures their unique perspective, expertise, and approach to problem-solving. The description should be 2-3 sentences that paint a vivid picture of who this thinker is and what they bring to the table.`,
      userPrompt: "Create a thinker with name: {{name}}, role: {{role}}{{specialization}}, specialization: {{specialization}}",
    },
  ],
};

/**
 * Generate a system prompt for creating a Thinker — a persona for thought.
 */
export function BKPromptGenerateThinker(
  name: string,
  role: BKThinkerRole,
  specialization?: string,
): string {
  return `You are a creative persona designer. Create a detailed "Thinker" persona with the following attributes:

Name: ${name}
Role: ${role}${specialization ? `\nSpecialization: ${specialization}` : ""}

Generate a compelling description for this thinker that captures their unique perspective, expertise, and approach to problem-solving. The description should be 2-3 sentences that paint a vivid picture of who this thinker is and what they bring to the table.`;
}

/**
 * Generate a system prompt for ThinkerSwarm — generating multiple thinkers at once.
 */
export function BKPromptThinkerSwarm(
  request: string,
): string {
  return `You are a creative persona designer. Based on the following request, generate a diverse set of "Thinker" personas that can collaboratively solve or analyze the given topic.

Request: ${request}

For each thinker, provide:
- name: A distinctive name
- role: One of: SoftwareEngineer, ProjectManager, BusinessAnalyst, SoftwareDeveloper, MedicalReviewer, MedicalPractioner, WebDesigner, QualityAssurance, Vlogger
- specialization: Their area of expertise
- description: A 2-3 sentence description of their perspective

Generate 3-5 thinkers that bring different viewpoints to this topic. Output as a JSON array.`;
}

/**
 * Prompt to generate multiple thinkers for a given role.
 */
export function BKPromptGenerateThinkersForRole(
  role: BKThinkerRole,
  count: number,
  context?: string,
): string {
  return `Generate ${count} different "Thinker" personas with the role "${role}"${context ? ` within the context of: ${context}` : ""}.

Each thinker should have a unique name and specialization within this role, with a compelling description of their perspective.

Output as a JSON array of objects with: name, role, specialization, description.`;
}
