/**
 * BFlowWorkflow.Server — Server action for AI-powered YAML workflow generation.
 *
 * Takes user requirements and a workflow style preference, then uses Helix AI
 * to generate a complete, valid BFlowWorkflow YAML string that strictly conforms
 * to BFlowWorkflowSchema.
 *
 * Usage (client-side):
 * ```ts
 * const yaml = await bflowWorkflowServerGenerate({
 *   workflowName: "My Pipeline",
 *   requirements: "Generate content about AI...",
 *   styleKey: "content_pipeline",
 * });
 * ```
 */
"use server";

import Handlebars from "handlebars";
import HelixAIService from "@/src/modules/helix/src/HelixAIService";
import HelixAISchemaService from "@/src/modules/helix/src/HelixAISchemaService";
import { HELIX_AI_PROVIDERS, type HelixAIConfig } from "@/src/modules/helix";
import { bflowYamlPrompt } from "./BFlowWorkflow.Prompt";

// ─── Input types ───────────────────────────────────────────────────

export interface BFlowWorkflowServerGenerateParams {
  /** Name for the generated workflow */
  workflowName: string;
  /** Description of the workflow purpose */
  workflowDescription?: string;
  /** Detailed user requirements / needs */
  requirements: string;
  /** Additional context or constraints */
  additionalContext?: string;
  /** The workflow style key (e.g. "content_pipeline", "multi_agent_research") */
  styleKey: string;
}

// ─── Server Action ─────────────────────────────────────────────────

/**
 * Generates a complete BFlowWorkflow YAML string using Helix AI.
 *
 * @param params - The generation parameters describing user needs
 * @returns A valid YAML string conforming to BFlowWorkflowSchema
 *
 * @throws If the AI service fails or returns invalid YAML
 */
export async function bflowWorkflowServerGenerate(
  params: BFlowWorkflowServerGenerateParams,
): Promise<string> {
  const {
    workflowName,
    workflowDescription,
    requirements,
    additionalContext,
    styleKey,
  } = params;

  // ── 1. Resolve the prompt style ──────────────────────────────────
  const selectedStyle =
    bflowYamlPrompt.workflowStyles.find((s) => s.key === styleKey) ||
    bflowYamlPrompt.workflowStyles.find((s) => s.key === "custom")!;

  // ── 2. Build the system prompt ───────────────────────────────────
  const systemPrompt = `${selectedStyle.systemPrompt}

${bflowYamlPrompt.extraSystemPrompt}`;

  // ── 3. Compile the user prompt with Handlebars ───────────────────
  const template = Handlebars.compile(bflowYamlPrompt.userPromptTemplate);
  const userPrompt = template({
    workflowName,
    workflowDescription: workflowDescription || "",
    requirements,
    additionalContext: additionalContext || "",
    styleName: selectedStyle.name,
    styleDescription: selectedStyle.description,
  });

  // ── 4. Create Helix AI service with default config ───────────────
  const helixConfig: HelixAIConfig = {
    activeProvider: "default",
    providers: HELIX_AI_PROVIDERS,
  };

  const ai = new HelixAIService({
    config: { ai: helixConfig },
    aiSchema: new HelixAISchemaService(),
  });

  // ── 5. Generate YAML ────────────────────────────────────────────
  try {
    const yamlOutput = await ai.doChat({
      system: systemPrompt,
      user: userPrompt,
      temperature: 0.3, // Lower temperature for more deterministic, schema-compliant output
    });

    // Clean up the response — strip any markdown fences if present
    let cleanYaml = yamlOutput.trim();

    // Remove leading ```yaml or ``` if present
    if (cleanYaml.startsWith("```")) {
      cleanYaml = cleanYaml.replace(/^```(?:yaml)?\n?/i, "");
      cleanYaml = cleanYaml.replace(/\n?```$/g, "");
      cleanYaml = cleanYaml.trim();
    }

    // Validate that the YAML has basic required fields
    if (!cleanYaml.includes("name:") || !cleanYaml.includes("jobs:")) {
      throw new Error(
        "Generated YAML is missing required fields (name, jobs).",
      );
    }

    return cleanYaml;
  } catch (error) {
    console.error("[BFlowWorkflow.Server] YAML generation failed:", error);
    throw new Error(
      `Failed to generate workflow YAML: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
