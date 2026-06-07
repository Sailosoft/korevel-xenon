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
    temperature?: number;
    type?: TemperaturePreset;
    maxToken?: number;
  }): Promise<string>;
  doChatJSON<T>(option: {
    system: string;
    user: string;
    schema: BUIAISchemaOptions;
    temperature?: number;
    type?: TemperaturePreset;
  }): Promise<T>;
  doChatStructured<S extends BUIAISchemaOptions>(options: {
    system: string;
    user: string;
    schema: S;
    temperature?: number;
    type?: TemperaturePreset;
  }): Promise<BUIInferSchemaProps<S>>;
  doChatStructuredFallback<S extends BUIAISchemaOptions>(options: {
    system: string;
    user: string;
    schema: S;
    temperature?: number;
    type?: TemperaturePreset;
    maxToken?: number;
  }): Promise<BUIInferSchemaProps<S>>;
}

export type TemperaturePreset =
  | "precise"
  | "balanced"
  | "creative"
  | "exploratory";
// export enum TemperaturePreset {
//   Precise = "precise", // 0.2
//   Balanced = "balanced", // 0.75
//   Creative = "creative", // 1.0
//   Exploratory = "exploratory", // 1.5
// }
