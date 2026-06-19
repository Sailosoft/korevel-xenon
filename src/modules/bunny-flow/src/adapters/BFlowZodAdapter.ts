import { z } from "zod";
import { parse as parseYaml } from "yaml";
import type { BunnyValidationAdapter } from "@/src/modules/bunny/src/Bunny.Interface";

// ─── Domain Schemas ──────────────────────────────────────────────

import { BFlowDefinitionFormSchema } from "../definition/BFlowDefinition.Types";

import {
  BFlowWorkflowTemplateFormSchema,
  BFlowWorkflowSchema,
} from "../workflow/BFlowWorkflow.Types";

import { BFlowPipelineFormSchema } from "../pipeline/BFlowPipeline.Types";

import { BFlowVariableGroupFormSchema } from "../variable/BFlowVariableGroup.Types";

import { BFlowGlobalVariableFormSchema } from "../global-variable/BFlowGlobalVariable.Types";

import { BFlowFlowVariableFormSchema } from "../flow-variable/BFlowFlowVariable.Types";

import { BFlowReportTemplateFormSchema } from "../report/BFlowReport.Types";

// ─── Inferred Form Types ─────────────────────────────────────────

type BFlowDefinitionForm = z.infer<typeof BFlowDefinitionFormSchema>;
type BFlowWorkflowForm = z.infer<typeof BFlowWorkflowTemplateFormSchema>;
type BFlowPipelineForm = z.infer<typeof BFlowPipelineFormSchema>;
type BFlowVariableGroupForm = z.infer<typeof BFlowVariableGroupFormSchema>;
type BFlowGlobalVariableForm = z.infer<typeof BFlowGlobalVariableFormSchema>;
type BFlowFlowVariableForm = z.infer<typeof BFlowFlowVariableFormSchema>;
type BFlowReportTemplateForm = z.infer<typeof BFlowReportTemplateFormSchema>;

// ─── Generic Adapter Factory ───────────────────────────────────────

/**
 * Creates a Bunny-compatible validation adapter from a Zod schema.
 *
 * This is the bunny-flow equivalent of `useBunnyZodAdapter` from the core
 * bunny module. It translates Zod parse errors into the
 * `Record<string, string>` format Bunny's `setFormError()` expects.
 *
 * @param schema A Zod schema that validates the full form shape `TForm`.
 * @returns A `BunnyValidationAdapter` that Bunny can consume directly.
 *
 * @example
 * ```ts
 * const adapter = createBFlowZodAdapter(mySchema);
 * // adapter.validate(formData) → {} | { field: "error" }
 * ```
 */
export function createBFlowZodAdapter<TForm extends Record<string, unknown>>(
  schema: z.ZodSchema<TForm>,
): BunnyValidationAdapter<TForm> {
  return {
    validate: (formData: TForm): Record<string, string> => {
      const result = schema.safeParse(formData);
      if (result.success) return {};

      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join(".");
        if (!errors[path]) {
          errors[path] = issue.message;
        }
      }
      return errors;
    },
  };
}

// ═══════════════════════════════════════════════════════════════════
// BFlowDefinition – Form Validation
// ═══════════════════════════════════════════════════════════════════

/**
 * Returns a validation adapter for the BFlowDefinition form.
 * Uses {@link BFlowDefinitionFormSchema} from the definition domain by default.
 * Accepts an optional custom/overridden schema for advanced use cases.
 *
 * @example
 * ```ts
 * <Bunny config={{
 *   validationAdapter: useBFlowDefinitionFormValidation(),
 *   ...
 * }} />
 * ```
 */
export function useBFlowDefinitionFormValidation(
  schema?: z.ZodSchema<BFlowDefinitionForm>,
): BunnyValidationAdapter<BFlowDefinitionForm> {
  return createBFlowZodAdapter(schema ?? BFlowDefinitionFormSchema);
}

// ═══════════════════════════════════════════════════════════════════
// BFlowWorkflowTemplate – Form Validation
// ═══════════════════════════════════════════════════════════════════

/**
 * Returns a validation adapter for the BFlowWorkflowTemplate form.
 * Uses {@link BFlowWorkflowTemplateFormSchema} from the workflow domain by default.
 * Accepts an optional custom/overridden schema for advanced use cases.
 *
 * @example
 * ```ts
 * <Bunny config={{
 *   validationAdapter: useBFlowWorkflowFormValidation(),
 *   ...
 * }} />
 * ```
 */
