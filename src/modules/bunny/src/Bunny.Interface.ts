import { UseAdminPanel } from "../../admin-panel/admin-panel.interface";
import {
  AdminPanelFormMode,
  UseAdminPanelForm,
  UseAdminPanelFormPropsWithoutQueryMutation,
} from "../../admin-panel/features/form/admin-panel-form.interface";
import { AdminPanelId } from "../../admin-panel/features/id/admin-panel-id.interface";
import { AdminPanelMutation } from "../../admin-panel/features/mutation/admin-panel-mutation.interface";
import { UseAdminPanelNotifyProps } from "../../admin-panel/features/notify/admin-panel-notify.interface";
import { AdminPanelQuery } from "../../admin-panel/features/query/admin-panel-query.interface";
import { UseAdminPanelTablePropsWithoutQuery } from "../../admin-panel/features/table/admin-panel-table.interface";
import { BunnyFormConfig } from "./form/BunnyForm.Interface";
import {
  BunnyHeaderAction,
  BunnyHeaderActionType,
  BunnyHeaderConfig,
} from "./header/BunnyHeader.Interface";
import { BunnyModalHeaderAction } from "./modal/BunnyModal.Interface";
import { BunnyRouter } from "./router/BunnyRouter.interface";
import { BunnyRowDefaultActions } from "./rows/BunnyRow.Interface";
import {
  BunnyColumn,
  BunnyRowAction,
  BunnyTableMobileView,
  BunnyTableMode,
} from "./table/BunnyTable.Interface";

/**
 * A validation adapter decouples Bunny from any specific validation library (Zod, Yup, Joi, etc.).
 *
 * - Implement this interface in your **consumer project** where your validation library lives.
 * - Bunny imports **only this interface** — zero foreign dependencies.
 * - The adapter's `validate()` returns `Record<string, string>` (field → error message),
 *   which maps directly to `form.setFormError()`.
 *
 * @example
 * ```ts
 * // Zod adapter in your project
 * const adapter: BunnyValidationAdapter<MyForm> = {
 *   validate(formData) {
 *     const r = myZodSchema.safeParse(formData);
 *     if (r.success) return {};
 *     // flatten Zod issues into field → message
 *     const errors: Record<string, string> = {};
 *     for (const issue of r.error.issues) {
 *       const path = issue.path.join(".");
 *       if (!errors[path]) errors[path] = issue.message;
 *     }
 *     return errors;
 *   },
 * };
 * ```
 */
export interface BunnyValidationAdapter<TForm = Record<string, unknown>> {
  /**
   * Validates `formData` and returns field-level error messages.
   * Return an **empty object** `{}` when validation passes.
   * Each key is a field path (e.g. `"title"`, `"address.city"`),
   * each value is a human-readable error message.
   */
  validate: (formData: TForm) => Record<string, string>;
}

export type BunnyCustomize<TRow, TForm> = (
  admin: UseAdminPanel<TRow, TForm>,
  config: BunnyConfig<TRow, TForm>,
) => Partial<BunnyConfig<TRow, TForm>>;

export interface BunnyProps<TRow, TForm> {
  children: React.ReactNode;
  config: BunnyConfig<TRow, TForm>;
}

export interface ExtendedBunnyProps<TRow, TForm> extends BunnyProps<
  TRow,
  TForm
> {
  customize?: BunnyCustomize<TRow, TForm>;
}

export type BunnyModalSize = "xs" | "sm" | "md" | "lg" | "cover" | "full";

/**
 * Defines the behavior after a successful form submission (create/update).
 *
 * - `openView` (default): opens the modal in view mode with the created/updated id.
 * - `closeOnly`: closes the modal after success without navigating.
 * - `redirect`: navigates to a route using the router. If `route` is specified,
 *   navigates to `/{route}/{id}`, otherwise navigates to `currentRoute/{id}`.
 */
export type BunnyOnSuccessBehavior =
  | { mode: "openView" }
  | { mode: "closeOnly" }
  | { mode: "redirect"; route?: string };

