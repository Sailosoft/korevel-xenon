/**
 * BKAISettingsPage — UI for configuring the AI provider + model.
 *
 * Renders a form that lets the user pick a HelixAI provider and a model
 * from that provider's model list.  Saved settings persist to IndexedDB
 * and are consumed by all server actions via the useAISettings() hook.
 */

"use client";

import React, { useState, useEffect } from "react";
import { Card, Button } from "@heroui/react";
import { Save, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import {
  HELIX_PROVIDER_LABELS,
  HELIX_AI_MODELS,
  isHelixProvider,
} from "@/src/modules/helix";
import type { HelixAIProvider } from "@/src/modules/helix";
import { useAISettings } from "./BKAISettings.Context";
import { BK_AI_SETTINGS_DEFAULTS } from "./BKAISettings.Types";

// ─── Save status ──────────────────────────────────────────────────────────

type SaveStatus = "idle" | "saving" | "success" | "error";

// ─── Component ────────────────────────────────────────────────────────────

export default function BKAISettingsPage() {
  const { aiConfig, loading, saveSettings, reloadSettings } = useAISettings();

  const [provider, setProvider] = useState<HelixAIProvider>(
    aiConfig.provider,
  );
  const [model, setModel] = useState<string>(aiConfig.model);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Sync local form state when context loads / changes
  useEffect(() => {
    setProvider(aiConfig.provider);
    setModel(aiConfig.model);
  }, [aiConfig]);

  // Available models for the currently selected provider
  const availableModels = HELIX_AI_MODELS[provider] ?? [];
  const providerKeys = Object.keys(HELIX_PROVIDER_LABELS).filter(isHelixProvider);

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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Settings</h1>
        <p className="text-gray-500 mt-1">
          Choose which AI provider and model all BunnyAI Thinker server
          actions use.
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
              The AI backend used for all thought generation, thinking
              sessions, and process execution.
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
              The specific model to use with the selected provider. The list
              is filtered to show only models valid for this provider.
            </p>
          </div>
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex items-center gap-3">
        <Button
          variant="primary"
          onPress={handleSave}
          isDisabled={saveStatus === "saving"}
          className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          {saveStatus === "saving" ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Saving...
            </>
          ) : (
            <>
              <Save size={16} /> Save Settings
            </>
          )}
        </Button>

        {/* Status feedback */}
        {saveStatus === "success" && (
          <span className="flex items-center gap-1.5 text-sm text-green-600">
            <CheckCircle2 size={16} /> Saved
          </span>
        )}
        {saveStatus === "error" && (
          <span className="flex items-center gap-1.5 text-sm text-red-600">
            <AlertCircle size={16} /> {errorMessage || "Save failed"}
          </span>
        )}
      </div>

      {/* Current Configuration Summary */}
      <Card className="p-4 border-none shadow-sm bg-purple-50 border border-purple-100">
        <h3 className="text-sm font-semibold text-purple-900 mb-2">
          Current AI Configuration
        </h3>
        <div className="space-y-1 text-sm text-purple-800">
          <p>
            <span className="font-medium">Provider:</span>{" "}
            {HELIX_PROVIDER_LABELS[provider] ?? provider}
          </p>
          <p>
            <span className="font-medium">Model:</span> {model}
          </p>
        </div>
        <p className="text-xs text-purple-600 mt-3">
          This configuration is used by all BunnyAI Thinker server actions:
          think sessions, process execution, and AI-assisted generation.
        </p>
      </Card>
    </div>
  );
}
