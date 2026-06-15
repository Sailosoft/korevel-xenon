import { BUIAIProvider } from "./bui.config.interface";
import { BUIConfig } from "./bui.config.interface";
import { BUI_AI_PROVIDERS } from "./bui.config.ai";

const activeProvider =
  (process.env.BUI_ACTIVE_PROVIDER as BUIAIProvider) || "default";

export const buiConfig: BUIConfig = {
  ai: {
    activeProvider,
    providers: BUI_AI_PROVIDERS,
  },
};
