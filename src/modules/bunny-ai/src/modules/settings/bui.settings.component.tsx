"use client";

import { HelixAIProviderSelector } from "@/src/modules/helix";
import { buiDatabase } from "../../database/bui.database";

/**
 * Bunny AI preferences. The active AI provider/model is stored in the shared
 * Helix `aiSettings` singleton (key = "default") via the Helix
 * HelixAIProviderSelector, so every Bunny AI generation — including book
 * chapter generation — uses the Helix configuration instead of the .env
 * default API.
 */
export default function BUISettingsComponent() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-slate-800">Preferences</h1>
        <p className="text-sm text-slate-500">
          Configure the AI provider and model used by Bunny AI generation.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <HelixAIProviderSelector
          table={buiDatabase.aiSettings}
          settingsKey="default"
        />
        <p className="mt-4 text-xs text-slate-400">
          Settings are persisted to the Bunny AI local database. Books, outlines
          and chapter generation all use this provider and model.
        </p>
      </div>
    </div>
  );
}
