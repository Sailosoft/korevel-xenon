"use client";

import Bunny from "@/src/modules/bunny/src/Bunny";
import BunnyForm from "@/src/modules/bunny/src/form/BunnyForm";
import { buiSettingsModule } from "./bui.settings.module";
import { BUISetting } from "./bui.settings.entity";
import { UseAdminPanel } from "@/src/modules/admin-panel/admin-panel.interface";
import { BunnyConfig } from "@/src/modules/bunny/src/Bunny.Interface";

export default function BUISettingsComponent() {
  const customizeSettings = (
    admin: UseAdminPanel<BUISetting, BUISetting>,
    baseConfig: BunnyConfig<BUISetting, BUISetting>,
  ) => {
    const activeKey = admin.form.formData?.key;

    let valueField;
    if (activeKey === "ai_provider") {
      valueField = {
        name: "value",
        label: "Value",
        type: "select" as const,
        options: [
          { label: "Google Vertex/Gemini", value: "google" },
          { label: "OpenAI", value: "openai" },
          { label: "Anthropic", value: "anthropic" },
        ],
        rules: [
          {
            rule: "required" as const,
            message: "AI Provider is required",
          },
        ],
      };
    } else if (activeKey === "default_ai_model") {
      valueField = {
        name: "value",
        label: "Value",
        type: "select" as const,
        options: [
          { label: "Gemini 1.5 Flash", value: "gemini-1.5-flash" },
          { label: "Gemini 1.5 Pro", value: "gemini-1.5-pro" },
          { label: "GPT-4o", value: "gpt-4o" },
          { label: "Claude 3.5 Sonnet", value: "claude-3-5-sonnet" },
        ],
        rules: [
          {
            rule: "required" as const,
            message: "Default AI Model is required",
          },
        ],
      };
    } else {
      valueField = {
        name: "value",
        label: "Value",
        type: "text" as const,
        rules: [
          {
            rule: "required" as const,
            message: "Value is required",
          },
        ],
      };
    }

    return {
      formConfig: {
        fields: [
          {
            name: "label",
            label: "Setting Name",
            type: "text" as const,
            disabled: true,
          },
          valueField,
        ],
      },
    };
  };

  return (
    <Bunny config={buiSettingsModule} customize={customizeSettings}>
      <BunnyForm />
    </Bunny>
  );
}
