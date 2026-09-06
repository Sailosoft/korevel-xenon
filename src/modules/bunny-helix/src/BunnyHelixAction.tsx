/**
 * BunnyHelixAction — Plug-and-play builder that composes bunny's
 * `useBunnyHeaderActionForm` into an AI-assisted record-creation header action.
 *
 * `createBunnyHelixAction` is a plain (non-hook) factory, so the returned
 * `BunnyHeaderAction` can be handed straight to `feature.configureHeader` in a
 * module file — no wrapper component is required:
 *
 *     const aiCreate = createBunnyHelixAction<Book, BookForm>({ ... });
 *     feature.configureHeader((h) => h.addAction(aiCreate));
 *
 * All React state lives inside `BunnyHelixActionHost`, which is rendered by the
 * action's `render` prop inside the bunny provider (where `useBunnyKernel` is
 * available). The generated modal renders the configurable `inputFields`; on
 * submit it resolves the AI adapter, builds the Helix schema + prompts, calls
 * the generic server action (or a custom `generate` override), validates the
 * response client-side, then either prefills the module's create modal or
 * creates the record directly — driven by `onCreate`.
 */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@heroui/react";
import type { BunnyHeaderAction } from "@/src/modules/bunny/src/header/BunnyHeader.Interface";
import { useBunnyHeaderActionForm } from "@/src/modules/bunny";
import type { BunnyHeaderActionFormSubmitContext } from "@/src/modules/bunny/src/header/BunnyHeader.Action.Form";
import type { BunnyFormField } from "@/src/modules/bunny/src/form/BunnyForm.Interface";
import {
  useBunnyKernel,
} from "@/src/modules/bunny/src/kernel";
import type { BunnyKernel } from "@/src/modules/bunny/src/Bunny.Interface";
import type {
  BunnyHelixActionConfig,
  BunnyHelixPromptContext,
  BunnyHelixTarget,
  BunnyHelixModesConfig,
} from "./BunnyHelix.Interface";
import { resolveBunnyHelixAI } from "./BunnyHelixAdapter";
import {
  buildBunnyHelixSchema,
  validateGeneratedValues,
} from "./BunnyHelixSchema";
import {
  buildSystemPrompt,
  buildUserPrompt,
} from "./BunnyHelixPrompt";
import { prefillCreate, directCreate } from "./BunnyHelixFlow";
import { bunnyHelixGenerate } from "./BunnyHelixGenerate.Server";

// ── Helpers ──────────────────────────────────────────────────────────────────

function deriveModuleFields<TRow, TForm>(
  kernel: BunnyKernel<TRow, TForm>,
): BunnyFormField<TForm>[] {
  const cfg = kernel.config.formConfig;
  if (!cfg) return [];
  const resolved = typeof cfg === "function" ? cfg(kernel.adminPanel.form) : cfg;
  return resolved.fields ?? [];
}

function buildFieldPrompts<TForm>(
  targets: BunnyHelixTarget<TForm>[],
  fields: BunnyFormField<TForm>[],
): string {
  return targets
    .map((t) => {
      if ("field" in t) {
        const f = fields.find((x) => String(x.name) === String(t.field));
        const label = f?.label || String(t.field);
        return t.prompt ? `- ${label}: ${t.prompt}` : `- ${label}`;
      }
      return t.prompt
        ? `- ${t.label || t.name}: ${t.prompt}`
        : `- ${t.label || t.name}`;
    })
    .join("\n");
}

function resolveSystemPrompt<TForm>(
  config: BunnyHelixActionConfig<TForm>,
  ctx: BunnyHelixPromptContext<TForm>,
): string {
  return config.systemPrompt
    ? config.systemPrompt(ctx)
    : buildSystemPrompt({
        title: ctx.title,
        inputs: ctx.inputs as Record<string, unknown>,
        fieldPrompts: ctx.fieldPrompts,
      });
}

function defaultMode(modeConfig: BunnyHelixModesConfig): string | undefined {
  return (modeConfig.modes.find((m) => m.default) ?? modeConfig.modes[0])?.mode;
}

function toButtonVariant(
  variant?: BunnyHeaderAction["variant"],
): "primary" | "secondary" | "ghost" | "danger" | "danger-soft" | "outline" | "tertiary" {
  switch (variant) {
    case "primary":
      return "primary";
    case "secondary":
      return "secondary";
    case "ghost":
      return "ghost";
    case "danger":
      return "danger";
    case "danger-soft":
      return "danger-soft";
    case "outline":
      return "outline";
    case "tertiary":
      return "tertiary";
    default:
      return "primary";
  }
}

