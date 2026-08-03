// BSChat.SettingsPanel — Conversation-level AI settings + agent + render type.
//
// Implements the AIChatSettings + AIAgent + RenderingConversation features:
//  - User can override the global AI provider/model at conversation level.
//  - User can select an AI Agent (persona + optional provider/model).
//  - User can pick a render type for the conversation output.

"use client";

import React, { useMemo, useState } from "react";
import {
  Rabbit,
  Settings2,
  Eye,
  Wand2,
  X,
  Volume2,
  AudioLines,
} from "lucide-react";
import { useBSVoice } from "./BSChat.Voice";
import {
  HELIX_PROVIDER_LABELS,
  HELIX_AI_MODELS,
  isHelixProvider,
} from "@/src/modules/helix";
import type { HelixAIProvider } from "@/src/modules/helix";
import { RenderFormats } from "@/src/modules/render";
import type { RenderFormat } from "@/src/modules/render";
import type { BSAgent } from "../agents/BSAgent.Types";

// ─── Props ─────────────────────────────────────────────────────────────

export interface BSChatSettingsPanelProps {
  /** Global AI settings (used as defaults / fallback display) */
  globalProvider: HelixAIProvider;
  globalModel: string;
  /** Chat-level overrides (persisted on the chat record) */
  provider?: HelixAIProvider;
  model?: string;
  agentId?: string;
  contentType?: RenderFormat;
  /** Chat-level TTS override (undefined = inherit the global setting) */
  voiceURI?: string;
  /** Chat-level auto-TTS override (undefined = inherit the global setting) */
  autoTTS?: boolean;
  /** Available agents for selection */
  agents: BSAgent[];
  /** Called with the selected agent (or null) */
  onAgentChange?: (agent: BSAgent | null) => void;
  /** Called with a new provider/model override (or undefined to inherit) */
  onProviderModelChange?: (provider: HelixAIProvider, model: string) => void;
  /** Called when render type changes */
  onContentTypeChange?: (format: RenderFormat | undefined) => void;
  /** Called when the chat-level voice changes (undefined = inherit global) */
  onVoiceChange?: (uri: string | undefined) => void;
  /** Called when the chat-level auto-TTS changes (undefined = inherit global) */
  onAutoTTSChange?: (value: boolean | undefined) => void;
}

// ─── Component ─────────────────────────────────────────────────────────

