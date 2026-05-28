import OpenAI from "openai";
import { BUIAIServiceType, TemperaturePreset } from "./bui.ai.interface";
import {
  BUIAISchema,
  BUIAISchemaOptions,
  BUIInferSchemaProps,
} from "../ai-schema/bui.ai-schema.types";
import { BUIContainer } from "../../container/bui.container";

export default class BUIAIService implements BUIAIServiceType {
  private readonly ai: OpenAI;
  private readonly model: string;
  private readonly aiSchema: BUIAISchema;
  constructor({ config: { ai }, aiSchema }: BUIContainer) {
    this.model = ai.model;
    this.ai = new OpenAI({
      apiKey: ai.apiKey,
      baseURL: ai.endpoint,
    });
    this.aiSchema = aiSchema;
  }

  getModel(): string {
    return this.model;
  }

  getOpenAI(): OpenAI {
    return this.ai;
  }

  getMaxTokens(): number {
    return 8000;
  }

  async doChat(option: {
    system: string;
    user: string;
    model?: string;
    provider?: string; // Kept for interface alignment
    temperature?: number;
    type?: TemperaturePreset; // Kept for interface alignment
    maxToken?: number;
  }): Promise<string> {
    try {
      const response = await this.ai.chat.completions.create({
        // Fallback hierarchy: explicit runtime override -> constructor configuration default
        model: option.model || this.getModel(),
        messages: [
          { role: "system", content: option.system },
          { role: "user", content: option.user },
        ],
        temperature: option.temperature ?? 0.7,
        max_tokens: option.maxToken ?? this.getMaxTokens(),
      });

      return response.choices[0]?.message?.content || "";
    } catch (error) {
      throw new Error(`AI Text Generation failed: ${error}`);
    }
  }

  async doChatJSON<T>({
    schema,
    system,
    user,
    temperature,
  }: {
    system: string;
    user: string;
    schema: BUIAISchemaOptions;
    temperature?: number;
    type?: TemperaturePreset;
  }): Promise<T> {
    const responseFormat = this.aiSchema.compileSchema(schema);

    const response = await this.ai.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: responseFormat,
      temperature: temperature ?? 0.7,
    });

    return JSON.parse(response.choices[0]?.message?.content || "{}");
  }

  doChatStructured<S extends BUIAISchemaOptions>(options: {
    system: string;
    user: string;
    schema: S;
    temperature?: number;
    type?: TemperaturePreset;
  }): Promise<BUIInferSchemaProps<S>> {
    return this.doChatJSON<BUIInferSchemaProps<S>>(options);
  }
}