// ── Internal host component (rendered inside the bunny provider) ────────────

/**
 * Renders the visible trigger button plus the modal host. Each click remounts
 * the modal (fresh `session` key) so the composed bunny modal always opens with
 * empty input fields instead of reusing the previous session's values.
 */
function BunnyHelixActionHost<TRow, TForm>({
  config,
}: {
  config: BunnyHelixActionConfig<TForm>;
}) {
  const [session, setSession] = useState(0);
  const pendingOpen = useRef(false);

  const handleClick = useCallback(() => {
    pendingOpen.current = true;
    setSession((s) => s + 1);
  }, []);

  return (
    <>
      <Button variant={toButtonVariant(config.variant)} onClick={handleClick}>
        {config.icon}
        <span className="hidden sm:inline ml-1">{config.label}</span>
      </Button>
      <BunnyHelixActionModal<TRow, TForm>
        key={session}
        config={config}
        pendingOpenRef={pendingOpen}
      />
    </>
  );
}

/**
 * A single modal session backed by bunny's `useBunnyHeaderActionForm`. New
 * instances are mounted fresh (keyed by `session`), so all internal state —
 * including the rendered input fields — starts empty.
 */
function BunnyHelixActionModal<TRow, TForm>({
  config,
  pendingOpenRef,
}: {
  config: BunnyHelixActionConfig<TForm>;
  pendingOpenRef: React.MutableRefObject<boolean>;
}) {
  const providerKernel = useBunnyKernel();

  const submitAction = useCallback(
    async (
      context: BunnyHeaderActionFormSubmitContext<Record<string, unknown>>,
    ) => {
      const { formData, kernel: contextKernel, setState } = context;
      const typedKernel = contextKernel as unknown as BunnyKernel<TRow, TForm>;

      setState((prev) => ({
        ...prev,
        progress: "Resolving AI configuration…",
      }));

      const aiConfig = await resolveBunnyHelixAI(config.ai);
      if (!aiConfig) {
        throw new Error(
          "No AI provider selected. Configure a provider/model and retry.",
        );
      }

      // Resolve the selected mode (prompt guidance + required value).
      let modePrompt: string | undefined;
      let modeValue: string | undefined;
      if (config.modes) {
        const modeField = config.modes.field ?? "mode";
        const rawValue = (formData as Record<string, unknown>)[modeField];
        const selected = config.modes.modes.find(
          (m) => m.mode === rawValue,
        );
        if (selected) {
          modeValue = selected.mode;
          modePrompt = selected.prompt;
        }
        if (config.modes.required && !modeValue) {
          modeValue = defaultMode(config.modes);
        }
      }

      const moduleFields = deriveModuleFields(typedKernel);

      setState((prev) => ({
        ...prev,
        progress: "Building generation schema…",
      }));

      const schemaResult = await buildBunnyHelixSchema<TForm>(
        config.targets,
        moduleFields,
        config.modes
          ? { modes: config.modes, selectedValue: modeValue }
          : undefined,
      );

      const fieldPrompts = buildFieldPrompts(config.targets, moduleFields);
      const promptNotes = modePrompt
        ? `${fieldPrompts}${fieldPrompts ? "\n" : ""}- Mode: ${modePrompt}`
        : fieldPrompts;
      const promptCtx: BunnyHelixPromptContext<TForm> = {
        title: typedKernel.config.title,
        inputs: formData as TForm,
        fieldPrompts: promptNotes,
      };
      const system = resolveSystemPrompt(config, promptCtx);
      const user = buildUserPrompt(
        formData as Record<string, unknown>,
        promptNotes,
      );

      setState((prev) => ({
        ...prev,
        progress: "Generating…",
      }));

      const generate = config.generate ?? bunnyHelixGenerate;
      const raw = await generate({
        schema: schemaResult.schema,
        system,
        user,
        aiConfig,
        temperature: config.temperature,
        type: config.type,
      });

      const validated = validateGeneratedValues(schemaResult, raw);
      if (!validated.ok) {
        throw new Error(validated.error);
      }

      // Required mode: the value is deterministic — pin the generated data.
      if (validated.ok && config.modes?.required && modeValue) {
        validated.data[config.modes.field ?? "mode"] = modeValue;
      }

      if (config.onCreate === "direct") {
        const flow = await directCreate<TRow, TForm>(
          typedKernel,
          validated.data,
        );
        if (!flow.ok && flow.error) throw new Error(flow.error);
      } else {
        prefillCreate<TRow, TForm>(typedKernel, validated.data);
      }
    },
    [config],
  );

  // Stable for the composed bunny hook; only the module config changes matter.
  const formFields = useMemo<BunnyFormField[]>(() => {
    const inputs = config.inputFields as BunnyFormField[];
    if (!config.modes) return inputs;
    const modeField = config.modes.field ?? "mode";
    const options: Array<{ label: string; value: string }> = [];
    if (!config.modes.required) options.push({ label: "None", value: "" });
    options.push(
      ...config.modes.modes.map((m) => ({ label: m.label, value: m.mode })),
    );
    return [
      {
        name: modeField,
        label: config.modes.label ?? "Mode",
        type: "select",
        options,
      },
      ...inputs,
    ];
  }, [config]);

  const initialData = useMemo<Record<string, unknown> | undefined>(() => {
    if (!config.modes?.required) return undefined;
    const value = defaultMode(config.modes);
    return value === undefined
      ? undefined
      : { [config.modes.field ?? "mode"]: value };
  }, [config]);

  const formConfig = useMemo(
    () => ({
      id: config.id,
      label: config.label,
      icon: config.icon,
      variant: config.variant,
      modalTitle: config.modalTitle || config.label,
      submitLabel: config.submitLabel || config.label,
      cancelLabel: config.cancelLabel,
      formFields,
      initialData,
      submitAction,
    }),
    [config, formFields, initialData, submitAction],
  );

  const action = useBunnyHeaderActionForm<Record<string, unknown>>(
    formConfig as never,
  );

  // Open this fresh session only when the mount was caused by a click on the
  // trigger button (the initial page-load mount stays closed).
  useEffect(() => {
    if (pendingOpenRef.current) {
      pendingOpenRef.current = false;
      action.onClick?.();
    }
  }, [action, pendingOpenRef]);

  return action.render ? action.render(providerKernel) : null;
}

