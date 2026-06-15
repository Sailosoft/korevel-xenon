import { asClass, asValue, AwilixContainer, createContainer } from "awilix";
import BUIAIService from "../modules/ai/bui.ai.service";
import { BUIAIServiceType } from "../modules/ai/bui.ai.interface";
import type { HelixAIConfig } from "@/src/modules/helix";
import { HELIX_AI_PROVIDERS } from "@/src/modules/helix";
import BUISchemaService from "../modules/ai-schema/bui.ai-schema";
import { BUIAISchema } from "../modules/ai-schema/bui.ai-schema.types";

// ── Build the Helix AI config ──────────────────────────────────────────────
const activeProvider = (process.env.BUI_ACTIVE_PROVIDER as string) || "default";

const helixAIConfig: HelixAIConfig = {
  activeProvider: activeProvider as HelixAIConfig["activeProvider"],
  providers: HELIX_AI_PROVIDERS,
};

export interface BUIContainer {
  ai: BUIAIServiceType;
  config: { ai: HelixAIConfig };
  aiSchema: BUIAISchema;
}

const container: AwilixContainer<BUIContainer> =
  createContainer<BUIContainer>();

container.register({
  ai: asClass(BUIAIService).scoped(),
  config: asValue({ ai: helixAIConfig }),
  aiSchema: asClass(BUISchemaService).scoped(),
});

export { container as buiContainer };
