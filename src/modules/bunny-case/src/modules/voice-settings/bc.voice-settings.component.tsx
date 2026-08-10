// bc.voice-settings.component.tsx
//
// Voice / Text-to-Speech settings for BunnyCase (feature #3: set a voice for
// client/customer audio and a separate voice for agent audio). Uses the shared
// BCVoiceProvider (must be mounted by the consumer page). Voice selections are
// persisted to localStorage by the provider.

"use client";

import React from "react";
import { Volume2, Mic, Check } from "lucide-react";
import { useBCVoice } from "../trainer/bc.trainer.voice";

function VoicePicker({
  label,
  icon,
  value,
  voices,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  voices: SpeechSynthesisVoice[];
  onChange: (uri: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        {icon}
        {label}
      </div>
      <select
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Browser default</option>
        {voices.map((v) => (
          <option key={v.voiceURI} value={v.voiceURI}>
            {v.name} ({v.lang})
          </option>
        ))}
      </select>
    </div>
  );
}

export default function BCVoiceSettingsComponent() {
  const {
    ttsSupported,
    voices,
    customerVoiceURI,
    agentVoiceURI,
    setCustomerVoiceURI,
    setAgentVoiceURI,
    autoTTS,
    setAutoTTS,
    speakRoleText,
  } = useBCVoice();

  if (!ttsSupported) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <p className="text-sm text-slate-500">
          Text-to-speech is not supported in this browser.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Volume2 className="w-4 h-4 text-emerald-500" />
        <h2 className="text-sm font-semibold text-slate-700">
          Text-to-Speech Voices
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <VoicePicker
          label="Client / Customer voice"
          icon={<Mic className="w-4 h-4 text-rose-500" />}
          value={customerVoiceURI}
          voices={voices}
          onChange={setCustomerVoiceURI}
        />
        <VoicePicker
          label="Agent voice"
          icon={<Volume2 className="w-4 h-4 text-emerald-500" />}
          value={agentVoiceURI}
          voices={voices}
          onChange={setAgentVoiceURI}
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-slate-600">
          Auto-read messages aloud when a new one arrives
        </div>
        <button
          onClick={() => setAutoTTS(!autoTTS)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border ${
            autoTTS
              ? "bg-emerald-50 text-emerald-600 border-emerald-200"
              : "text-slate-500 border-slate-200 hover:bg-slate-50"
          }`}
        >
          {autoTTS ? (
            <Check className="w-4 h-4" />
          ) : (
            <span className="w-4 h-4" />
          )}
          {autoTTS ? "Enabled" : "Disabled"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          onClick={() => speakRoleText("customer", "Hello, this is your customer.")}
          className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-full px-3 py-1.5 hover:bg-rose-100 transition-colors"
        >
          ▶ Test customer voice
        </button>
        <button
          onClick={() => speakRoleText("agent", "Hello, this is your agent.")}
          className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1.5 hover:bg-emerald-100 transition-colors"
        >
          ▶ Test agent voice
        </button>
      </div>

      <p className="text-xs text-slate-400">
        Voice selections are applied to the Simulator, Trainer and Gauntlet.
      </p>
    </div>
  );
}
