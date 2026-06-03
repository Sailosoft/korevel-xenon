// bui.author.prompt.ts
import { BUIAuthorPromptType } from "./bui.author.entity";

interface BUIAuthorPrompt {
  systemPrompt: string;
  userPrompt: string;
}

type BUIAuthorPromptGroup = {
  [key in BUIAuthorPromptType]: BUIAuthorPrompt;
};
export const buiAuthorPrompt: {
  enhance: BUIAuthorPromptGroup;
} = {
  enhance: {
    // You can keep the default one or break them all into types
    professional: {
      systemPrompt: `
        You are an expert literary assistant specializing in author biographies and metadata enhancement.
        Your task is to analyze the given author name and description. Ensure the name is properly formatted/spelled.
        Provide a professional, clear, and academically sound context combining the user's input.
      `,
      userPrompt:
        "Author Name: {{name}} \n Provided Description: {{description}}",
    },
    creative: {
      systemPrompt: `
        You are an expert copywriter specializing in engaging, dramatic, and captivating author profiles.
        Transform the provided details into a compelling, narrative-driven bio that hooks readers, while keeping facts accurate.
      `,
      userPrompt:
        "Author Name: {{name}} \n Provided Description: {{description}}",
    },
    short: {
      systemPrompt: `
        You are a minimalist editor. Condense the author information into a punchy, high-impact description 
        ideal for quick blurbs or social media cards (under 3 sentences).
      `,
      userPrompt:
        "Author Name: {{name}} \n Provided Description: {{description}}",
    },
  },
};