// ── Factory ──────────────────────────────────────────────────────────────────

/**
 * Creates a `BunnyHeaderAction` that opens a modal with `inputFields`, runs
 * Helix AI generation over the configured `targets`, and applies the result to
 * the module per `onCreate`.
 *
 * This is a plain function (not a hook), so it can be called at module scope
 * inside `BunnyFeature.create` and handed directly to `configureHeader`.
 *
 * @example
 * ```tsx
 * const aiCreate = createBunnyHelixAction<Book, BookForm>({
 *   id: "ai-create",
 *   label: "AI Create",
 *   icon: <Sparkles size={16} />,
 *   variant: "accent",
 *   ai: { provider: "openai", model: "gpt-4o-mini" },
 *   inputFields: [
 *     { name: "brief", label: "Describe the record", type: "textarea", required: true },
 *   ],
 *   targets: [{ field: "title", prompt: "A catchy title" }],
 *   onCreate: "prefill",
 * });
 * feature.configureHeader((h) => h.addAction(aiCreate));
 * ```
 *
 * @param config - The bunny-helix action configuration.
 * @returns A `BunnyHeaderAction` ready to add via `configureHeader`.
 */
export function createBunnyHelixAction<
  TRow = unknown,
  TForm = Record<string, unknown>,
>(config: BunnyHelixActionConfig<TForm>): BunnyHeaderAction<TRow, TForm> {
  return {
    id: config.id,
    label: config.label,
    icon: config.icon,
    variant: config.variant,
    render: () => <BunnyHelixActionHost<TRow, TForm> config={config} />,
  };
}

/**
 * Hook-style alias of {@link createBunnyHelixAction}.
 *
 * Kept for API compatibility; because it delegates to the plain factory it may
 * also be called from module scope, but prefer `createBunnyHelixAction` there.
 *
 * @param config - The bunny-helix action configuration.
 * @returns A `BunnyHeaderAction` ready to add via `configureHeader`.
 */
export function useBunnyHelixAction<
  TRow = unknown,
  TForm = Record<string, unknown>,
>(config: BunnyHelixActionConfig<TForm>): BunnyHeaderAction<TRow, TForm> {
  return createBunnyHelixAction<TRow, TForm>(config);
}