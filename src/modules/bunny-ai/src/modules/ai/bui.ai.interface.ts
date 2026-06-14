import OpenAI from "openai";
import {
  BUIAIOption,
  BUITemperaturePreset,
} from "../../configs/bui.config.interface";
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
