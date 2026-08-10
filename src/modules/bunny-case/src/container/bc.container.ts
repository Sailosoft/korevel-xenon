// bc.container.ts
//
// BCCaseContainer — Awilix dependency-injection container that wires the
// Helix AI service (provider resolution + OpenAI-compatible client + JSON
// schema compilation) so every BunnyCase module can resolve an `ai` service.
//
// Usage (server actions):
//   const scope = bcContainer.createScope();
//   const ai = scope.resolve("ai");
//   const text = await ai.doChat({ system, user, aiConfig });

import { asClass, asValue, AwilixContainer, createContainer } from "awilix";
import type {
  HelixAIConfig,
  HelixAISchema,
  HelixAIServiceType,
} from "@/src/modules/helix";
import {
  HELIX_AI_PROVIDERS,
  HelixAISchemaService,
  HelixAIService,
} from "@/src/modules/helix";

// ── Build the Helix AI config ──────────────────────────────────────────────
const activeProvider = (process.env.BC_ACTIVE_PROVIDER as string) || "default";

const helixAIConfig: HelixAIConfig = {
  activeProvider: activeProvider as HelixAIConfig["activeProvider"],
  providers: HELIX_AI_PROVIDERS,
};

export interface BCContainer {
  ai: HelixAIServiceType;
  config: { ai: HelixAIConfig };
  aiSchema: HelixAISchema;
}

const container: AwilixContainer<BCContainer> =
  createContainer<BCContainer>();

container.register({
  ai: asClass(HelixAIService).scoped(),
  config: asValue({ ai: helixAIConfig }),
  aiSchema: asClass(HelixAISchemaService).scoped(),
});

export { container as bcContainer };
