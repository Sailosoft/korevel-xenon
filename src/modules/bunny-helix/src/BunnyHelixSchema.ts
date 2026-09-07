/**
 * BunnyHelixSchema — Builders + validators for the Helix structured-output
 * schema derived from AI target fields.
 *
 * Mapping follows the bunny field-type → Helix JSON-schema table:
 *   text/textarea/editor/code-editor/email/password → string
 *   slug → string (URL-safe note)
 *   number → number
 *   switch → boolean
 *   select → string (choices embedded in the description; no `enum`, since
 *            HelixAISchemaService.cleanProperties strips unknown keywords)
 *   custom/render/display → throws a config error (unsupported)
 *
 * Select membership is POST-VALIDATED client-side by {@link validateGeneratedValues}.
 */

import type {
  HelixAISchemaOptions,
  HelixAISchemaProperties,
  HelixStrictPropertyDefinition,
} from "@/src/modules/helix";
import type {
  BunnyFormField,
  BunnyFieldType,
  BunnySelectOption,
} from "@/src/modules/bunny/src/form/BunnyForm.Interface";
import type {
  BunnyHelixTarget,
  BunnyHelixSelectChoice,
  BunnyHelixModeContext,
} from "./BunnyHelix.Interface";

// ── Internal resolved shapes ─────────────────────────────────────────────────

type BunnyHelixSchemaType = "string" | "number" | "boolean";

interface ResolvedField {
  name: string;
  label: string;
  type: BunnyHelixSchemaType;
  /** Allowed values for a `select` target (kept for post-validation). */
  allowed?: Array<string | number>;
  description: string;
}

/** Schema + per-field constraints (select choices, types) for validation. */
export interface BunnyHelixSchemaResult {
  /** The Helix structured-output schema. */
  schema: HelixAISchemaOptions;
  /** Per-field constraints used by {@link validateGeneratedValues}. */
  fields: Record<
    string,
    { type: BunnyHelixSchemaType; allowed?: Array<string | number> }
  >;
}

// ── Option normalization ─────────────────────────────────────────────────────

type AnyOption = BunnySelectOption | BunnyHelixSelectChoice;

async function resolveOptions(
  options?: AnyOption[] | (() => AnyOption[] | Promise<AnyOption[]>),
): Promise<BunnySelectOption[]> {
  if (!options) return [];
  const resolved =
    typeof options === "function" ? await options() : options;
  return resolved.map((o) => ({
    label: o.label,
    value: o.value,
  }));
}

function allowedList(options: BunnySelectOption[]): Array<string | number> {
  return options.map((o) => o.value);
}

function choiceLabels(options: BunnySelectOption[]): string {
  return options.map((o) => o.label).join(", ");
}

// ── Field-type mapping for fields derived from the module form ───────────────

type ModuleFieldLike = Pick<BunnyFormField, "name" | "type" | "options">;

function moduleTypeInfo(
  field: ModuleFieldLike,
): { type: BunnyHelixSchemaType; note?: string; select?: boolean } {
  switch (field.type as BunnyFieldType) {
    case "text":
    case "textarea":
    case "editor":
    case "code-editor":
    case "email":
    case "password":
      return { type: "string" };
    case "slug":
      return {
        type: "string",
        note: "URL-safe format: lowercase, alphanumeric with single hyphens.",
      };
    case "number":
      return { type: "number" };
    case "switch":
      return { type: "boolean" };
    case "select":
      return { type: "string", select: true };
    case "custom":
    case "render":
    case "display":
      throw new Error(
        `BunnyHelix: target field "${field.name}" uses unsupported field type "${field.type}". ` +
          `Provide a self-contained target with type "string"|"number"|"boolean"|"select" instead.`,
      );
    default:
      throw new Error(
        `BunnyHelix: unknown field type "${String(field.type)}" for target "${field.name}".`,
      );
  }
}

// ── Schema builder ───────────────────────────────────────────────────────────

