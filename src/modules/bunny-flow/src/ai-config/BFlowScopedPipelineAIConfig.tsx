"use client";

import Bunny from "@/src/modules/bunny/src/Bunny";
import BunnyForm from "@/src/modules/bunny/src/form/BunnyForm";
import { bflowPipelineAIConfigModule } from "./BFlowPipelineAIConfig";
import { createScopedBunnyConfig } from "../flow/BFlowScopedModule";
import type { BFlowPipelineAIConfigEntity } from "./BFlowAIConfig.Types";

/**
 * Scoped pipeline AI config component.
 * Automatically filters AI configs to only show those belonging to
 * the specified pipeline, and injects the pipelineId on create.
 */
export default function BFlowScopedPipelineAIConfig({
  pipelineId,
}: {
  pipelineId: string;
}) {
  const scopedModule = createScopedBunnyConfig<
    BFlowPipelineAIConfigEntity,
    BFlowPipelineAIConfigEntity
  >(bflowPipelineAIConfigModule, "pipelineId", pipelineId);

  return (
    <Bunny config={scopedModule}>
      <BunnyForm />
    </Bunny>
  );
}
