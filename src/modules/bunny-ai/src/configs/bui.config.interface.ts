/** Supported AI providers */

import {
  BUIAIProvider,
  BUIAIProviderConfig,
} from "../modules/ai/bui.ai.interface";

export interface BUIConfigAI {
  /** All configured providers */
  providers: BUIAIProviderConfig[];
  /** The currently active provider key */
  activeProvider: BUIAIProvider;
}

export interface BUIConfig {
  ai: BUIConfigAI;
}