export function BSChatSettingsPanel({
  globalProvider,
  globalModel,
  provider,
  model,
  agentId,
  contentType,
  voiceURI,
  autoTTS,
  agents,
  onAgentChange,
  onProviderModelChange,
  onContentTypeChange,
  onVoiceChange,
  onAutoTTSChange,
}: BSChatSettingsPanelProps) {
  const [open, setOpen] = useState(false);
  const {
    ttsSupported,
    voices,
    voiceURI: globalVoiceURI,
    autoTTS: globalAutoTTS,
  } = useBSVoice();

  // Effective TTS — chat-level override wins over the global setting.
  const effectiveAutoTTS = autoTTS ?? globalAutoTTS;

  // Local override state (empty = inherit from global)
  const [overrideProvider, setOverrideProvider] = useState<
    HelixAIProvider | ""
  >(provider ?? "");
  const [overrideModel, setOverrideModel] = useState<string>(model ?? "");
  // Track the last-seen provider/model so we sync override state via
  // render-time adjustment when the chat record changes.
  const [prevOverride, setPrevOverride] = useState<{
    provider?: HelixAIProvider;
    model?: string;
  }>({ provider, model });

  if (provider !== prevOverride.provider || model !== prevOverride.model) {
    setPrevOverride({ provider, model });
    setOverrideProvider(provider ?? "");
    setOverrideModel(model ?? "");
  }

  const modelsForOverride = useMemo(() => {
    if (!overrideProvider) return [];
    return HELIX_AI_MODELS[overrideProvider] ?? [];
  }, [overrideProvider]);

  const selectedAgent = agents.find((a) => a.id === agentId) ?? null;
  const agentProvider = selectedAgent?.provider;
  const agentModel = selectedAgent?.model;

  // Effective display config (global → agent → conversation)
  const effectiveProvider: HelixAIProvider =
    (overrideProvider && isHelixProvider(overrideProvider)
      ? overrideProvider
      : null) ||
    agentProvider ||
    globalProvider;
  const effectiveModel =
    overrideModel || agentModel || globalModel;

  const handleProviderOverride = (value: string) => {
    if (!value) {
      setOverrideProvider("");
      setOverrideModel("");
      onProviderModelChange?.("default", "");
      return;
    }
    const p = value as HelixAIProvider;
    setOverrideProvider(p);
    const firstModel = HELIX_AI_MODELS[p]?.[0] ?? "";
    setOverrideModel(firstModel);
    onProviderModelChange?.(p, firstModel);
  };

  const handleModelOverride = (value: string) => {
    setOverrideModel(value);
    if (overrideProvider) {
      onProviderModelChange?.(overrideProvider, value);
    }
  };

  const handleAgentSelect = (agent: BSAgent | null) => {
    onAgentChange?.(agent);
  };

  return (
    <div className="relative">
      {/* Toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs text-gray-600 hover:border-red-300 hover:text-red-600 transition shadow-sm"
      >
        <Settings2 className="w-3.5 h-3.5" />
        Settings
      </button>

      {open && (
        // z-[100] keeps the popup above the conversation area, chat input, and
        // other overlays (fix: chat settings z-index issue).
        <div className="absolute right-0 top-10 z-[100] w-80 max-h-[80vh] overflow-y-auto bg-white border border-gray-200 rounded-2xl shadow-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">
              Conversation Settings
            </h3>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Agent selection */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1.5">
              <Rabbit className="w-3.5 h-3.5" /> AI Agent
            </label>
            <select
              value={selectedAgent?.id ?? ""}
              onChange={(e) =>
                handleAgentSelect(
                  e.target.value ? agents.find((a) => a.id === e.target.value) ?? null : null,
                )
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-red-400 bg-white"
            >
              <option value="">No agent (default)</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            {selectedAgent && (
              <p className="text-[10px] text-gray-400 mt-1 line-clamp-2">
                {selectedAgent.persona}
              </p>
            )}
          </div>

          {/* Provider override */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1.5">
              <Wand2 className="w-3.5 h-3.5" /> Provider Override
            </label>
            <select
              value={overrideProvider}
              onChange={(e) => handleProviderOverride(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-red-400 bg-white"
            >
              <option value="">Inherit (global)</option>
              {(Object.keys(HELIX_PROVIDER_LABELS) as HelixAIProvider[])
                .filter((p) => p !== "default")
                .map((p) => (
                  <option key={p} value={p}>
                    {HELIX_PROVIDER_LABELS[p]}
                  </option>
                ))}
            </select>
          </div>

          {/* Model override */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1.5">
              <Settings2 className="w-3.5 h-3.5" /> Model Override
            </label>
            <select
              value={overrideModel}
              onChange={(e) => handleModelOverride(e.target.value)}
              disabled={!overrideProvider || modelsForOverride.length === 0}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-red-400 bg-white disabled:opacity-50"
            >
              {!overrideProvider && <option value="">Inherit (global)</option>}
              {modelsForOverride.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Render type */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1.5">
              <Eye className="w-3.5 h-3.5" /> Render Type
            </label>
            <select
              value={contentType ?? ""}
              onChange={(e) =>
                onContentTypeChange?.(
                  e.target.value
                    ? (e.target.value as RenderFormat)
                    : undefined,
                )
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-red-400 bg-white"
            >
              <option value="">No render</option>
              {RenderFormats.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          {/* Voice Settings (feature) — per-chat override, falls back to the
              global setting (configured in the Configurations page). */}
          <div>
            <label className="flex items-center justify-between gap-2 text-xs font-medium text-gray-700 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5" /> Voice
              </span>
              {voiceURI !== undefined && (
                <button
                  onClick={() => onVoiceChange?.(undefined)}
                  className="text-[10px] text-red-500 hover:underline"
                >
                  Use global
                </button>
              )}
            </label>
            {ttsSupported ? (
              <select
                value={voiceURI ?? ""}
                onChange={(e) => onVoiceChange?.(e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-red-400 bg-white"
              >
                <option value="">
                  {globalVoiceURI
                    ? `Use global (${globalVoiceURI})`
                    : "Use global (browser default)"}
                </option>
                {voices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-[11px] text-gray-400">
                Text-to-speech is not supported by this browser.
              </p>
            )}
          </div>

          {/* Auto text-to-speech toggle (feature) — per-chat override */}
          {ttsSupported && (
            <div>
              <label className="flex items-center justify-between gap-2 text-xs font-medium text-gray-700">
                <span className="flex items-center gap-1.5">
                  <AudioLines className="w-3.5 h-3.5" /> Auto Text-to-Speech
                </span>
                <div className="flex items-center gap-2">
                  {autoTTS !== undefined && (
                    <button
                      onClick={() => onAutoTTSChange?.(undefined)}
                      className="text-[10px] text-red-500 hover:underline"
                    >
                      Use global
                    </button>
                  )}
                  <button
                    role="switch"
                    aria-checked={effectiveAutoTTS}
                    onClick={() => onAutoTTSChange?.(!effectiveAutoTTS)}
                    className={`relative w-10 h-5 rounded-full transition ${
                      effectiveAutoTTS ? "bg-red-600" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                        effectiveAutoTTS ? "left-[22px]" : "left-[2px]"
                      }`}
                    />
                  </button>
                </div>
              </label>
              <p className="text-[10px] text-gray-400 mt-1">
                {autoTTS !== undefined
                  ? `This chat overrides the global setting (global: ${
                      globalAutoTTS ? "on" : "off"
                    }).`
                  : `Global setting: ${globalAutoTTS ? "on" : "off"}.`}
              </p>
            </div>
          )}

          {/* Effective config */}
          <div className="bg-red-50 rounded-xl px-3 py-2.5 text-[11px] text-red-700">
            <div className="font-medium mb-0.5">Effective AI Config</div>
            <div>
              {effectiveProvider} · {effectiveModel || "(no model)"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BSChatSettingsPanel;
