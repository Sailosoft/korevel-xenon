"use client";

import { useCallback, useEffect, useState } from "react";
import { Input, Select, ListBox, Label } from "@heroui/react";
import Bunny from "@/src/modules/bunny/src/Bunny";
import { buiSettingsModule } from "./bui.settings.module";
import { BUISetting } from "./bui.settings.entity";
import { BUIAIProvider } from "@/src/modules/bunny-ai/src/modules/ai/bui.ai.interface";
import { BUI_AI_MODELS } from "@/src/modules/bunny-ai/src/configs/bui.config.ai";
import { buiDatabase } from "../../database/bui.database";
import { useAdminPanelContext } from "@/src/modules/admin-panel/features/provider";

/** Human-readable labels for each provider */
const PROVIDER_LABELS: Record<BUIAIProvider, string> = {
  default: "Default (OpenAI-compatible)",
  ollamaLocal: "Ollama (Local)",
  ollamaCloud: "Ollama Cloud",
  deepseek: "DeepSeek",
  groq: "Groq",
  openai: "OpenAI",
  openRouter: "OpenRouter",
  deepinfra: "DeepInfra",
};

/** Type guard to check if a string is a valid BUIAIProvider */
function isProvider(value: string): value is BUIAIProvider {
  return (Object.keys(BUI_AI_MODELS) as BUIAIProvider[]).includes(
    value as BUIAIProvider,
  );
}

/**
 * Custom form for BUI Settings built with HeroUI Input & Select components.
 * Replaces the previous BunnyForm + formConfig approach.
 */
function BUISettingsForm() {
  const { form, modal } = useAdminPanelContext<BUISetting, BUISetting>();
  const [currentProvider, setCurrentProvider] =
    useState<BUIAIProvider>("default");

  // Load the persisted provider setting so the model dropdown stays in sync
  useEffect(() => {
    buiDatabase.settings.get("ai_provider").then((setting) => {
      if (setting?.value && isProvider(setting.value)) {
        setCurrentProvider(setting.value as BUIAIProvider);
      }
    });
  }, []);

  // Sync currentProvider when the form's ai_provider value changes
  useEffect(() => {
    if (form.formData?.value && isProvider(form.formData.value as string)) {
      setCurrentProvider(form.formData.value as BUIAIProvider);
    }
  }, [form.formData?.value]);

  const editingId = modal.id as string | undefined;
  const loadedId = form.formData?.id as string | undefined;
  const canRender = !editingId || loadedId === editingId;
  const activeKey = loadedId;
  const models = BUI_AI_MODELS[currentProvider] ?? BUI_AI_MODELS.default;

  // If the saved model doesn't belong to the current provider, reset to the first model
  useEffect(() => {
    if (activeKey === "default_ai_model") {
      const savedValue = form.formData?.value as string | undefined;
      if (savedValue && !models.includes(savedValue)) {
        setTimeout(() => {
          form.setFormData({
            ...form.formData,
            value: models[0],
          });
        }, 0);
      }
    }
  }, [currentProvider, activeKey]);

  // ── Guard: data hasn't loaded for the currently-edited setting yet ─────────
  // `formData` retains stale values from a previous modal session while
  // `loadData()` is still resolving — skip rendering until it matches `modal.id`.
  if (!canRender) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Label>Setting Name</Label>
          <Input value="" disabled />
        </div>
      </div>
    );
  }

  const providerOptions = (Object.keys(BUI_AI_MODELS) as BUIAIProvider[]).map(
    (p) => ({
      label: PROVIDER_LABELS[p] ?? p,
      value: p,
    }),
  );

  return (
    <div className="flex flex-col gap-4">
      {/* "Setting Name" — always disabled since it's pre-defined */}
      <div className="flex flex-col gap-1">
        <Label>Setting Name</Label>
        <Input value={form.formData?.label ?? ""} disabled />
      </div>

      {activeKey === "ai_provider" && (
        <div className="flex flex-col gap-1">
          <Label>Value</Label>
          <Select
            aria-label="Value"
            placeholder="Select an AI provider"
            value={(form.formData?.value as string) ?? ""}
            onChange={(key) => {
              if (key) form.handleChange("value", key);
            }}
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {providerOptions.map((opt) => (
                  <ListBox.Item
                    key={opt.value}
                    textValue={opt.label}
                    id={opt.value}
                  >
                    {opt.label}
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        </div>
      )}

      {activeKey === "default_ai_model" && (
        <div className="flex flex-col gap-1">
          <Label>Value</Label>
          <Select
            aria-label="Value"
            placeholder="Select a model"
            value={(form.formData?.value as string) ?? ""}
            onChange={(key) => {
              if (key) form.handleChange("value", key);
            }}
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {models.map((m) => (
                  <ListBox.Item key={m} textValue={m} id={m}>
                    {m}
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        </div>
      )}

      {activeKey !== "ai_provider" && activeKey !== "default_ai_model" && (
        <div className="flex flex-col gap-1">
          <Label>Value</Label>
          <Input
            placeholder="Enter value"
            value={form.formData?.value ?? ""}
            onChange={(e) => form.handleChange("value", e.target.value)}
          />
        </div>
      )}
    </div>
  );
}

export default function BUISettingsComponent() {
  return (
    <Bunny config={buiSettingsModule}>
      <BUISettingsForm />
    </Bunny>
  );
}
