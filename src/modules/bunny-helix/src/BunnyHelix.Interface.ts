/**
 * BunnyHelix.Interface — Type contracts for the bunny↔helix AI record-creation bridge.
 *
 * This module is the *only* bridge between `bunny` (UI logic) and `helix` (AI
 * configuration). It never drives either module; it composes them so a consumer
 * can wire an AI-backed "create" header action without touching bunny or helix.
 */

import type { ReactNode } from "react";
import type {
  HelixAIOption,
  HelixTemperaturePreset,
  HelixAISchemaOptions,
} from "@/src/modules/helix";
import type { BunnyFormField } from "@/src/modules/bunny/src/form/BunnyForm.Interface";
import type { BunnyHeaderVariants } from "@/src/modules/bunny/src/header/BunnyHeader.Interface";

// ── AI adapter ───────────────────────────────────────────────────────────────

/**
 * Resolves the `HelixAIOption` (provider + model) used for a generation call.
 *
 * Supports either a static tuple or a (possibly async) resolver evaluated at
 * submit time so the camera always gets a fresh provider/model — for example a
 * `useHelixAIOption` ref, a Dexie getter, or props supplied by the consumer.
 */
export type BunnyHelixAIAdapter =
  | HelixAIOption
  | (() => HelixAIOption | undefined | Promise<HelixAIOption | undefined>);

// ── Targets (AI-generated fields) ────────────────────────────────────────────

/**
 * A select field's allowed choices. Mirrors `BunnySelectOption` so derived
 * options can flow straight through from a module form definition.
 */
export interface BunnyHelixSelectChoice {
  label: string;
  value: string | number;
}

/**
 * A self-contained target field whose schema is declared inline instead of
 * being derived from the module's `formConfig.fields`.
 *
 * Only JSON-schema-safe scalar types are supported (Helix's schema cleaner
 * strips unknown keywords, so selects are expressed as constrained strings).
 */
export interface BunnyHelixTargetField {
  /** Field name — the record property the AI will populate. */
  name: string;
  /** Helix JSON-schema type (select is represented as a constrained string). */
  type: "string" | "number" | "boolean" | "select";
  /** Optional human label used in the generated prompt. Defaults to `name`. */
  label?: string;
  /** Allowed choices for a `select` target (static or lazily-resolved). */
  options?:
    | BunnyHelixSelectChoice[]
    | (() => BunnyHelixSelectChoice[] | Promise<BunnyHelixSelectChoice[]>);
  /** Extra guidance appended to the schema description / prompt. */
  prompt?: string;
}

/**
 * A target field referencing a field in the module's own `formConfig.fields`.
 * Type, label, and options are derived automatically so generated values are
 * guaranteed to fit the form.
 */
export interface BunnyHelixFieldRef<TForm = Record<string, unknown>> {
  /** Key of a field in the module's form config. */
  field: keyof TForm & string;
  /** Extra guidance appended to the schema description / prompt. */
  prompt?: string;
}

/**
 * Discriminated union of AI-generated target fields: either a module
 * form-field reference or a self-contained declaration.
 */
export type BunnyHelixTarget<TForm = Record<string, unknown>> =
  | BunnyHelixFieldRef<TForm>
  | BunnyHelixTargetField;

// ── Prompt context ───────────────────────────────────────────────────────────

/** Context passed to a custom `systemPrompt` resolver. */
export interface BunnyHelixPromptContext<TForm = Record<string, unknown>> {
  /** The module title (from `BunnyConfig.title`). */
  title: string;
  /** The user-facing input values collected in the modal. */
  inputs: TForm;
  /** Prompt guidance string built from the target fields. */
  fieldPrompts: string;
}

// ── Generation params (server action & escape hatch) ────────────────────────

/** Payload accepted by the generic generation action (or a custom override). */
export interface BunnyHelixGenerateParams {
  /** Helix structured-output schema built from the targets. */
  schema: HelixAISchemaOptions;
  /** System prompt guiding the generation. */
  system: string;
  /** User prompt embedding the collected input values. */
  user: string;
  /** Resolved provider + model override (optional). */
  aiConfig?: HelixAIOption;
  /** Numeric temperature override. */
  temperature?: number;
  /** Temperature preset override. */
  type?: HelixTemperaturePreset;
}

