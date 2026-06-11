export type BUIChapterPromptType =
  | "default"
  | "draft"
  | "three_act"
  | "hero_journey"
  | "non_fiction"
  | "sci_fi_world"
  | "mystery_pacing";

export const buiChapterPrompt: {
  generateChapters: Record<
    BUIChapterPromptType,
    { systemPrompt: string; userPrompt: string }
  >;
  generateChaptersExtraPrompt: string;
  generateUserPrompt: string;
  generateUserPromptWithoutAuthor: string;
} = {
  generateChaptersExtraPrompt: `
Return ONLY a valid JSON array (no markdown enclosures, no extra text) with this structure:
[
  { "number": 1, "title": "Chapter Title", "description": "2-3 sentence summary." }
]
  `,
  generateUserPrompt: `
Book Title: {{book.title}}
Book Description: {{book.description}}
Author Name: {{author.name}}
Author Bio: {{author.description}}
{{#if skills.length}}
Author Skills:
{{#each skills}}
- {{this.name}}: {{this.description}}
{{/each}}
{{/if}}
  `,
  generateUserPromptWithoutAuthor: `
Book Title: {{book.title}}
Book Description: {{book.description}}
{{#if skills.length}}
Author Skills:
{{#each skills}}
- {{this.name}}: {{this.description}}
{{/each}}
{{/if}}
  `,
  generateChapters: {
    default: {
      systemPrompt:
        "You are an expert book architect. Generate structured chapter frameworks matching the provided thematic metadata.",
      userPrompt:
        "Analyze the provided profile context and outline a multi-chapter layout.",
    },
    draft: {
      systemPrompt:
        "You are a professional ghostwriter. Draft detailed multi-chapter breakdowns with strong structural outlines.",
      userPrompt:
        "Build a highly comprehensive plot setup matching the target description layout.",
    },
    three_act: {
      systemPrompt:
        "You are an expert narrative theorist. Break down the outline strictly into a Classic Three-Act Structure (Setup, Confrontation, Resolution).",
      userPrompt: "Build a balanced act framework matching this book profile.",
    },
    hero_journey: {
      systemPrompt:
        "You are a master of mythic structures. Generate chapters conforming sequentially to the 12 stages of The Hero's Journey archetype.",
      userPrompt:
        "Outline an epic journey blueprint matching this conceptual summary.",
    },
    non_fiction: {
      systemPrompt:
        "You are an educational copywriter. Draft a clean, modular, and non-fiction educational curriculum chapter breakdown.",
      userPrompt:
        "Deconstruct the core topics into actionable, step-by-step modular chapters.",
    },
    sci_fi_world: {
      systemPrompt:
        "You are a science fiction worldbuilder. Generate chapters focusing heavily on macro-worldbuilding principles, technological impact, and setting environments.",
      userPrompt:
        "Draft a high-concept universe chapter schema matching these constraints.",
    },
    mystery_pacing: {
      systemPrompt:
        "You are a thriller and mystery plotting expert. Structure the chapters to emphasize suspense curves, information drops, and investigative progression.",
      userPrompt:
        "Outline a tightly-paced psychological blueprint from this target concept.",
    },
  },
};
