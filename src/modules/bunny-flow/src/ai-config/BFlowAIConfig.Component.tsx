"use client";

import Bunny from "@/src/modules/bunny/src/Bunny";
import BunnyForm from "@/src/modules/bunny/src/form/BunnyForm";
import { bflowGlobalAIConfigModule } from "./BFlowGlobalAIConfig";
import { bflowFlowAIConfigModule } from "./BFlowFlowAIConfig";
import { bflowPipelineAIConfigModule } from "./BFlowPipelineAIConfig";

// ─── Global AI Config Component ────────────────────────────────────

export function BFlowGlobalAIConfigComponent() {
  return (
    <Bunny config={bflowGlobalAIConfigModule}>
      <BunnyForm />
    </Bunny>
  );
}

// ─── Flow AI Config Component ──────────────────────────────────────

export function BFlowFlowAIConfigComponent() {
  return (
    <Bunny config={bflowFlowAIConfigModule}>
      <BunnyForm />
    </Bunny>
  );
}

// ─── Pipeline AI Config Component ──────────────────────────────────

export function BFlowPipelineAIConfigComponent() {
  return (
    <Bunny config={bflowPipelineAIConfigModule}>
      <BunnyForm />
    </Bunny>
  );
}
