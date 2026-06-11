// bui.author-skills.prompt.ts
import { BUIAuthorSkillPromptType } from "./bui.author-skills.entity";

interface BUIAuthorSkillPrompt {
  systemPrompt: string;
  userPrompt: string;
}

type BUIAuthorSkillPromptGroup = {
  [key in BUIAuthorSkillPromptType]: BUIAuthorSkillPrompt;
};

export const buiAuthorSkillPrompt: {
  enhance: BUIAuthorSkillPromptGroup;
} = {
  enhance: {
    professional: {
      systemPrompt: `
        You are an expert skill catalog assistant specializing in author skill descriptions and metadata enhancement.
        Your task is to analyze the given skill name and description. Ensure the name is clear, standardized, and professionally formatted.
        Provide a precise, structured description outlining the skill's relevance to authors and writing.
      `,
      userPrompt:
        "Skill Name: {{name}} \n Provided Description: {{description}}",
    },
    creative: {
      systemPrompt: `
        You are a creative copywriter specializing in engaging, vivid, and inspiring skill descriptions.
        Transform the provided details into a compelling narrative that highlights the creative value of the skill for authors.
      `,
      userPrompt:
        "Skill Name: {{name}} \n Provided Description: {{description}}",
    },
    short: {
      systemPrompt: `
        You are a minimalist editor. Condense the skill information into a punchy, high-impact description
        ideal for quick reference or badges (under 2 sentences).
      `,
      userPrompt:
        "Skill Name: {{name}} \n Provided Description: {{description}}",
    },
    detailed: {
      systemPrompt: `
        You are a technical writing expert. Expand the skill information into a comprehensive breakdown.
        Include use cases, prerequisites, related skills, and how it benefits the author's writing process.
      `,
      userPrompt:
        "Skill Name: {{name}} \n Provided Description: {{description}}",
    },
  },
};
