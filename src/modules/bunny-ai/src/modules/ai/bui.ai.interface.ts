import OpenAI from "openai";
import {
  BUIAISchemaOptions,
  BUIInferSchemaProps,
} from "../ai-schema/bui.ai-schema.types";

export interface BUIAIServiceType {
  getModel(): string;
  getOpenAI(): OpenAI;
  getMaxTokens(): number;
  doChat(option: {
    system: string;
    user: string;
    model?: string;
    provider?: string;
    /** Override the default provider+model with a custom DTO */
    aiConfig?: BUIAIOption;
    temperature?: number;
    type?: BUITemperaturePreset;
    maxToken?: number;
  }): Promise<string>;
  doChatJSON<T>(option: {
    system: string;
    user: string;
    schema: BUIAISchemaOptions;
    model?: string;
    provider?: string;
    /** Override the default provider+model with a custom DTO */
    aiConfig?: BUIAIOption;
    temperature?: number;
    type?: BUITemperaturePreset;
  }): Promise<T>;
  doChatStructured<S extends BUIAISchemaOptions>(options: {
    system: string;
    user: string;
    schema: S;
    model?: string;
    provider?: string;
    /** Override the default provider+model with a custom DTO */
    aiConfig?: BUIAIOption;
    temperature?: number;
    type?: BUITemperaturePreset;
  }): Promise<BUIInferSchemaProps<S>>;
  doChatStructuredFallback<S extends BUIAISchemaOptions>(options: {
    system: string;
    user: string;
    schema: S;
    model?: string;
    provider?: string;
    /** Override the default provider+model with a custom DTO */
    aiConfig?: BUIAIOption;
    temperature?: number;
    type?: BUITemperaturePreset;
    maxToken?: number;
  }): Promise<BUIInferSchemaProps<S>>;
}

/**
 * Precise: 0.2
 * Balanced: 0.75
 * Creative: 1.0
 * Exploratory: 2.0
 */
export type BUITemperaturePreset =
  | "precise"
  | "balanced"
  | "creative"
  | "exploratory";

export type BUIAIProvider =
  | "default"
  | "ollamaLocal"
  | "ollamaCloud"
  | "deepseek"
  | "groq"
  | "openai"
  | "deepinfra"
  | "openRouter"
  | "googleAIStudio";

export interface BUIAIOption {
  provider: BUIAIProvider;
  model: string;
}

/** Configuration for a single AI provider */
export interface BUIAIProviderConfig {
  provider: BUIAIProvider;
  apiKey: string;
  /** The model identifier — must be one of the predefined models for this provider */
  model: string;
  /** Custom base URL override (required for ollama-local) */
  endpoint?: string;
}
