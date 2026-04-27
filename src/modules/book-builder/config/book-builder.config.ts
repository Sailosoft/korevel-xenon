export const BOOK_BUILDER_CONFIG = {
  OPEN_AI_BASE_URL: process.env.OPEN_AI_BASE_URL || "http://localhost:11434/v1",
  OPEN_AI_API_KEY: process.env.OPEN_AI_API_KEY || "[ENCRYPTION_KEY]",
  OPEN_AI_MODEL: process.env.OPEN_AI_MODEL || "gemma4:31b-cloud",
} as const;
