// BSConfigurations.Component — Studio configurations.
//
// Provides an overview of the app's AI provider configuration, the GLOBAL
// text-to-speech settings (voice + auto-TTS, feature), the GLOBAL speech-to-text
// settings (browser vs AI server transcription, feature), and quick links.
// Uses the red theme (feature: red theme instead of violet).

"use client";

import React, { useState } from "react";
import { Card, Button } from "@heroui/react";
import {
  Wrench,
  Cpu,
  KeyRound,
  FileText,
  Volume2,
  AudioLines,
  Mic,
  Globe,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  HELIX_PROVIDER_LABELS,
  HELIX_STT_MODELS,
  HELIX_STT_PROVIDERS,
} from "@/src/modules/helix";
import type { HelixAIProvider } from "@/src/modules/helix";
import { useBSAISettings } from "../ai-settings/BSAISettings.Context";
import type { BSSttMode } from "../ai-settings/BSAISettings.Types";
import { useBSVoice } from "../chat/BSChat.Voice";
import Link from "next/link";

// ─── Save status ──────────────────────────────────────────────────────────

type SaveStatus = "idle" | "saving" | "success" | "error";

// ─── Component ────────────────────────────────────────────────────────────

export function BSConfigurationsComponent() {
  const { aiConfig, speech, loading, saveSpeechSettings } = useBSAISettings();
  const { ttsSupported, voices, voiceURI, setVoiceURI, autoTTS, setAutoTTS } =
    useBSVoice();

  // ── Speech-to-text form state ────────────────────────────────────────────
  const [sttMode, setSttMode] = useState<BSSttMode>(speech.sttMode);
  const [sttProvider, setSttProvider] = useState<HelixAIProvider>(
    speech.sttProvider,
  );
  const [sttModel, setSttModel] = useState<string>(speech.sttModel);
  const [sttLanguage, setSttLanguage] = useState<string>(speech.sttLanguage);
  const [sttEndpoint, setSttEndpoint] = useState<string>(speech.sttEndpoint);

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  // Track the last-seen context value so we can sync local form state when it
  // loads/changes, using React's render-time adjustment pattern.
  const [prevSpeech, setPrevSpeech] = useState(speech);

  if (speech !== prevSpeech) {
    setPrevSpeech(speech);
    setSttMode(speech.sttMode);
    setSttProvider(speech.sttProvider);
    setSttModel(speech.sttModel);
    setSttLanguage(speech.sttLanguage);
    setSttEndpoint(speech.sttEndpoint);
  }

  // STT providers that expose at least one selectable model
  const sttProviderKeys = HELIX_STT_PROVIDERS;
  const sttModels = HELIX_STT_MODELS[sttProvider] ?? [];

  // When the STT provider changes, auto-select the first STT model
  const handleSttProviderChange = (newProvider: HelixAIProvider) => {
    setSttProvider(newProvider);
    const models = HELIX_STT_MODELS[newProvider];
    if (models && models.length > 0) {
      setSttModel(models[0]);
    }
  };

  const handleSaveStt = async () => {
    setSaveStatus("saving");
    setErrorMessage("");

    try {
      await saveSpeechSettings({
        sttMode,
        sttProvider,
        sttModel,
        sttLanguage: sttLanguage.trim(),
        sttEndpoint: sttEndpoint.trim(),
      });
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (err) {
      setSaveStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to save STT settings",
      );
    }
  };

  const items = [
    {
      icon: <Cpu className="w-4 h-4" />,
      title: "AI Provider & Model",
      value: `${aiConfig.provider} · ${aiConfig.model || "(none)"}`,
      href: "/modules/bunny-studio/ai-settings",
      action: "Configure",
    },
    {
      icon: <KeyRound className="w-4 h-4" />,
      title: "BYOK Streaming",
      value: "Vercel AI SDK v7 · OpenAI-compatible",
      href: "#",
      action: "Info",
    },
    {
      icon: <FileText className="w-4 h-4" />,
      title: "Documentation",
      value: "Read the module docs",
      href: "#",
      action: "Docs",
    },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configurations</h1>
          <p className="text-gray-500 mt-1">
            Bunny AI Studio configuration overview — voice, speech-to-text, and
            AI provider defaults.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item) => (
            <Card
              key={item.title}
              className="p-5 border-none shadow-sm hover:shadow-md transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                    {item.icon}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800 text-sm">
                      {item.title}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5 break-all">
                      {item.value}
                    </div>
                  </div>
                </div>
              </div>
              {item.href !== "#" ? (
                <Link
                  href={item.href}
                  className="inline-block mt-3 text-xs font-medium text-red-600 hover:text-red-700"
                >
                  {item.action} →
                </Link>
              ) : (
                <div className="inline-block mt-3 text-xs font-medium text-gray-400">
                  {item.action}
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* Global Text-to-Speech settings (feature) — used as the default for
            every chat; individual chats may override these. */}
        <Card className="p-5 border-none shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
              <Volume2 className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-gray-800 text-sm">
                Text-to-Speech
              </div>
              <div className="text-xs text-gray-400">
                Global TTS defaults — chats inherit these unless overridden.
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1.5">
                <Volume2 className="w-3.5 h-3.5" /> Voice
              </label>
              {ttsSupported ? (
                <select
                  value={voiceURI}
                  onChange={(e) => setVoiceURI(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-red-400 bg-white"
                >
                  <option value="">Browser default</option>
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

            {ttsSupported && (
              <div>
                <label className="flex items-center justify-between gap-2 text-xs font-medium text-gray-700">
                  <span className="flex items-center gap-1.5">
                    <AudioLines className="w-3.5 h-3.5" /> Auto Text-to-Speech
                  </span>
                  <button
                    role="switch"
                    aria-checked={autoTTS}
                    onClick={() => setAutoTTS(!autoTTS)}
                    className={`relative w-10 h-5 rounded-full transition ${
                      autoTTS ? "bg-red-600" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                        autoTTS ? "left-[22px]" : "left-[2px]"
                      }`}
                    />
                  </button>
                </label>
                <p className="text-[10px] text-gray-400 mt-1">
                  Automatically read assistant messages aloud (plain text).
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Global Speech-to-Text settings (feature: browser vs AI STT) — used as
            the default for every chat mic; individual chats may override these. */}
        <Card className="p-5 border-none shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-gray-800 text-sm">
                Speech-to-Text (Mic Input)
              </div>
              <div className="text-xs text-gray-400">
                Global STT defaults — chats inherit these unless overridden.
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            {/* STT engine toggle */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                STT Engine
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setSttMode("browser")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm transition ${
                    sttMode === "browser"
                      ? "border-red-400 bg-red-50 text-red-600 font-medium"
                      : "border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-600"
                  }`}
                >
                  <Globe className="w-4 h-4" /> Browser (on-device)
                </button>
                <button
                  onClick={() => setSttMode("ai")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm transition ${
                    sttMode === "ai"
                      ? "border-red-400 bg-red-50 text-red-600 font-medium"
                      : "border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-600"
                  }`}
                >
                  <Cpu className="w-4 h-4" /> AI (server transcription)
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-1.5">
                {sttMode === "browser"
                  ? "Uses the builtin Web Speech API — free and on-device, no audio leaves the browser."
                  : "Records audio and transcribes it with your AI provider (uses API tokens)."}
              </p>
            </div>

            {/* AI-specific settings */}
            {sttMode === "ai" && (
              <>
                {/* STT Provider Select */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    STT Provider
                  </label>
                  <select
                    value={sttProvider}
                    onChange={(e) =>
                      handleSttProviderChange(e.target.value as HelixAIProvider)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-red-400 bg-white"
                  >
                    {sttProviderKeys.map((key) => (
                      <option key={key} value={key}>
                        {HELIX_PROVIDER_LABELS[key] ?? key}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-gray-400 mt-1">
                    The provider that exposes an OpenAI-compatible transcription
                    endpoint.
                  </p>
                </div>

                {/* STT Model Select */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    STT Model
                  </label>
                  <select
                    value={sttModel}
                    onChange={(e) => setSttModel(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-red-400 bg-white"
                  >
                    {sttModels.length === 0 && (
                      <option value="">No models available</option>
                    )}
                    {sttModels.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-gray-400 mt-1">
                    The model used to transcribe audio (e.g. whisper-1).
                  </p>
                </div>

                {/* STT Language */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Language (optional)
                  </label>
                  <input
                    value={sttLanguage}
                    onChange={(e) => setSttLanguage(e.target.value)}
                    placeholder="e.g. en or en-US"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-red-400 bg-white"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    BCP-47 language hint for better recognition accuracy.
                  </p>
                </div>

                {/* STT Endpoint Override */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    STT Endpoint Override (optional)
                  </label>
                  <input
                    value={sttEndpoint}
                    onChange={(e) => setSttEndpoint(e.target.value)}
                    placeholder="https://… — leave empty to use the provider default"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-red-400 bg-white"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Some providers (e.g. Ollama Cloud) serve transcription from
                    a different endpoint than chat.
                  </p>
                </div>
              </>
            )}

            {/* Save */}
            <div className="flex items-center gap-3">
              <Button
                onPress={handleSaveStt}
                isDisabled={loading || saveStatus === "saving"}
                className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-6"
              >
                {saveStatus === "saving" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save STT Settings
                  </>
                )}
              </Button>

              {saveStatus === "success" && (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle2 className="w-4 h-4" /> Saved
                </span>
              )}
              {saveStatus === "error" && (
                <span className="flex items-center gap-1 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" /> {errorMessage}
                </span>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-5 border-none shadow-sm bg-red-50">
          <div className="flex items-start gap-3">
            <Wrench className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
            <div>
              <div className="font-semibold text-red-800 text-sm">
                AI Priority (least → most)
              </div>
              <p className="text-xs text-red-700 mt-1">
                AISettings (Global) → Agent AI Settings → Conversation AI
                Settings → Input AI Settings. Each level may override the one
                below it.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default BSConfigurationsComponent;
