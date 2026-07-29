"use client";

import React, { Suspense } from "react";

import BUIDocumentShell from "@/src/modules/bunny-ai/src/modules/document-shell/bui.document-shell";
import { BKAISettingsProvider } from "@/src/modules/bunny-thinker/src/ai-settings/BKAISettings.Context";
import { BKDocumentShell } from "@/src/modules/bunny-thinker/src/components/BKDocumentShell";


// ── Layout ───────────────────────────────────────────────────────────────

export default function BunnyThinkerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="h-screen bg-[#f8fafc] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <BKAISettingsProvider>
        <BKDocumentShell>
          {children}
        </BKDocumentShell>
      </BKAISettingsProvider>
    </Suspense>
  );
}
