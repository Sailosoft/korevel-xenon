/**
 * BFlowVariableBase — Shared variable record schema used as the source of truth
 * for all variable shapes throughout Bunny Flow.
 *
 * The base variable schema comes from the workflow YAML definition
 * (`BFlowWorkflowSchema` → `BFlowVariableSchema`).  Every entity-level variable
 * type (flow variable, global variable, variable-group variable) extends this
 * base with its own entity-specific fields (id, createdAt, etc.).
 *
 * ═══════════════════════════════════════════════════════════════════════
 * SOURCE OF TRUTH
 * ═══════════════════════════════════════════════════════════════════════
 *
 * The canonical variable shape is defined by `BFlowWorkflowSchema.variables`
 * in `BFlowWorkflow.Types.ts`.  This file re-exports the core record schema
 * so that DB entity schemas can reference it directly.
 *
 * Any change to the base variable record (adding a field, changing a type)
 * MUST be made here first, then propagated to:
 *   - BFlowWorkflow.Types.ts       (Zod schema for YAML validation)
 *   - BFlowFlowVariable.Types.ts    (IndexedDB entity)
 *   - BFlowGlobalVariable.Types.ts  (IndexedDB entity)
 *   - BFlowVariableGroup.Types.ts   (IndexedDB entity)
 *   - BFlowWorkflowInteractive.Types.tsx (UI form types)
 */

import { z } from "zod";

// ─── Shared Primitives ─────────────────────────────────────────────

/** Name constraint — spaces NOT allowed, used for variable identifiers */
export const BFlowVariableNameSchema = z
  .string()
  .min(1, "Name must not be empty")
  .max(256)
  .regex(/^[^\s]+$/, "Name must not contain spaces");

export type BFlowVariableName = z.infer<typeof BFlowVariableNameSchema>;

// ─── Variable Type ─────────────────────────────────────────────────

export const BFlowVariableTypeSchema = z.enum([
  "text",
  "number",
  "boolean",
  "select",
  "textarea",
]);

export type BFlowVariableType = z.infer<typeof BFlowVariableTypeSchema>;

// ─── Base Variable Record (source of truth) ────────────────────────

/**
 * Base variable record matching the workflow YAML variable definition.
 * This is the canonical pattern that all other variable types extend.
 *
 * Fields:
 *   name        — unique identifier within scope (no spaces allowed)
 *   value       — the variable value (replaces legacy `defaultValue`)
 *   type        — variable type hint, defaults to "text" if omitted
 *   description — optional human-readable description
 */
export const BFlowVariableBaseSchema = z.object({
  name: BFlowVariableNameSchema,
  /** The variable value (replaces legacy defaultValue) */
  value: z.string(),
  /** Variable type hint — defaults to "text" in the UI */
  type: BFlowVariableTypeSchema.optional(),
  /** Optional description of the variable's purpose */
  description: z.string().optional(),
});

export type BFlowVariableBase = z.infer<typeof BFlowVariableBaseSchema>;

// ─── Variable Type Options (for UI dropdowns) ──────────────────────

export const VARIABLE_TYPE_OPTIONS: {
  label: string;
  value: BFlowVariableType;
}[] = [
  { label: "Text", value: "text" },
  { label: "Number", value: "number" },
  { label: "Boolean", value: "boolean" },
  { label: "Select", value: "select" },
  { label: "Textarea", value: "textarea" },
];
