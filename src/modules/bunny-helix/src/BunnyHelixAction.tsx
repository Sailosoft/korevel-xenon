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

import { useCallback, useMemo } from "react";
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

function BunnyHelixActionHost<TRow, TForm>({
  config,
}: {
  config: BunnyHelixActionConfig<TForm>;
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

      const moduleFields = deriveModuleFields(typedKernel);

      setState((prev) => ({
        ...prev,
        progress: "Building generation schema…",
      }));

      const schemaResult = await buildBunnyHelixSchema<TForm>(
        config.targets,
        moduleFields,
      );

      const fieldPrompts = buildFieldPrompts(config.targets, moduleFields);
      const promptCtx: BunnyHelixPromptContext<TForm> = {
        title: typedKernel.config.title,
        inputs: formData as TForm,
        fieldPrompts,
      };
      const system = resolveSystemPrompt(config, promptCtx);
      const user = buildUserPrompt(
        formData as Record<string, unknown>,
        fieldPrompts,
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
  const formConfig = useMemo(
    () => ({
      id: config.id,
      label: config.label,
      icon: config.icon,
      variant: config.variant,
      modalTitle: config.modalTitle || config.label,
      submitLabel: config.submitLabel || config.label,
      cancelLabel: config.cancelLabel,
      formFields: config.inputFields as BunnyFormField[],
      submitAction,
    }),
    [config, submitAction],
  );

  const action = useBunnyHeaderActionForm<Record<string, unknown>>(
    formConfig as never,
  );

  return (
    <>
      <Button variant={toButtonVariant(config.variant)} onClick={() => action.onClick?.()}>
        {config.icon}
        <span className="hidden sm:inline ml-1">{config.label}</span>
      </Button>
      {action.render ? action.render(providerKernel) : null}
    </>
  );
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