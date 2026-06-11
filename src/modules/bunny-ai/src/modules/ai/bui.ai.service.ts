import OpenAI from "openai";
import {
  BUIAIOption,
  BUIAIProviderConfig,
  BUIAIServiceType,
  BUITemperaturePreset,
} from "./bui.ai.interface";
import {
  BUIAISchema,
  BUIAISchemaOptions,
  BUIInferSchemaProps,
} from "../ai-schema/bui.ai-schema.types";
import { BUIContainer } from "../../container/bui.container";

/** Placeholder sentinel used when no real API key has been configured. */
const ENCRYPTION_KEY_PLACEHOLDER = "[ENCRYPTION_KEY]";

/** Check if the given API key is usable (not empty and not a placeholder). */
function isValidApiKey(key: string): boolean {
  return key !== "" && key !== ENCRYPTION_KEY_PLACEHOLDER;
}

/** Assert the provider config has a valid API key, throwing a descriptive error if not. */
function assertApiKey(config: { provider: string; apiKey: string }): void {
  if (!isValidApiKey(config.apiKey)) {
    throw new Error(
      `[BUIAIService] No valid API key configured for provider "${config.provider}". ` +
        `Set the API key in your environment variables or provider configuration.`,
    );
  }
}

/**
 * Resolve the effective provider config in priority order:
 *   1. aiConfig DTO  (looks up the provider config by name)
 *   2. nothing       (uses the constructor-initialized default)
 */
function resolveConfig(
  defaults: { provider: string; configs: BUIAIProviderConfig[] },
  override?: BUIAIOption,
): { provider: string; model: string; apiKey: string; endpoint?: string } {
  if (!override)
    return defaults.configs.find((p) => p.provider === defaults.provider)!;

  const found = defaults.configs.find((p) => p.provider === override.provider);
  if (!found) {
    console.warn(
      `[BUIAIService] Unknown provider "${override.provider}", falling back to "${defaults.provider}"`,
    );
    return defaults.configs.find((p) => p.provider === defaults.provider)!;
  }

  assertApiKey(found);

  return {
    provider: found.provider,
    model: override.model || found.model,
    apiKey: found.apiKey,
    endpoint: found.endpoint,
  };
}

export default class BUIAIService implements BUIAIServiceType {
  private readonly ai: OpenAI;
  private readonly model: string;
  private readonly provider: string;
  private readonly aiSchema: BUIAISchema;
  private readonly providerConfigs: BUIAIProviderConfig[];

  constructor({ config: { ai }, aiSchema }: BUIContainer) {
    const active = ai.providers.find((p) => p.provider === ai.activeProvider);
    if (!active) {
      throw new Error(
        `No configuration found for active AI provider "${ai.activeProvider}". Available providers: ${ai.providers.map((p) => p.provider).join(", ")}`,
      );
    }
    this.providerConfigs = ai.providers;
    this.model = active.model;
    this.provider = active.provider;

    // Validate the active provider has a usable API key at construction time
    assertApiKey(active);

    console.log(
      `AI Service initialized — provider: ${active.provider}, model: ${active.model}`,
    );
    this.ai = new OpenAI({
      apiKey: active.apiKey,
      baseURL: active.endpoint,
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
    provider?: string;
    aiConfig?: BUIAIOption;
    temperature?: number;
    type?: BUITemperaturePreset;
    maxToken?: number;
  }): Promise<string> {
    const resolved = resolveConfig(
      { provider: this.provider, configs: this.providerConfigs },
      option.aiConfig,
    );
    const client =
      option.aiConfig || option.provider
        ? new OpenAI({
            apiKey: resolved.apiKey,
            baseURL: resolved.endpoint,
          })
        : this.ai;
    const effectiveModel =
      option.aiConfig?.model || option.model || resolved.model;

    try {
      const response = await client.chat.completions.create({
        model: effectiveModel,
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
    type,
    model,
    provider,
    aiConfig,
  }: {
    system: string;
    user: string;
    schema: BUIAISchemaOptions;
    model?: string;
    provider?: string;
    aiConfig?: BUIAIOption;
    temperature?: number;
    type?: BUITemperaturePreset;
  }): Promise<T> {
    const resolved = resolveConfig(
      { provider: this.provider, configs: this.providerConfigs },
      aiConfig,
    );
    const client =
      aiConfig || provider
        ? new OpenAI({
            apiKey: resolved.apiKey,
            baseURL: resolved.endpoint,
          })
        : this.ai;
    const effectiveModel = aiConfig?.model || model || resolved.model;
    const responseFormat = this.aiSchema.compileSchema(schema);

    const response = await client.chat.completions.create({
      model: effectiveModel,
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
    model?: string;
    provider?: string;
    aiConfig?: BUIAIOption;
    temperature?: number;
    type?: BUITemperaturePreset;
  }): Promise<BUIInferSchemaProps<S>> {
    return this.doChatJSON<BUIInferSchemaProps<S>>(options);
  }

  async doChatStructuredFallback<S extends BUIAISchemaOptions>(options: {
    system: string;
    user: string;
    schema: S;
    model?: string;
    provider?: string;
    aiConfig?: BUIAIOption;
    temperature?: number;
    type?: BUITemperaturePreset;
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
      aiConfig: options.aiConfig,
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
