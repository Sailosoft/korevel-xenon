import OpenAI from "openai";
import type { HelixAIOption, HelixTemperaturePreset } from "./HelixConfig";
import type {
  ChatCompletion,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions";
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

  /**
   * Send a chat completion request with a raw messages array, returning the
   * full OpenAI ChatCompletion response object.
   *
   * Analogous to calling `openai.chat.completions.create()` directly, but
   * routed through Helix for provider resolution, API key management, and
   * model configuration.
   *
   * @example
   * ```ts
   * const response = await helix.doChatCompletion({
   *   messages: [
   *     { role: "system", content: "You are an expert." },
   *     { role: "user", content: "Write a chapter outline." },
   *   ],
   *   model: "gpt-4",
   *   temperature: 0.7,
   *   response_format: { type: "json_object" },
   * });
   * return response.choices[0]?.message?.content;
   * ```
   */
  doChatCompletion(option: {
    messages: ChatCompletionMessageParam[];
    model?: string;
    provider?: string;
    /** Override the default provider+model with a custom DTO */
    aiConfig?: HelixAIOption;
    temperature?: number;
    type?: HelixTemperaturePreset;
    maxToken?: number;
    response_format?: { type: "json_object" };
  }): Promise<ChatCompletion>;
}
