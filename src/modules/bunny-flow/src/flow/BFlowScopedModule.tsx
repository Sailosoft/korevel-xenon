// BFlowScopedModule.tsx
//
// Helper to create a scoped BunnyConfig that automatically injects a scope
// field (e.g. definitionId / flowId) into queries, mutations, and forms.
// Used inside /modules/bunny-flow/flow/[id]/* pages so that every module
// is automatically filtered by the current flow definition.

"use client";

import type { BunnyConfig } from "@/src/modules/bunny/src/Bunny.Interface";
import type { BunnyFormConfig } from "@/src/modules/bunny/src/form/BunnyForm.Interface";

/**
 * Creates a new `BunnyConfig` from a base module that is scoped to a specific
 * value of a field (e.g. `definitionId` or `flowId`).
 *
 * - `query.getAll` will filter returned rows to those matching `scopeValue`.
 * - `mutation.create` will automatically inject `{ [scopeField]: scopeValue }`
 *    into the payload so the user doesn't have to pick it.
 * - `formConfig` will have the scope field removed from the rendered fields.
 */
export function createScopedBunnyConfig<
  TRow extends Record<string, unknown>,
  TForm extends Record<string, unknown>,
>(
  baseConfig: BunnyConfig<TRow, TForm>,
  scopeField: keyof TRow,
  scopeValue: string,
): BunnyConfig<TRow, TForm> {
  // ── Shallow-clone the top-level config ──────────────────────────
  const scoped = { ...baseConfig } as BunnyConfig<TRow, TForm>;

  // ── Scope query.getAll ──────────────────────────────────────────
  const originalGetAll = baseConfig.query.getAll;
  scoped.query = {
    ...baseConfig.query,
    getAll: async (options) => {
      const result = await originalGetAll(options);
      return {
        ...result,
        data: result.data.filter(
          (item) =>
            (item as unknown as Record<string, unknown>)[
              scopeField as string
            ] === scopeValue,
        ),
      };
    },
  };

  // ── Scope mutation.create ───────────────────────────────────────
  if (baseConfig.mutation.create) {
    const originalCreate = baseConfig.mutation.create;
    scoped.mutation = {
      ...baseConfig.mutation,
      create: async (data) => {
        const dataWithScope = {
          ...(data as unknown as Record<string, unknown>),
          [scopeField as string]: scopeValue,
        } as TForm;
        return originalCreate(dataWithScope);
      },
    };
  }

  // ── Remove the scope field from the form configuration ──────────
  const rawForm = scoped.formConfig;
  if (rawForm && typeof rawForm !== "function") {
    const formCfg = rawForm as BunnyFormConfig<TForm>;
    scoped.formConfig = {
      ...formCfg,
      fields: formCfg.fields.filter((f) => f.name !== (scopeField as string)),
    };
  }

  return scoped;
}