export function useBFlowWorkflowFormValidation(
  schema?: z.ZodSchema<BFlowWorkflowForm>,
): BunnyValidationAdapter<BFlowWorkflowForm> {
  const baseAdapter = createBFlowZodAdapter(
    schema ?? BFlowWorkflowTemplateFormSchema,
  );

  return {
    validate: (formData: BFlowWorkflowForm): Record<string, string> => {
      // ── 1. Run base form field validation ──────────────────────────
      const errors = baseAdapter.validate(formData);

      // ── 2. Specialized templateYaml validation ─────────────────────
      const rawYaml = formData.templateYaml?.trim();
      if (!rawYaml) return errors;

      let parsed: unknown;
      try {
        parsed = parseYaml(rawYaml);
      } catch (yamlError: unknown) {
        const message =
          yamlError instanceof Error
            ? `Invalid YAML: ${yamlError.message}`
            : "Invalid YAML syntax";
        errors.templateYaml = message;
        return errors;
      }

      // ── 3. Validate parsed YAML structure against workflow schema ──
      const result = BFlowWorkflowSchema.safeParse(parsed);
      if (!result.success) {
        const details = result.error.issues
          .map((issue) => {
            const path =
              issue.path.length > 0 ? issue.path.join(".") : "(root)";
            return `  • ${path}: ${issue.message}`;
          })
          .join("\n");
        errors.templateYaml = `Workflow YAML validation failed:\n${details}`;
      }

      return errors;
    },
  };
}

// ═══════════════════════════════════════════════════════════════════
// BFlowPipeline – Form Validation
// ═══════════════════════════════════════════════════════════════════

/**
 * Returns a validation adapter for the BFlowPipeline form.
 * Uses {@link BFlowPipelineFormSchema} from the pipeline domain by default.
 * Accepts an optional custom/overridden schema for advanced use cases.
 *
 * @example
 * ```ts
 * <Bunny config={{
 *   validationAdapter: useBFlowPipelineFormValidation(),
 *   ...
 * }} />
 * ```
 */
export function useBFlowPipelineFormValidation(
  schema?: z.ZodSchema<BFlowPipelineForm>,
): BunnyValidationAdapter<BFlowPipelineForm> {
  return createBFlowZodAdapter(schema ?? BFlowPipelineFormSchema);
}

// ═══════════════════════════════════════════════════════════════════
// BFlowVariableGroup – Form Validation
// ═══════════════════════════════════════════════════════════════════

/**
 * Returns a validation adapter for the BFlowVariableGroup form.
 * Uses {@link BFlowVariableGroupFormSchema} from the variable domain by default.
 * Accepts an optional custom/overridden schema for advanced use cases.
 *
 * @example
 * ```ts
 * <Bunny config={{
 *   validationAdapter: useBFlowVariableGroupFormValidation(),
 *   ...
 * }} />
 * ```
 */
export function useBFlowVariableGroupFormValidation(
  schema?: z.ZodSchema<BFlowVariableGroupForm>,
): BunnyValidationAdapter<BFlowVariableGroupForm> {
  return createBFlowZodAdapter(schema ?? BFlowVariableGroupFormSchema);
}

// ═══════════════════════════════════════════════════════════════════
// BFlowGlobalVariable – Form Validation
// ═══════════════════════════════════════════════════════════════════

/**
 * Returns a validation adapter for the BFlowGlobalVariable form.
 * Uses {@link BFlowGlobalVariableFormSchema} from the global-variable domain by default.
 * Accepts an optional custom/overridden schema for advanced use cases.
 *
 * @example
 * ```ts
 * <Bunny config={{
 *   validationAdapter: useBFlowGlobalVariableFormValidation(),
 *   ...
 * }} />
 * ```
 */
export function useBFlowGlobalVariableFormValidation(
  schema?: z.ZodSchema<BFlowGlobalVariableForm>,
): BunnyValidationAdapter<BFlowGlobalVariableForm> {
  return createBFlowZodAdapter(schema ?? BFlowGlobalVariableFormSchema);
}

// ═══════════════════════════════════════════════════════════════════
// BFlowFlowVariable – Form Validation
// ═══════════════════════════════════════════════════════════════════

/**
 * Returns a validation adapter for the BFlowFlowVariable form.
 * Uses {@link BFlowFlowVariableFormSchema} from the flow-variable domain by default.
 * Accepts an optional custom/overridden schema for advanced use cases.
 *
 * @example
 * ```ts
 * <Bunny config={{
 *   validationAdapter: useBFlowFlowVariableFormValidation(),
 *   ...
 * }} />
 * ```
 */
export function useBFlowFlowVariableFormValidation(
  schema?: z.ZodSchema<BFlowFlowVariableForm>,
): BunnyValidationAdapter<BFlowFlowVariableForm> {
  return createBFlowZodAdapter(schema ?? BFlowFlowVariableFormSchema);
}

// ═══════════════════════════════════════════════════════════════════
// BFlowReportTemplate – Form Validation
// ═══════════════════════════════════════════════════════════════════

/**
 * Returns a validation adapter for the BFlowReportTemplate form.
 * Uses {@link BFlowReportTemplateFormSchema} from the report domain by default.
 * Accepts an optional custom/overridden schema for advanced use cases.
 *
 * @example
 * ```ts
 * <Bunny config={{
 *   validationAdapter: useBFlowReportTemplateFormValidation(),
 *   ...
 * }} />
 * ```
 */
export function useBFlowReportTemplateFormValidation(
  schema?: z.ZodSchema<BFlowReportTemplateForm>,
): BunnyValidationAdapter<BFlowReportTemplateForm> {
  return createBFlowZodAdapter(schema ?? BFlowReportTemplateFormSchema);
}
