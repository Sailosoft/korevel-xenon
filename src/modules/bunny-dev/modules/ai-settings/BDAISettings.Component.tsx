"use client";

// BDAISettings.Component — global AI provider/model configuration UI.
//
// Reuses Helix's HelixAIProviderSelector (which persists straight to the
// `aiSettings` singleton) so the AI backend is configured in one place and
// consumed by every sub-module's generation panel.

import { Save, CheckCircle2, Brain } from "lucide-react";
import { useState } from "react";
import { HelixAIProviderSelector } from "@/src/modules/helix";
import { bdDB } from "../../BDDatabase";
import BDPageHeader from "../../components/BDPageHeader";
import BDButton from "../../components/BDButton";
import { BD_AI_SETTINGS_KEY } from "./BDAISettings.Types";
import { useBDAISettings } from "./BDAISettings.Context";

export function BDAISettingsComponent() {
  const { aiConfig, reload } = useBDAISettings();
  const [saved, setSaved] = useState(false);

  const handleRefresh = async () => {
    await reload();
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <BDPageHeader
        icon={Brain}
        title="AI Settings"
        description="Choose the global Helix provider and model used by every BunnyDev AI generation action. Individual projects may override this under Project Settings."
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-800">
          Global Provider
        </h2>
        <HelixAIProviderSelector
          table={bdDB.aiSettings}
          settingsKey={BD_AI_SETTINGS_KEY}
        />

        <div className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-4">
          <span className="text-xs text-slate-500">
            Current: <strong>{aiConfig.provider}</strong> / {aiConfig.model}
          </span>
          <BDButton size="sm" variant="secondary" icon={Save} onClick={handleRefresh}>
            Sync
          </BDButton>
          {saved && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <CheckCircle2 className="h-3.5 w-3.5" /> Synced
            </span>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-blue-50 p-4 text-sm text-blue-700">
        Settings are stored locally in IndexedDB. All BunnyDev data — projects,
        schemas, apps, and generated artifacts — is local-first.
      </div>
    </div>
  );
}

export default BDAISettingsComponent;
