import { BUIAIProvider } from "../modules/ai/bui.ai.interface";
import { BUIConfig } from "./bui.config.interface";

const activeProvider =
  (process.env.BUI_ACTIVE_PROVIDER as BUIAIProvider) || "default";

export const buiConfig: BUIConfig = {
  ai: {
    activeProvider,
    providers: [
      {
        provider: "default",
        apiKey: process.env.OPEN_AI_API_KEY || "[ENCRYPTION_KEY]",
        model: process.env.OPEN_AI_MODEL || "gemma4:31b-cloud",
        endpoint: process.env.OPEN_AI_BASE_URL || "http://localhost:11434/v1",
      },
      {
        provider: "ollamaLocal",
        apiKey: process.env.OLLAMA_LOCAL_API_KEY || "",
        model: process.env.OLLAMA_LOCAL_MODEL || "gemma4:31b",
        endpoint: "http://localhost:11434/v1",
      },
      {
        provider: "ollamaCloud",
        apiKey: process.env.OLLAMA_CLOUD_API_KEY || "",
        model: process.env.OLLAMA_CLOUD_MODEL || "gemma4:31b-cloud",
        endpoint: "https://ollama.cloud/v1",
      },
      {
        provider: "deepseek",
        apiKey: process.env.DEEPSEEK_API_KEY || "",
        model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
        endpoint: "https://api.deepseek.com/v1",
      },
      {
        provider: "groq",
        apiKey: process.env.GROQ_API_KEY || "",
        model: process.env.GROQ_MODEL || "mixtral-8x7b-32768",
        endpoint: "https://api.groq.com/openai/v1",
      },
      {
        provider: "openai",
        apiKey: process.env.OPEN_AI_API_KEY || "",
        model: process.env.OPEN_AI_MODEL || "gpt-4o-mini",
        endpoint: "https://api.openai.com/v1",
      },
      {
        provider: "openRouter",
        apiKey: process.env.OPENROUTER_API_KEY || "",
        model: process.env.OPENROUTER_MODEL || "mixtral-8x7b-32768",
        endpoint: "https://openrouter.ai/api/v1",
      },
    ],
  },
};
