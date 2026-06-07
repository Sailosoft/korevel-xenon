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
    console.log("AI Config in BUIAIService constructor:", ai);
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
    console.log(response.choices);

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

  async doChatStructuredFallback<S extends BUIAISchemaOptions>(options: {
    system: string;
    user: string;
    schema: S;
    temperature?: number;
    type?: TemperaturePreset;
    maxToken?: number;
  }): Promise<BUIInferSchemaProps<S>> {
    const compiled = this.aiSchema.compileSchema(options.schema);
    const schemaString = JSON.stringify(compiled, null, 2);

    const enhancedSystemPrompt = `${options.system}

CRITICAL INSTRUCTION: You must respond ONLY with a raw JSON object matching the schema below.
Do not wrap the response in markdown code blocks (like \`\`\`json ... \`\`\`).
Do not include any introductory or concluding text.

Required JSON Schema:
${schemaString}`;

    const rawResponse = await this.doChat({
      system: enhancedSystemPrompt,
      user: options.user,
      temperature: options.temperature,
      type: options.type,
      maxToken: options.maxToken,
    });

    try {
      let cleanJSON = rawResponse.trim();

      if (cleanJSON.startsWith("```")) {
        cleanJSON = cleanJSON.replace(/^```(?:json)?\n?/i, "");
        cleanJSON = cleanJSON.replace(/\n?```$/, "");
      }

      return JSON.parse(cleanJSON.trim()) as BUIInferSchemaProps<S>;
    } catch (error) {
      throw new Error(
        `Failed to parse prompt-enforced structured JSON output. Raw response was: "${rawResponse}". Error: ${error}`,
      );
    }
  }
}
