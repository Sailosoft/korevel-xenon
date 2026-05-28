import { BUIConfig } from "./bui.config.interface";

export const buiConfig: BUIConfig = {
  ai: {
    model: process.env.OPEN_AI_API_KEY || "[ENCRYPTION_KEY]",
    endpoint: process.env.OPEN_AI_BASE_URL || "http://localhost:11434/v1",
    apiKey: process.env.OPEN_AI_MODEL || "gemma4:31b-cloud",
  },
};
