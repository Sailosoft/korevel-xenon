import OpenAI from "openai";
import type { HelixAIOption, HelixTemperaturePreset } from "./HelixConfig";
import {
  HelixAISchemaOptions,
  HelixInferSchemaProps,
} from "./HelixAISchemaTypes";

export interface HelixAIServiceType {
  getModel(): string;
  getOpenAI(): OpenAI;
  getMaxTokens(): number;
  doChat(option: {
    system: string;
    user: string;
    model?: string;
    provider?: string;
    /** Override the default provider+model with a custom DTO */
    aiConfig?: HelixAIOption;
    temperature?: number;
    type?: HelixTemperaturePreset;
    maxToken?: number;
  }): Promise<string>;
  doChatJSON<T>(option: {
    system: string;
    user: string;
    schema: HelixAISchemaOptions;
    model?: string;
    provider?: string;
    /** Override the default provider+model with a custom DTO */
    aiConfig?: HelixAIOption;
    temperature?: number;
    type?: HelixTemperaturePreset;
  }): Promise<T>;
  doChatStructured<S extends HelixAISchemaOptions>(options: {
    system: string;
    user: string;
    schema: S;
    model?: string;
    provider?: string;
    /** Override the default provider+model with a custom DTO */
    aiConfig?: HelixAIOption;
    temperature?: number;
    type?: HelixTemperaturePreset;
  }): Promise<HelixInferSchemaProps<S>>;
  doChatStructuredFallback<S extends HelixAISchemaOptions>(options: {
    system: string;
    user: string;
    schema: S;
    model?: string;
    provider?: string;
    /** Override the default provider+model with a custom DTO */
    aiConfig?: HelixAIOption;
    temperature?: number;
    type?: HelixTemperaturePreset;
    maxToken?: number;
  }): Promise<HelixInferSchemaProps<S>>;
}
