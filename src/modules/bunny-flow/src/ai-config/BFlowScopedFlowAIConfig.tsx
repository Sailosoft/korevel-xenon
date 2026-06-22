"use client";

import Bunny from "@/src/modules/bunny/src/Bunny";
import BunnyForm from "@/src/modules/bunny/src/form/BunnyForm";
import { bflowFlowAIConfigModule } from "./BFlowFlowAIConfig";
import { createScopedBunnyConfig } from "../flow/BFlowScopedModule";
import type { BFlowFlowAIConfigEntity } from "./BFlowAIConfig.Types";

/**
 * Scoped flow AI config component.
 * Automatically filters AI configs to only show those belonging to
 * the specified flow definition, and injects the flowId on create.
 */
export default function BFlowScopedFlowAIConfig({
  flowId,
}: {
  flowId: string;
}) {
  const scopedModule = createScopedBunnyConfig<
    BFlowFlowAIConfigEntity,
    BFlowFlowAIConfigEntity
  >(bflowFlowAIConfigModule, "flowId", flowId);

  return (
    <Bunny config={scopedModule}>
      <BunnyForm />
    </Bunny>
  );
}
