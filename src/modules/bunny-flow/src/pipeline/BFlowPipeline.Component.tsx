"use client";

/**
 * BFlowPipelineComponent — Pipeline CRUD listing view.
 *
 * Renders the pipeline management interface using the Bunny framework.
 * Supports an optional `promptBuilderKind` prop to pre‑configure the
 * prompt builder strategy for pipelines created from this component.
 *
 * The strategy is stored in the pipeline entity's `metadata.promptBuilderKind`
 * and read at runtime by the pipeline execution hook to select between the
 * fluent section‑based builder (default) and the Handlebars‑driven TemplateBar.
 *
 * ## Usage
 *
 * ```tsx
 * // Default (section builder)
 * <BFlowPipelineComponent />
 *
 * // TemplateBar (Handlebars‑driven) — useful when prompts are complex
 * // and benefit from declarative template syntax
 * <BFlowPipelineComponent promptBuilderKind="templatebar" />
 * ```
 */

import Bunny from "@/src/modules/bunny/src/Bunny";
import BunnyForm from "@/src/modules/bunny/src/form/BunnyForm";
import { bflowPipelineModule } from "./BFlowPipeline";
import { BFlowPromptBuilderKind } from "../run/BFlowRun.Prompt.Types";

export interface BFlowPipelineComponentOptions {
  /**
   * The prompt builder strategy to use when running pipelines created
   * from this module. Stored in the pipeline entity's metadata so the
   * execution hook can select the correct builder at runtime.
   *
   * @default BFlowPromptBuilderKind.Section
   */
  promptBuilderKind?: BFlowPromptBuilderKind;
}

export default function BFlowPipelineComponent(
  options?: BFlowPipelineComponentOptions,
) {
  // Inject the promptBuilderKind into the pipeline module's config so that
  // newly created pipelines store the strategy in their metadata, and the
  // execution hook (BFlowRun.Hooks.Submit) picks it up at run time.
  const config =
    options?.promptBuilderKind &&
    options.promptBuilderKind !== BFlowPromptBuilderKind.Section
      ? {
          ...bflowPipelineModule,
          props: {
            ...bflowPipelineModule.props,
            defaultPromptBuilderKind: options.promptBuilderKind,
          },
        }
      : bflowPipelineModule;

  return (
    <Bunny config={config}>
      <BunnyForm />
    </Bunny>
  );
}
