// bc.settings.repository.ts
//
// Reads the persisted Helix AI provider/model from the `aiSettings` table so
// client-side code can forward the active AI option to server actions.

import { bcDatabase } from "../../database/bc.database";
import type { HelixAIOption, HelixAISettings } from "@/src/modules/helix";

export default class BCSettingsRepository {
  /** Read the active AI settings row ("default" key). */
  async getSettings(): Promise<HelixAISettings | undefined> {
    return bcDatabase.aiSettings.get("default");
  }

  /** Read the persisted provider + model as a HelixAIOption with a fallback. */
  async getActiveAIConfig(): Promise<HelixAIOption> {
    const settings = await this.getSettings();
    return {
      provider: settings?.provider ?? "default",
      model: settings?.model ?? "gemma4:31b-cloud",
    };
  }
}
