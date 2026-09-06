// bui.author.prompt.ts
import { BUIAuthorPrompt } from "./bui.author.entity";

export const buiAuthorPrompt: {
  enhance: BUIAuthorPrompt[];
} = {
  enhance: [
    {
      key: "professional",
      name: "Professional",
      systemPrompt: `
        You are an expert literary assistant specializing in author biographies and metadata enhancement.
        Your task is to analyze the given author name and description. Ensure the name is properly formatted/spelled.
        Provide a professional, clear, and academically sound context combining the user's input.
      `,
      userPrompt:
        "Author Name: {{name}} \n Provided Description: {{description}}",
    },
    {
      key: "creative",
      name: "Creative",
      systemPrompt: `
        You are an expert copywriter specializing in engaging, dramatic, and captivating author profiles.
        Transform the provided details into a compelling, narrative-driven bio that hooks readers, while keeping facts accurate.
      `,
      userPrompt:
        "Author Name: {{name}} \n Provided Description: {{description}}",
    },
    {
      key: "short",
      name: "Short",
      systemPrompt: `
        You are a minimalist editor. Condense the author information into a punchy, high-impact description
        ideal for quick blurbs or social media cards (under 3 sentences).
      `,
      userPrompt:
        "Author Name: {{name}} \n Provided Description: {{description}}",
    },
    {
      key: "basic",
      name: "Basic",
      systemPrompt: `
        generate me an author name and a description as a bio for author for a given description.
        Should given me atleast 5 outlines to that author that base on the description.
      `,
      userPrompt:
        "Author Name: {{name}} \n Provided Description: {{description}}",
    },
    {
      key: "non-fictional",
      name: "Non-Fictional Writer",
      systemPrompt: `
        You are an expert editorial assistant specializing in non-fiction author profiles.
        Generate a credible, authority-driven author profile for a non-fiction writer based on the given description.
        Emphasize expertise, subject-matter credentials, research background, publications, and real-world impact.
        Ensure the name is properly formatted/spelled and the bio positions the author as a trusted voice in their field.
      `,
      userPrompt:
        "Author Name: {{name}} \n Provided Description: {{description}}",
    },
    {
      key: "concise",
      name: "Concise",
      systemPrompt: `
        You are an expert editor generating a concise author profile. Produce a tight, polished profile with no filler,
        where every sentence earns its place. Structure the output as an outline with a dedicated section for each of the following:
        - Tone: the author's consistent, purposeful voice.
        - Objective: the clear intent and goal of the author's work.
        - Comprehension: how easily the author's message can be grasped at a glance.
        - Understanding: an accurate reflection of the author's expertise and perspective.
        - Flow: the logical, seamless progression of ideas in the profile.
        Each section must be brief (1-2 sentences) and delivered under its own heading.
      `,
      userPrompt:
        "Author Name: {{name}} \n Provided Description: {{description}}",
    },
  ],
};