export interface BunnyConfig<TRow = unknown, TForm = unknown> {
  title: string;
  /** URL pattern that this module handles — matched against `window.location.pathname`
   *  during Next.js inference to determine which BunnyPackage to activate.
   *  Supports exact paths (`/books`), prefix wildcards (`/books/*`), and regex patterns (`/^\/books\//`). */
  module_url?: string;
  titlePlural?: string;
  modalSizeWidth?: number;
  modalSize?: BunnyModalSize;
  columns: BunnyColumn<TRow>[];
  rowKey: keyof TRow;
  tableHeight?: number | string;
  query: AdminPanelQuery<TRow, TForm>;
  mutation: AdminPanelMutation<TForm>;
  rowActionsColLength?: number;
  /** * Accepts a static config object or a function that receives the form context
   * and returns a config — useful for dynamically adjusting fields based on formData.
   * * ⚠️ PERFORMANCE TIP: If using function mode, declare the function outside the component
   * or wrap it in React.useCallback to prevent redundant table/config recalculations.
   */
  formConfig?:
    | BunnyFormConfig<TForm>
    | ((form: UseAdminPanelForm<TForm>) => BunnyFormConfig<TForm>);

  /**
   * Optional validation adapter.
   *
   * When provided, this takes **precedence** over the built-in field-level rules
   * (`BunnyValidationRule`). Use this to plug in Zod, Yup, Joi, or any custom
   * validation logic without adding those libraries as Bunny dependencies.
   *
   * The adapter must be implemented in your **consumer project** where your
   * validation library lives.
   *
   * @example
   * ```ts
   * import { useBunnyZodAdapter } from "@/modules/bunny/adapters/BunnyZodAdapter";
   * import { z } from "zod";
   *
   * const schema = z.object({ title: z.string().min(1) });
   *
   * <Bunny config={{
   *   formConfig: myFormConfig,
   *   validationAdapter: useBunnyZodAdapter(schema),
   * }} />
   * ```
   */
  validationAdapter?: BunnyValidationAdapter<TForm>;

  /** Width configuration for the table's row actions column 🚀 */
  rowActionsColWidth?: number; // 👈 Updated naming;

  /** Automatically pull in default platform header actions (create, refresh, etc.) */
  defaultHeaderActions?: boolean;
  /** Explicitly hide specific default header buttons */
  hideHeaderActions?: BunnyHeaderActionType[];
  /** Manually appended custom header items */
  headerActions?: BunnyHeaderAction<TRow, TForm>[];

  /** Header display configuration (icon, description, variant) */
  header?: BunnyHeaderConfig;

  /** Automatically pull in default row actions (view, edit, delete) */
  defaultRowActions?: boolean;
  /** Explicitly hide specific default table row buttons */
  hideRowActions?: BunnyRowDefaultActions[];
  /** Manually appended custom row action items */
  rowActions?: BunnyRowAction<TRow>[];

  modalHeaderActions?: BunnyModalHeaderAction<TRow, TForm>[];

  /** Behavior after a successful form submission (create/update). Defaults to `{ mode: "openView" }` if not set. */
  onFormSuccess?: BunnyOnSuccessBehavior;

  tableMode?: BunnyTableMode;
  tableMobileView?: BunnyTableMobileView<TRow>;

  /** Before Form Submit */
  beforeFormSubmit?: (form: Partial<TForm>, mode: AdminPanelFormMode) => Partial<TForm>;

  props?: {
    table?: Partial<UseAdminPanelTablePropsWithoutQuery<TRow>>;
    form?: Partial<UseAdminPanelFormPropsWithoutQueryMutation<TForm>>;
    notify?: Partial<UseAdminPanelNotifyProps>;
  };
}

export interface BunnyHasId {
  id: AdminPanelId;
}

export interface BunnyKernel<TRow, TForm> {
  config: BunnyConfig<TRow, TForm>;
  adminPanel: UseAdminPanel<TRow, TForm>;
  router: BunnyRouter;
}
