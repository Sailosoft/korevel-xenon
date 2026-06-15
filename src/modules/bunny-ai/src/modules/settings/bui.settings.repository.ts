import { buiDatabase } from "../../database/bui.database";
import BUIRepositoryAdminPanel from "../../database/bui.repository.admin-panel";
import { BUISetting } from "./bui.settings.entity";
import type { HelixAIOption } from "@/src/modules/helix";

export default class BUISettingsRepository extends BUIRepositoryAdminPanel<BUISetting> {
  constructor() {
    super(buiDatabase.settings);
  }

  /**
   * Reads the persisted AI provider + model from the settings table.
   * Falls back to "default" / "gemma4:31b-cloud" when not found.
   */
  async getActiveAIConfig(): Promise<HelixAIOption> {
    const [providerSetting, modelSetting] = await Promise.all([
      buiDatabase.settings.get("ai_provider"),
      buiDatabase.settings.get("default_ai_model"),
    ]);

    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      provider: (providerSetting?.value as any) ?? "default",
      model: modelSetting?.value ?? "gemma4:31b-cloud",
    };
  }
}
