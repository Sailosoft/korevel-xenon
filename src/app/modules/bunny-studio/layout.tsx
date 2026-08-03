"use client";

import React from "react";
// Bunny Studio module stylesheet (extracted from the app-wide globals.css).
import "@/src/modules/bunny-studio/src/BSStyle.css";
import { BSStudioShell } from "@/src/modules/bunny-studio/src/modules/studio/BSStudioShell";
import { BSAISettingsProvider } from "@/src/modules/bunny-studio/src/modules/ai-settings/BSAISettings.Context";
import { BSVoiceProvider } from "@/src/modules/bunny-studio/src/modules/chat/BSChat.Voice";

export default function BunnyStudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <BSAISettingsProvider>
      <BSVoiceProvider>
        <BSStudioShell>{children}</BSStudioShell>
      </BSVoiceProvider>
    </BSAISettingsProvider>
  );
}
