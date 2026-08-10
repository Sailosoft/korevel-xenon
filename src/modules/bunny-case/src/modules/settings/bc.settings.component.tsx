// bc.settings.component.tsx
//
// BCSettingsComponent — Settings panel for BunnyCase:
//  - AI provider/model configuration (Rules: AI Configuration) via the shared
//    HelixAIProviderSelector bound to the BunnyCase Dexie `aiSettings` table.
//  - Simulator "Play All" delay (ms) between turns, persisted to localStorage.
//  - Text-to-Speech voice settings (set a voice for client/customer audio and
//    a separate voice for agent audio).

"use client";

import React, { useCallback, useState } from "react";
import { HelixAIProviderSelector } from "@/src/modules/helix";
import { bcDatabase } from "../../database/bc.database";
import { Settings, Sparkles, Volume2, Timer } from "lucide-react";
import { BCVoiceProvider } from "../trainer/bc.trainer.voice";
import { BCVoiceSettingsComponent } from "../voice-settings";
import {
  BC_PLAY_DELAY_DEFAULT,
  BC_PLAY_DELAY_STORAGE_KEY,
} from "./bc.settings.constants";

export default function BCSettingsComponent() {
  const [playDelay, setPlayDelay] = useState<number>(() => {
    if (typeof window === "undefined") return BC_PLAY_DELAY_DEFAULT;
    const v = Number(window.localStorage.getItem(BC_PLAY_DELAY_STORAGE_KEY));
    return Number.isFinite(v) && v >= 0 ? v : BC_PLAY_DELAY_DEFAULT;
  });

  const updatePlayDelay = useCallback((ms: number) => {
    setPlayDelay(ms);
    try {
      window.localStorage.setItem(BC_PLAY_DELAY_STORAGE_KEY, String(ms));
    } catch {
      /* storage unavailable */
    }
  }, []);

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 md:px-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-400 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-100">
          <Settings className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Settings</h1>
          <p className="text-sm text-slate-400">
            Configure AI, voices and simulator behaviour for Bunny Case.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-emerald-500" />
          <h2 className="text-sm font-semibold text-slate-700">
            Active Provider & Model
          </h2>
        </div>
        <HelixAIProviderSelector
          table={bcDatabase.aiSettings}
          settingsKey="default"
        />
        <p className="text-xs text-slate-400 mt-4">
          Settings are persisted to the BunnyCase local database. The
          simulation, roleplay and gauntlet features all use this provider.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Timer className="w-4 h-4 text-sky-500" />
          <h2 className="text-sm font-semibold text-slate-700">
            Simulator Play All Delay
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={0}
            max={10000}
            step={100}
            value={playDelay}
            onChange={(e) => {
              const v = Number(e.target.value);
              updatePlayDelay(
                Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0,
              );
            }}
            className="w-32 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
          <span className="text-sm text-slate-500">ms</span>
        </div>
        <p className="text-xs text-slate-400 mt-3">
          {"Delay between each turn when you click \"Play All\" in the Conversation Simulator (default 500 ms)."}
        </p>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-emerald-400 rounded-xl flex items-center justify-center shadow-lg shadow-rose-100">
          <Volume2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            Text-to-Speech Voices
          </h1>
          <p className="text-sm text-slate-400">
            Set the voice for the client/customer and the agent.
          </p>
        </div>
      </div>

      <BCVoiceProvider>
        <BCVoiceSettingsComponent />
      </BCVoiceProvider>
    </div>
  );
}
