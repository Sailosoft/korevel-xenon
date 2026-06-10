import { UseAdminPanel } from "../../admin-panel/admin-panel.interface";
import {
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
  /** Width configuration for the table's row actions column 🚀 */
  rowActionsColWidth?: number; // 👈 Updated naming;

  /** Automatically pull in default platform header actions (create, refresh, etc.) */
  defaultHeaderActions?: boolean;
  /** Explicitly hide specific default header buttons */
  hideHeaderActions?: BunnyHeaderActionType[];
  /** Manually appended custom header items */
  headerActions?: BunnyHeaderAction<TRow, TForm>[];

  /** Automatically pull in default row actions (view, edit, delete) */
  defaultRowActions?: boolean;
  /** Explicitly hide specific default table row buttons */
  hideRowActions?: BunnyRowDefaultActions[];
  /** Manually appended custom row action items */
  rowActions?: BunnyRowAction<TRow>[];

  modalHeaderActions?: BunnyModalHeaderAction<TRow, TForm>[];

  /** Behavior after a successful form submission (create/update). Defaults to `{ mode: "openView" }` if not set. */
  onSuccess?: BunnyOnSuccessBehavior;

  tableMode?: BunnyTableMode;
  tableMobileView?: BunnyTableMobileView<TRow>;

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
