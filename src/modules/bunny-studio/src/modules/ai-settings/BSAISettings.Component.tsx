/**
 * BSAISettings.Component — UI for configuring the global AI provider + model
 * and the AI-based speech-to-text (STT) provider, model, language, and
 * endpoint override.
 *
 * Renders a form that lets the user pick a HelixAI provider and model, plus
 * the STT provider/model/language/endpoint used for server transcription.
 * Saved settings persist to IndexedDB and are consumed by chat via the
 * useBSAISettings() hook. The browser vs AI mic engine toggle lives on the
 * Configurations page. Individual chats and agents can override these global
 * settings.
 */

"use client";

import React, { useState } from "react";
import { Card, Button } from "@heroui/react";
import { Save, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import {
  HELIX_PROVIDER_LABELS,
  HELIX_AI_MODELS,
  HELIX_STT_MODELS,
  HELIX_STT_PROVIDERS,
} from "@/src/modules/helix";
import type { HelixAIProvider } from "@/src/modules/helix";
import { useBSAISettings } from "./BSAISettings.Context";

// ─── Save status ──────────────────────────────────────────────────────────

type SaveStatus = "idle" | "saving" | "success" | "error";

// ─── Component ────────────────────────────────────────────────────────────

export function BSAISettingsComponent() {
  const { aiConfig, speech, loading, saveAISettings, saveSpeechSettings } =
    useBSAISettings();

  const [provider, setProvider] = useState<HelixAIProvider>(aiConfig.provider);
  const [model, setModel] = useState<string>(aiConfig.model);

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // ── Speech-to-text (AI) form state ────────────────────────────────────────
  const [sttProvider, setSttProvider] = useState<HelixAIProvider>(
    speech.sttProvider,
  );
  const [sttModel, setSttModel] = useState<string>(speech.sttModel);
  const [sttLanguage, setSttLanguage] = useState<string>(speech.sttLanguage);
  const [sttEndpoint, setSttEndpoint] = useState<string>(speech.sttEndpoint);
  const [sttSaveStatus, setSttSaveStatus] = useState<SaveStatus>("idle");
  const [sttErrorMessage, setSttErrorMessage] = useState<string>("");

  // Track the last-seen context value so we can sync local form state when it
  // loads/changes, using React's render-time adjustment pattern.
  const [prevConfig, setPrevConfig] = useState(aiConfig);
  const [prevSpeech, setPrevSpeech] = useState(speech);

  if (aiConfig !== prevConfig) {
    setPrevConfig(aiConfig);
    setProvider(aiConfig.provider);
    setModel(aiConfig.model);
  }

  if (speech !== prevSpeech) {
    setPrevSpeech(speech);
    setSttProvider(speech.sttProvider);
    setSttModel(speech.sttModel);
    setSttLanguage(speech.sttLanguage);
    setSttEndpoint(speech.sttEndpoint);
  }

  // Available models for the currently selected provider
  const availableModels = HELIX_AI_MODELS[provider] ?? [];
  const providerKeys = (Object.keys(
    HELIX_PROVIDER_LABELS,
  ) as HelixAIProvider[]).filter((k) => k !== "default");

  // When the provider changes, auto-select the first available model
  const handleProviderChange = (newProvider: HelixAIProvider) => {
    setProvider(newProvider);
    const models = HELIX_AI_MODELS[newProvider];
    if (models && models.length > 0) {
      setModel(models[0]);
    }
  };

  const handleSave = async () => {
    setSaveStatus("saving");
    setErrorMessage("");

    try {
      await saveAISettings({ provider, model });
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (err) {
      setSaveStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to save settings",
      );
    }
  };

  // ── Speech-to-text (AI) handlers ─────────────────────────────────────

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
    setSttSaveStatus("saving");
    setSttErrorMessage("");

    try {
      await saveSpeechSettings({
        ...speech,
        sttProvider,
        sttModel,
        sttLanguage: sttLanguage.trim(),
        sttEndpoint: sttEndpoint.trim(),
      });
      setSttSaveStatus("success");
      setTimeout(() => setSttSaveStatus("idle"), 2000);
    } catch (err) {
      setSttSaveStatus("error");
      setSttErrorMessage(
        err instanceof Error ? err.message : "Failed to save STT settings",
      );
    }
  };

  // ── Loading state ───────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Settings</h1>
          <p className="text-gray-500 mt-1">
            Choose the default AI provider and model, plus the AI-based
            speech-to-text provider, model, language, and endpoint override.
            Individual chats and agents can override these global settings. The
            browser/AI mic engine toggle lives under Configurations.
          </p>
        </div>

        {/* Provider + Model Selection */}
        <Card className="p-6 border-none shadow-sm">
          <div className="space-y-6">
            {/* Provider Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                AI Provider
              </label>
              <select
                value={provider}
                onChange={(e) =>
                  handleProviderChange(e.target.value as HelixAIProvider)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-red-400 bg-white"
              >
                {providerKeys.map((key) => (
                  <option key={key} value={key}>
                    {HELIX_PROVIDER_LABELS[key]}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1.5">
                The AI backend used for Bunny AI Studio conversations.
              </p>
            </div>

            {/* Model Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Model
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-red-400 bg-white"
              >
                {availableModels.length === 0 && (
                  <option value="">No models available</option>
                )}
                {availableModels.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1.5">
                The specific model to use with the selected provider.
              </p>
            </div>

            {/* Save */}
            <div className="flex items-center gap-3">
              <Button
                onPress={handleSave}
                isDisabled={saveStatus === "saving"}
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
                    Save Settings
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

        {/* Speech-to-Text (AI) settings — provider, model, language, and
            endpoint override. The browser vs AI engine toggle lives on the
            Configurations page. */}
        <Card className="p-6 border-none shadow-sm">
          <div className="space-y-6">
            {/* STT Provider Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
              <p className="text-xs text-gray-400 mt-1.5">
                The provider that exposes an OpenAI-compatible transcription
                endpoint.
              </p>
            </div>

            {/* STT Model Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
              <p className="text-xs text-gray-400 mt-1.5">
                The model used to transcribe audio (e.g. whisper-1).
              </p>
            </div>

            {/* STT Language */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Language (optional)
              </label>
              <input
                value={sttLanguage}
                onChange={(e) => setSttLanguage(e.target.value)}
                placeholder="e.g. en or en-US"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-red-400 bg-white"
              />
              <p className="text-xs text-gray-400 mt-1.5">
                BCP-47 language hint for better recognition accuracy.
              </p>
            </div>

            {/* STT Endpoint Override */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                STT Endpoint Override (optional)
              </label>
              <input
                value={sttEndpoint}
                onChange={(e) => setSttEndpoint(e.target.value)}
                placeholder="https://… — leave empty to use the provider default"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-red-400 bg-white"
              />
              <p className="text-xs text-gray-400 mt-1.5">
                Some providers (e.g. Ollama Cloud) serve transcription from a
                different endpoint than chat.
              </p>
            </div>

            {/* Save STT */}
            <div className="flex items-center gap-3">
              <Button
                onPress={handleSaveStt}
                isDisabled={saveStatus === "saving" || sttSaveStatus === "saving"}
                className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-6"
              >
                {sttSaveStatus === "saving" ? (
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

              {sttSaveStatus === "success" && (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle2 className="w-4 h-4" /> Saved
                </span>
              )}
              {sttSaveStatus === "error" && (
                <span className="flex items-center gap-1 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" /> {sttErrorMessage}
                </span>
              )}
            </div>
          </div>
        </Card>

        {/* Priority note */}
        <Card className="p-4 border-none shadow-sm bg-red-50">
          <p className="text-sm text-red-700">
            <strong>Priority (least → most):</strong> Global AI Settings → Agent
            AI Settings → Conversation AI Settings → Input AI Settings. Leave a
            field empty to inherit from the next lower level.
          </p>
        </Card>
      </div>
    </div>
  );
}

export default BSAISettingsComponent;
