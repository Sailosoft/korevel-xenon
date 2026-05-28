import { asClass, asValue, AwilixContainer, createContainer } from "awilix";
import BUIAIService from "../modules/ai/bui.ai.service";
import { BUIAIServiceType } from "../modules/ai/bui.ai.interface";
import { BUIConfig } from "../configs/bui.config.interface";
import { buiConfig } from "../configs/bui.config";
import BUISchemaService from "../modules/ai-schema/bui.ai-schema";
import { BUIAISchema } from "../modules/ai-schema/bui.ai-schema.types";

export interface BUIContainer {
  ai: BUIAIServiceType;
  config: BUIConfig;
  aiSchema: BUIAISchema;
}

const container: AwilixContainer<BUIContainer> =
  createContainer<BUIContainer>();

container.register({
  ai: asClass(BUIAIService).scoped(),
  config: asValue(buiConfig),
  aiSchema: asClass(BUISchemaService).scoped(),
});

export { container as buiContainer };
