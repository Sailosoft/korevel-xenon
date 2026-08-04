/**
 * BSAISettings.Component — UI for configuring the global AI provider + model.
 *
 * Renders a form that lets the user pick a HelixAI provider and a model
 * from that provider's model list. Saved settings persist to IndexedDB
 * and are consumed by chat via the useBSAISettings() hook.
 */

"use client";

import React, { useState } from "react";
import { Card, Button } from "@heroui/react";
import { Save, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import {
  HELIX_PROVIDER_LABELS,
  HELIX_AI_MODELS,
} from "@/src/modules/helix";
import type { HelixAIProvider } from "@/src/modules/helix";
import { useBSAISettings } from "./BSAISettings.Context";

// ─── Save status ──────────────────────────────────────────────────────────

type SaveStatus = "idle" | "saving" | "success" | "error";

// ─── Component ────────────────────────────────────────────────────────────

export function BSAISettingsComponent() {
  const { aiConfig, loading, saveSettings } = useBSAISettings();

  const [provider, setProvider] = useState<HelixAIProvider>(
    aiConfig.provider,
  );
  const [model, setModel] = useState<string>(aiConfig.model);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  // Track the last-seen aiConfig so we can sync local form state when the
  // context loads/changes, using React's render-time adjustment pattern.
  const [prevConfig, setPrevConfig] = useState(aiConfig);

  if (aiConfig !== prevConfig) {
    setPrevConfig(aiConfig);
    setProvider(aiConfig.provider);
    setModel(aiConfig.model);
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
      await saveSettings({ provider, model });
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (err) {
      setSaveStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to save settings",
      );
    }
  };

  // ── Loading state ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Settings</h1>
        <p className="text-gray-500 mt-1">
          Choose the default AI provider and model. Individual chats and
          agents can override these global settings.
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none bg-white"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none bg-white"
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

      {/* Priority note */}
      <Card className="p-4 border-none shadow-sm bg-red-50">
        <p className="text-sm text-red-700">
          <strong>Priority (least → most):</strong> Global AI Settings → Agent
          AI Settings → Conversation AI Settings → Input AI Settings. Leave a
          field empty to inherit from the next lower level.
        </p>
      </Card>
    </div>
  );
}

export default BSAISettingsComponent;