/**
 * Escape-hatch override: swap in a custom server action instead of the
 * generic `bunnyHelixGenerate`. Must return a flat record of generated values.
 */
export type BunnyHelixGenerateFn = (
  params: BunnyHelixGenerateParams,
) => Promise<Record<string, unknown>>;

// ── Action config ────────────────────────────────────────────────────────────

/** Post-generation behavior for the record. */
export type BunnyHelixOnCreate = "prefill" | "direct";

/** Full configuration for a `useBunnyHelixAction` header action. */
export interface BunnyHelixActionConfig<TForm = Record<string, unknown>> {
  /** Unique action id (also used to key the modal). */
  id: string;
  /** Header action label. */
  label: string;
  /** Header action icon (e.g. `<Sparkles />`). */
  icon?: ReactNode;
  /** Header action variant. */
  variant?: BunnyHeaderVariants;
  /** AI provider/model — static tuple or resolved at submit time. */
  ai: BunnyHelixAIAdapter;
  /** Modal fields the user fills in before generation. */
  inputFields: BunnyFormField<TForm>[];
  /**
   * Optional generation modes. When set, a mode selector is rendered as the
   * first modal input; the chosen mode's prompt is injected into the
   * generation instructions, and (when `required`) its value is added as the
   * first generated property.
   */
  modes?: BunnyHelixModesConfig;
  /** Record fields the AI will generate. */
  targets: BunnyHelixTarget<TForm>[];
  /**
   * Optional custom system prompt. When omitted a default is built from the
   * module title and the per-target prompts.
   */
  systemPrompt?: (ctx: BunnyHelixPromptContext<TForm>) => string;
  /** Numeric temperature override for the generation call. */
  temperature?: number;
  /** Temperature preset override for the generation call. */
  type?: HelixTemperaturePreset;
  /**
   * What to do once generation succeeds:
   * - `"prefill"` opens the module's create modal pre-filled with the data.
   * - `"direct"` creates the record immediately and refreshes the table.
   */
  onCreate: BunnyHelixOnCreate;
  /** Escape-hatch custom server action (defaults to `bunnyHelixGenerate`). */
  generate?: BunnyHelixGenerateFn;
  /** Title shown in the modal header (defaults to `label`). */
  modalTitle?: string;
  /** Label for the submit button inside the modal (defaults to `label`). */
  submitLabel?: string;
  /** Label for the cancel button (defaults to "Cancel"). */
  cancelLabel?: string;
}

// ── Modes (optional generation modes) ────────────────────────────────────────

/**
 * A selectable generation mode. When chosen, its `prompt` is appended to the
 * generation instructions so it steers how the AI builds the record fields.
 */
export interface BunnyHelixMode {
  /** Human-readable label shown in the modal selector. */
  label: string;
  /** Stable value stored in the record / form (e.g. "simple-instruction"). */
  mode: string;
  /** Guidance included in the generation prompt when this mode is chosen. */
  prompt: string;
  /** Marks this mode as the default (used when `required` and none selected). */
  default?: boolean;
}

/**
 * Optional mode configuration for an action. When present, bunny-helix renders
 * a mode selector as the first modal input field.
 *
 * Requirement level:
 * - `required: false` (default) — the selector is optional; a "None" option is
 *   added and picking it excludes any mode prompt and value.
 * - `required: true` — the mode must be present; it is embedded in the
 *   generated data under `field` and declared first in the schema properties,
 *   defaulting to the `default` mode (or the first mode) when unselected.
 */
export interface BunnyHelixModesConfig {
  modes: BunnyHelixMode[];
  /** Require a mode and embed its value in the generated record. */
  required?: boolean;
  /** Name of the generated record property holding the mode value. @default "mode" */
  field?: string;
  /** Label of the mode selector shown in the modal. @default "Mode" */
  label?: string;
}

/** Resolved mode context passed to the schema builder. */
export interface BunnyHelixModeContext {
  modes: BunnyHelixModesConfig;
  /** The selected (or defaulted) mode value when the mode is required. */
  selectedValue?: string;
}

// ── Re-exports used by consumers ────────────────────────────────────────────

export type { BunnySelectOption } from "@/src/modules/bunny/src/form/BunnyForm.Interface";
export type { BunnyKernel } from "@/src/modules/bunny/src/Bunny.Interface";
