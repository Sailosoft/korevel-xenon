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
        apiKey: "ollama",
        model: process.env.OPEN_AI_MODEL || "gemma4:31b",
        endpoint: "http://localhost:11434/v1",
      },
      {
        provider: "ollamaCloud",
        apiKey: process.env.OLLAMA_API_KEY || "",
        model: "gemma4:31b-cloud",
        endpoint: "https://ollama.cloud/v1",
      },
      {
        provider: "deepseek",
        apiKey: process.env.DEEPSEEK_API_KEY || "",
        model: "deepseek-v4-pro",
        endpoint: "https://api.deepseek.com/v1",
      },
      {
        provider: "groq",
        apiKey: process.env.GROQ_API_KEY || "",
        model: "openai/gpt-oss-120b",
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
        apiKey: process.env.OPEN_ROUTER_API_KEY || "",
        model: "openrouter/free",
        endpoint: "https://openrouter.ai/api/v1",
      },
      {
        provider: "deepinfra",
        apiKey: process.env.DEEP_INFRA_API_KEY || "",
        model: "google/gemma-4-31B-it",
        endpoint: "https://api.deepinfra.com/v1",
      },
      {
        provider: "googleAIStudio",
        apiKey: process.env.GOOGLE_AI_STUDIO_API_KEY || "",
        model: "gemini-3.1-flash-lite",
        endpoint: "https://generativelanguage.googleapis.com/v1beta/openai",
      },
    ],
  },
};
