/**
 * ───────────────────────────────────────────────────────────────────────────────
 * Helix — Model Library: Requesty (provider key: "requesty")
 * ───────────────────────────────────────────────────────────────────────────────
 * Selectable chat models for the "requesty" provider. Referenced from
 * HelixConfig.ts via HELIX_PROVIDER_MODELS so this catalog stays in one place.
 * Inline numbers are the provider's input/output price per MTok.
 */

export const REQUESTY_MODELS = [
  // free
  "google/gemma-4-31b-it", // 0/0
  "mistral/leanstral-1-5", // 0/0
  "nvidia/nemotron-3-nano-30b-a3b", // 0/0
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning", // 0/0
  "nvidia/nemotron-3-super-120b-a12b", // 0/0
  "nvidia/nemotron-3-ultra-550b-a55b", // 0/0
  "nvidia/nemotron-3.5-content-safety", // 0/0
  "nvidia/nemotron-3.5-lightning-30b-a3b", // 0/0
  "nvidia/muse-glimmer-30b", // 0/0
  "novita/inclusionai/ling-3.0-tiny", // 0/0
  // Deprecated
  // "poolside/laguna-m.1",
  // "poolside/laguna-xs.2",

  // alibaba
  "alibaba/qwen3-max", // 1.20/4.80
  "alibaba/qwen3.7-max", // 2.50/10.00
  "alibaba/qwen3.7-plus", // 0.80/3.20
  "alibaba/qwen3-coder-flash", // 0.08/0.24
  "alibaba/qwen3.7-plus", // 0.80/3.20
  "alibaba/qwen3-30b-a3b-instruct-2507", // 0.09/0.27

  // anthropic
  "anthropic/claude-opus-4-8", // 15.00/75.00
  "anthropic/claude-sonnet-4-6", // 3.00/15.00
  "anthropic/claude-fable-5", // 3.00/15.00
  "anthropic/claude-opus-5", // 15.00/75.00
  "anthropic/claude-sonnet-4-5", // 3.00/15.00

  // azure
  "azure/gpt-5.4-mini", // 0.15/0.60
  "azure/gpt-5.6-terra@swedencentral", // 2.50/10.00
  "azure/gpt-5-nano", // 0.05/0.20

  // bedrock
  "bedrock/claude-haiku-4-5@eu-west-1", // 0.25/1.25
  "bedrock/claude-opus-4-7", // 15.00/75.00
  "bedrock/claude-opus-4-7@eu-central-1", // 15.00/75.00
  "bedrock/claude-sonnet-4-5@eu-central-1", // 3.00/15.00
  "bedrock/claude-sonnet-4-6", // 3.00/15.00

  // coding
  "coding/gemini-2.5-flash", // 0.075/0.30
  "coding/gemini-2.5-pro", // 1.25/5.00

  // deepinfra
  "deepinfra/nvidia/Nemotron-3-Nano-30B-A3B", // 0.04/0.18
  "deepinfra/Qwen/Qwen3-235B-A22B", // 0.06/0.09
  "deepinfra/Qwen/Qwen3-235B-A22B-Instruct-2507", // 0.06/0.09

  // deepseek
  "deepseek/deepseek-v4-flash", // 0.07/0.14
  "deepseek/deepseek-v4-pro", // 0.27/1.10

  // doubleword
  "doubleword/glm-5.2:flex", // 0.35/1.40

  // fireworks
  "fireworks/deepseek-v4-flash", // 0.07/0.14
  "fireworks/deepseek-v4-pro", // 0.27/1.10
  "fireworks/glm-5.2", // 0.50/1.50
  "fireworks/gpt-oss-20b", // 0.06/0.27
  "fireworks/minimax-m3", // 0.20/0.80

  // google
  "google/gemini-3.1-flash-lite", // 0.025/0.10
  "google/gemini-3.5-flash-lite", // 0.04/0.18
  "google/gemini-3.5-flash", // 0.075/0.30
  "google/gemini-3.5-flash-lite:flex", // 0.02/0.10
  "google/gemini-3.6-flash", // 0.075/0.30
  "google/gemma-4-31b-it", // 0/0

  // groq
  "groq/openai/gpt-oss-120b", // 0.15/0.60
  "groq/openai/gpt-oss-20b", // 0.05/0.20

  // minimaxi
  "minimaxi/minimax-m3", // 0.20/0.80
  "minimaxi/MiniMax-M2.5", // 0.15/0.60
  "minimaxi/MiniMax-M2.5-highspeed", // 0.15/0.60
  "minimaxi/MiniMax-M2.7-highspeed", // 0.20/0.80

  // minstral
  "mistral/open-mistral-7b", // 0.05/0.15
  "mistral/mistral-medium-3-5", // 0.40/1.20

  // moonshot
  "moonshot/kimi-k2.7-code", // 0.60/2.40
  "moonshot/kimi-k3", // 1.00/4.00
  "moonshot/kimi-k2.6", // 0.60/2.40

  // nebius
  "nebius/qwen/qwen3-30b-a3b-instruct-2507", // 0.09/0.27
  "nebius/qwen/qwen3-235b-a22b-instruct-2507", // 0.07/0.14
  "nebius/zai-org/glm-5.1", // 0.40/1.20

  // novita
  "novita/minimax/minimax-m2.7", // 0.20/0.80
  "novita/tencent/hy3", // 0.25/0.50

  // openai
  "openai/gpt-4.1-mini", // 0.15/0.60
  "openai/gpt-4.1-nano", // 0.05/0.20
  "openai/gpt-5-mini", // 0.15/0.60
  "openai/gpt-5.4-nano", // 0.05/0.20
  "openai/gpt-5.4", // 2.50/10.00
  "openai/gpt-5.5", // 2.50/10.00
  "openai/gpt-5.6-sol", // 2.50/10.00
  "openai/gpt-5.6-terra", // 2.50/10.00

  // openai-responses
  "openai-responses/gpt-5-nano", // 0.05/0.20
  "openai-responses/gpt-5.4-mini", // 0.15/0.60

  // perplexity
  "perplexity/sonar", // 1.00/1.00

  // vertex
  "vertex/claude-4-5-sonnet", // 3.00/15.00
  "vertex/claude-opus-4-7", // 15.00/75.00
  "vertex/claude-fable-5", // 3.00/15.00
  "vertex/gemini-3.1-flash-lite", // 0.025/0.10
  "vertex/gemini-3.1-flash-lite@eu", // 0.025/0.10
  "vertex/gemini-3.1-flash-image", // 0.075/0.30
  "vertex/gemini-3.5-flash-lite", // 0.04/0.18
  "vertex/gemini-3.5-flash", // 0.075/0.30
  "vertex/gemini-3.5-flash:flex", // 0.04/0.18
  "vertex/gemini-3.6-flash", // 0.075/0.30
  "vertex/gemini-3.7-flash", // 0.075/0.30

  // xai
  "xai/grok-3-mini", // 0.20/0.80
  "xai/grok-4-1-fast-non-reasoning", // 0.20/0.80
  "xai/grok-4-1-fast-reasoning", // 0.30/1.20
  "xai/grok-4-fast", // 0.20/0.80
  "xai/grok-4.3", // 3.00/15.00

  // xiaomi
  "xiaomi/mimo-v2.5", // 0.10/0.30
  "xiaomi/mimo-v2.5-pro", // 0.40/1.20

  // zai
  "zai/glm-5.2", // 0.50/1.50
] as const;
