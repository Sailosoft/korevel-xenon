/**
 * BunnyHelixFlow — Post-generation handlers for applying AI-generated data to
 * the module: prefill the module create modal or create the record directly.
 *
 * Both return a `{ ok, error? }` tuple so the caller can surface failures in
 * the header-action modal without a partial create ever persisting.
 */

import type { BunnyKernel } from "@/src/modules/bunny/src/Bunny.Interface";
import type { AdminPanelResult } from "@/src/modules/admin-panel/shared/admin-panel-result";

/** Result of a flow handler. */
export interface BunnyHelixFlowResult {
  ok: boolean;
  error?: string;
}

function firstError(errors: Record<string, string>): string | undefined {
  const first = Object.values(errors)[0];
  return first;
}

/**
 * Open the module's create modal pre-filled with the generated data.
 *
 * The modal's `useEffect → resetForm()` runs when `isOpen` flips true; the
 * generated values must be applied AFTER that reset, so the merge is deferred
 * to the next macrotask.
 *
 * @param kernel - The active `BunnyKernel`.
 * @param data - AI-generated record fields.
 */
export function prefillCreate<TRow, TForm>(
  kernel: BunnyKernel<TRow, TForm>,
  data: Record<string, unknown>,
): BunnyHelixFlowResult {
  const { modal, form } = kernel.adminPanel;

  modal.openCreate();

  setTimeout(() => {
    form.setFormData((prev: TForm) => ({
      ...(prev as Record<string, unknown>),
      ...data,
    }) as TForm);
  }, 0);

  return { ok: true };
}

/**
 * Create the record directly with the generated data and refresh the table.
 *
 * Runs the module's validation adapter first (if configured), then the create
 * mutation. Only on `AdminPanelResult.status === "success"` does it refresh the
 * table and notify success. Errors are surfaced via a returned message — the
 * caller (modal) displays it; nothing is persisted on failure.
 *
 * @param kernel - The active `BunnyKernel`.
 * @param data - AI-generated record fields.
 */
export async function directCreate<TRow, TForm>(
  kernel: BunnyKernel<TRow, TForm>,
  data: Record<string, unknown>,
): Promise<BunnyHelixFlowResult> {
  const { config, adminPanel } = kernel;
  const { table, notify } = adminPanel;
  const { mutation } = config;

  if (config.validationAdapter) {
    const errors = config.validationAdapter.validate(data as TForm);
    const keys = Object.keys(errors);
    if (keys.length > 0) {
      const message = firstError(errors);
      return {
        ok: false,
        error: message
          ? `Validation failed (${keys[0]}): ${message}`
          : "Validation failed. Please review the generated values.",
      };
    }
  }

  let result: AdminPanelResult<TForm, Error | unknown> | undefined;
  try {
    result = await mutation.create(data as TForm);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Record creation failed.";
    notify.error(message);
    return { ok: false, error: message };
  }

  if (result?.status === "success") {
    await table.fetchData();
    notify.success("Record created successfully.");
    return { ok: true };
  }

  if (result?.message) {
    notify.error(result.message);
    return { ok: false, error: result.message };
  }

  if (result?.status === "validation-error") {
    const message = "The generated values failed server-side validation.";
    notify.error(message);
    return { ok: false, error: message };
  }

  const message = "Record creation failed.";
  notify.error(message);
  return { ok: false, error: message };
}
