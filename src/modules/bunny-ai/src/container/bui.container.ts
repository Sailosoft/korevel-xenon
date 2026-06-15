import { asClass, asValue, AwilixContainer, createContainer } from "awilix";
import type {
  HelixAIConfig,
  HelixAIServiceType,
  HelixAISchema,
} from "@/src/modules/helix";
import {
  HELIX_AI_PROVIDERS,
  HelixAIService,
  HelixAISchemaService,
} from "@/src/modules/helix";

// ── Build the Helix AI config ──────────────────────────────────────────────
const activeProvider = (process.env.BUI_ACTIVE_PROVIDER as string) || "default";

const helixAIConfig: HelixAIConfig = {
  activeProvider: activeProvider as HelixAIConfig["activeProvider"],
  providers: HELIX_AI_PROVIDERS,
};

export interface BUIContainer {
  ai: HelixAIServiceType;
  config: { ai: HelixAIConfig };
  aiSchema: HelixAISchema;
}

const container: AwilixContainer<BUIContainer> =
  createContainer<BUIContainer>();

container.register({
  ai: asClass(HelixAIService).scoped(),
  config: asValue({ ai: helixAIConfig }),
  aiSchema: asClass(HelixAISchemaService).scoped(),
});

export { container as buiContainer };
