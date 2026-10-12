import { buiDatabase } from "../../database/bui.database";
import BUIRepositoryAdminPanel from "../../database/bui.repository.admin-panel";
import { BUISetting } from "./bui.settings.entity";
import type { HelixAIOption, HelixAISettings } from "@/src/modules/helix";

export default class BUISettingsRepository extends BUIRepositoryAdminPanel<BUISetting> {
  constructor() {
    super(buiDatabase.settings);
  }

  /**
   * Reads the persisted Helix AI configuration from the shared `aiSettings`
   * singleton (key = "default"). This is the same row written by the shared
   * HelixAIProviderSelector, so every AI feature follows the Helix config.
   */
  async getHelixSettings(): Promise<HelixAISettings | undefined> {
    return buiDatabase.aiSettings.get("default");
  }

  /**
   * Resolves the active Helix AI provider + model as a `HelixAIOption` so it
   * can be forwarded to the server actions. Falls back to the Helix "default"
   * provider only when nothing has been configured yet.
   */
  async getActiveAIConfig(): Promise<HelixAIOption> {
    const settings = await this.getHelixSettings();

    return {
      provider: settings?.provider ?? "default",
      model: settings?.model ?? "gemma4:31b-cloud",
    };
  }
}