/**
 * Build the Helix structured-output schema from the action's target fields.
 *
 * Module form-field references are resolved against `moduleFields` so their
 * type/label/options are derived; self-contained targets are used as declared.
 * Select choices are embedded in the property description (no `enum`).
 *
 * When a required `modeContext` is provided, the mode property is declared
 * FIRST in the schema (constrained to the defined modes). It is intentionally
 * NOT added to the validation constraints — the caller overrides the generated
 * value with the resolved mode since it is deterministic.
 *
 * @param targets - The action's AI-generated target fields.
 * @param moduleFields - The module's form config fields (used to resolve `field` refs).
 * @param modeContext - Optional required-mode context injected into the schema.
 * @returns The Helix schema plus per-field constraint metadata.
 */
export async function buildBunnyHelixSchema<TForm>(
  targets: BunnyHelixTarget<TForm>[],
  moduleFields: BunnyFormField<TForm>[],
  modeContext?: BunnyHelixModeContext,
): Promise<BunnyHelixSchemaResult> {
  let properties: HelixAISchemaProperties = {};
  const fields: BunnyHelixSchemaResult["fields"] = {};

  const byName = new Map<string, BunnyFormField<TForm>>();
  for (const f of moduleFields) byName.set(String(f.name), f);

  for (const target of targets) {
    const resolved: ResolvedField = await resolveTarget(target, byName);
    properties[resolved.name] = {
      type: resolved.type,
      description: resolved.description,
    } as HelixStrictPropertyDefinition;
    if (resolved.allowed) {
      fields[resolved.name] = { type: resolved.type, allowed: resolved.allowed };
    } else {
      fields[resolved.name] = { type: resolved.type };
    }
  }

  // Required mode: declare the mode property first so the AI signs the record.
  if (modeContext?.modes.required) {
    const cfg = modeContext.modes;
    const modeName = cfg.field ?? "mode";
    const choices = cfg.modes.map((m) => m.label).join(", ");
    properties = {
      [modeName]: {
        type: "string",
        description: `Must be exactly one of: ${choices}.`,
      } as HelixStrictPropertyDefinition,
      ...properties,
    };
  }

  const schema: HelixAISchemaOptions = {
    name: "bunny_helix_record_generation",
    description:
      "Generates a flat JSON object of record fields derived from user input.",
    properties,
  };

  return { schema, fields };
}

async function resolveTarget<TForm>(
  target: BunnyHelixTarget<TForm>,
  byName: Map<string, BunnyFormField<TForm>>,
): Promise<ResolvedField> {
  if ("field" in target) {
    return resolveFieldRef(target, byName);
  }
  return resolveSelfContained(target);
}

async function resolveFieldRef<TForm>(
  ref: { field: keyof TForm & string; prompt?: string },
  byName: Map<string, BunnyFormField<TForm>>,
): Promise<ResolvedField> {
  const field = byName.get(String(ref.field));
  if (!field) {
    throw new Error(
      `BunnyHelix: target field "${String(ref.field)}" does not exist in the module's form config. ` +
        `Use a self-contained target ({ name, type }) or add the field to the form.`,
    );
  }

  const label = field.label || String(ref.field);
  const info = moduleTypeInfo(field);

  let allowed: Array<string | number> | undefined;
  let choicesText = "";

  if (info.select) {
    const opts = await resolveOptions(field.options as
      | AnyOption[]
      | (() => AnyOption[] | Promise<AnyOption[]>)
      | undefined);
    choicesText = choiceLabels(opts);
    allowed = allowedList(opts);
  }

  const parts = [label];
  if (info.select) {
    parts.push(
      allowed && allowed.length > 0
        ? `Must be exactly one of: ${choicesText}.`
        : "Any value; match an option shown in the UI.",
    );
  }
  if (info.note) parts.push(info.note);
  if (ref.prompt) parts.push(ref.prompt);

  return {
    name: String(ref.field),
    label,
    type: info.type,
    allowed,
    description: parts.join(" "),
  };
}

