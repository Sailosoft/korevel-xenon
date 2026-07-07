import OpenAI from "openai";
import type {
  ChatCompletion,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions";
import type {
  HelixAIOption,
  HelixAIProviderConfig,
  HelixTemperaturePreset,
  HelixAIConfig,
} from "./HelixConfig";
import { HelixAIServiceType } from "./HelixAIServiceInterface";
import {
  HelixAISchema,
  HelixAISchemaOptions,
  HelixInferSchemaProps,
} from "./HelixAISchemaTypes";
import HelixAIUtil from "./HelixAIUtil";

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
      `[HelixAIService] No valid API key configured for provider "${config.provider}". ` +
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
  defaults: { provider: string; configs: HelixAIProviderConfig[] },
  override?: HelixAIOption,
): { provider: string; model: string; apiKey: string; endpoint?: string } {
  if (!override)
    return defaults.configs.find((p) => p.provider === defaults.provider)!;

  const found = defaults.configs.find((p) => p.provider === override.provider);
  if (!found) {
    console.warn(
      `[HelixAIService] Unknown provider "${override.provider}", falling back to "${defaults.provider}"`,
    );
    return defaults.configs.find((p) => p.provider === defaults.provider)!;
  }

  assertApiKey(found);

  // When provider is "default", always use OPEN_AI_MODEL from env
  const model =
    found.provider === "default"
      ? (process.env.OPEN_AI_MODEL ?? found.model)
      : override?.provider === "default"
        ? override.model
        : found.model;

  return {
    provider: found.provider,
    model,
    apiKey: found.apiKey,
    endpoint: found.endpoint,
  };
}

export default class HelixAIService implements HelixAIServiceType {
  private readonly ai: OpenAI;
  private readonly model: string;
  private readonly provider: string;
  private readonly aiSchema: HelixAISchema;
  private readonly providerConfigs: HelixAIProviderConfig[];

  constructor({
    config: { ai },
    aiSchema,
  }: {
    config: { ai: HelixAIConfig };
    aiSchema: HelixAISchema;
  }) {
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

  /**
   * Send a chat completion with a raw messages array, preserving conversation history
   * in OpenAI's natural format. This method accepts an array of messages with roles
   * ("system", "user", "assistant") — analogous to how you would call the OpenAI SDK
   * directly but routed through HelixAIService for provider resolution and config.
   *
   * Usage example:
   * ```ts
   * const response = await helix.doChatWithHistory({
   *   messages: [
   *     { role: "system", content: "You are a helpful assistant." },
   *     { role: "user", content: "Hello!" },
   *     { role: "assistant", content: "Hi! How can I help?" },
   *     { role: "user", content: "What is AI?" },
   *   ],
   * });
   * ```
   */
  async doChatWithHistory(option: {
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
    model?: string;
    provider?: string;
    aiConfig?: HelixAIOption;
    temperature?: number;
    type?: HelixTemperaturePreset;
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
        messages: option.messages,
        temperature: option.temperature ?? 0.7,
        max_tokens: option.maxToken ?? this.getMaxTokens(),
      });

      return response.choices[0]?.message?.content || "";
    } catch (error) {
      throw new Error(`AI Text Generation failed: ${error}`);
    }
  }

  async doChatCompletion(option: {
    messages: ChatCompletionMessageParam[];
    model?: string;
    provider?: string;
    aiConfig?: HelixAIOption;
    temperature?: number;
    type?: HelixTemperaturePreset;
    maxToken?: number;
    response_format?: { type: "json_object" };
  }): Promise<ChatCompletion> {
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
        messages: option.messages,
        temperature: option.temperature ?? 0.7,
        max_tokens: option.maxToken ?? this.getMaxTokens(),
        ...(option.response_format ? { response_format: option.response_format } : {}),
      });

      return response;
    } catch (error) {
      throw new Error(`AI ChatCompletion failed: ${error}`);
    }
  }

  async doChat(option: {
    system: string;
    user: string;
    model?: string;
    provider?: string;
    aiConfig?: HelixAIOption;
    temperature?: number;
    type?: HelixTemperaturePreset;
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
    schema: HelixAISchemaOptions;
    model?: string;
    provider?: string;
    aiConfig?: HelixAIOption;
    temperature?: number;
    type?: HelixTemperaturePreset;
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

  doChatStructured<S extends HelixAISchemaOptions>(options: {
    system: string;
    user: string;
    schema: S;
    model?: string;
    provider?: string;
    aiConfig?: HelixAIOption;
    temperature?: number;
    type?: HelixTemperaturePreset;
  }): Promise<HelixInferSchemaProps<S>> {
    return this.doChatJSON<HelixInferSchemaProps<S>>(options);
  }

  async doChatStructuredFallback<S extends HelixAISchemaOptions>(options: {
    system: string;
    user: string;
    schema: S;
    model?: string;
    provider?: string;
    aiConfig?: HelixAIOption;
    temperature?: number;
    type?: HelixTemperaturePreset;
    maxToken?: number;
  }): Promise<HelixInferSchemaProps<S>> {
    const compiled = this.aiSchema.compileSchema(options.schema);
    const schemaString = JSON.stringify(compiled, null, 2);

    /**
     * Previous:prompt
     * CRITICAL INSTRUCTION: You must respond ONLY with a raw JSON object matching the schema below.
     * Do not wrap the response in markdown code blocks (like \`\`\`json ... \`\`\`).
     * Do not include any introductory or concluding text.
     */
    const enhancedSystemPrompt = `${options.system}

You are a strict JSON generator. Follow these rules exactly:

1. OUTPUT — Respond with ONLY the raw JSON object. No markdown fences (\`\`\`json), no labels, no explanations, no introductory or concluding text.
2. KEYS — Every property key MUST be double-quoted. Never use single quotes or bare identifiers.
3. STRINGS — All string values must be properly escaped — no literal newlines or unescaped quotes inside a string.
4. COMMAS — Never add a trailing comma before \`}\` or \`]\`.
5. COMMENTS — Never include // or /* */ comments in the output.
6. SCHEMA — Output must conform to the schema below exactly. Do not add, remove, or reorder properties.

Required JSON Schema:
${schemaString}

Example of correct output:
\`\`\`json
{"title": "Example Title", "content": "Example content here"}
\`\`\``;

    const rawResponse = await this.doChat({
      system: enhancedSystemPrompt,
      user: options.user,
      temperature: options.temperature,
      type: options.type,
      maxToken: options.maxToken,
      aiConfig: options.aiConfig,
    });

    const result =
      HelixAIUtil.safeJSONParse<HelixInferSchemaProps<S>>(rawResponse);

    if (!result.success) {
      throw new Error(
        `Failed to parse prompt-enforced structured JSON output. ` +
          `Response (first 500 chars): ${rawResponse.slice(0, 500)}. ` +
          `Recovery details: ${result.error}`,
      );
    }

    return result.data;
  }
}
