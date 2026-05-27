import { asClass, AwilixContainer, createContainer } from "awilix";
import BUIAIService from "../modules/ai/bui.ai.service";

export interface BUIContainer {
  ai: BUIAIService;
}

const container: AwilixContainer<BUIContainer> =
  createContainer<BUIContainer>();

container.register({
  ai: asClass(BUIAIService).scoped(),
});

export { container as buiContainer };