async function resolveSelfContained(
  target: {
    name: string;
    type: "string" | "number" | "boolean" | "select";
    label?: string;
    options?: AnyOption[] | (() => AnyOption[] | Promise<AnyOption[]>);
    prompt?: string;
  },
): Promise<ResolvedField> {
  const label = target.label || target.name;

  if (target.type === "select") {
    const opts = await resolveOptions(target.options);
    const allowed = allowedList(opts);
    const parts = [label];
    parts.push(
      allowed.length > 0
        ? `Must be exactly one of: ${choiceLabels(opts)}.`
        : "Any value; match an option shown in the UI.",
    );
    if (target.prompt) parts.push(target.prompt);
    return {
      name: target.name,
      label,
      type: "string",
      allowed,
      description: parts.join(" "),
    };
  }

  const parts = [label];
  if (target.type === "number") {
    parts.push("A numeric value.");
  } else if (target.type === "boolean") {
    parts.push("A boolean true or false.");
  }
  if (target.prompt) parts.push(target.prompt);

  return {
    name: target.name,
    label,
    type: target.type,
    description: parts.join(" "),
  };
}

// ── Post-generation validation ───────────────────────────────────────────────

/** Result of validating AI-generated values against the schema constraints. */
export type BunnyHelixValidationResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: string };

/**
 * Validate (and coerce) AI-generated values against the schema constraints.
 *
 * Coerces numbers/booleans from numeric/string inputs, and pins select values
 * to one of their allowed choices (case-insensitive). On any mismatch a
 * friendly error is returned so the modal can show it and the user can retry —
 * no partial record is ever created.
 *
 * @param result - The schema result from {@link buildBunnyHelixSchema}.
 * @param generated - The raw values returned by the AI service.
 */
export function validateGeneratedValues(
  result: BunnyHelixSchemaResult,
  generated: Record<string, unknown>,
): BunnyHelixValidationResult {
  const data: Record<string, unknown> = {};

  for (const [name, constraint] of Object.entries(result.fields)) {
    const raw = generated[name];

    if (constraint.allowed && constraint.allowed.length > 0) {
      if (raw === undefined || raw === null || raw === "") {
        return {
          ok: false,
          error: `AI did not provide a value for field "${name}". Please retry.`,
        };
      }
      const canonical = constraint.allowed.find(
        (a) => String(a).toLowerCase() === String(raw).toLowerCase(),
      );
      if (canonical === undefined) {
        return {
          ok: false,
          error: `AI returned "${String(raw)}" for "${name}", which is not one of the allowed options. Please retry.`,
        };
      }
      data[name] = canonical;
      continue;
    }

    switch (constraint.type) {
      case "number": {
        const num =
          typeof raw === "number"
            ? raw
            : typeof raw === "string" && raw.trim() !== ""
              ? Number(raw)
              : NaN;
        if (Number.isNaN(num)) {
          return {
            ok: false,
            error: `AI returned a non-numeric value for "${name}". Please retry.`,
          };
        }
        data[name] = num;
        break;
      }
      case "boolean": {
        if (typeof raw === "boolean") {
          data[name] = raw;
        } else if (typeof raw === "string") {
          const lower = raw.toLowerCase();
          if (lower === "true") data[name] = true;
          else if (lower === "false") data[name] = false;
          else {
            return {
              ok: false,
              error: `AI returned an invalid boolean for "${name}". Please retry.`,
            };
          }
        } else if (raw === undefined || raw === null) {
          data[name] = false;
        } else {
          return {
            ok: false,
            error: `AI returned an invalid boolean for "${name}". Please retry.`,
          };
        }
        break;
      }
      case "string":
      default: {
        if (raw === undefined || raw === null) {
          data[name] = "";
        } else if (typeof raw === "string") {
          data[name] = raw;
        } else {
          data[name] = String(raw);
        }
        break;
      }
    }
  }

  return { ok: true, data };
}
