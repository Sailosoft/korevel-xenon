import {
  AdminPanelFormActionState,
  AdminPanelFormFieldDefinition,
} from "../form-fields/admin-panel-form-field.interface";
import { ReactNode } from "react";

/**
 * Core UI state for managing the Admin Panel Dialog visibility and basic messaging.
 */
export interface AdminPanelDialogState {
  /** Tracks whether the dialog overlay is currently visible. */
  open: boolean;
  /** Toggles loading/spinner states on buttons during processing. */
  loading: boolean;
  /** The main body text or prompt description shown inside the dialog. */
  message?: string;
  /** Custom text for the confirmation/affirmative button (e.g., "Save", "Delete"). */
  labelPositive?: string;
  /** Custom text for the cancellation/dismiss button (e.g., "Cancel", "Go Back"). */
  labelNegative?: string;
  /** The header title text of the dialog window. */
  title?: string;
  /** Headless fields layout injected on-demand */
  fields?: AdminPanelFormFieldDefinition[];
  /** When true, renders a full-cover content-only dialog without form/buttons */
  contentOnly?: boolean;
  /** Custom React content rendered inside the dialog body (used when contentOnly is true) */
  children?: ReactNode;
}

/**
 * Dynamic configuration payload passed when opening a headless dialog.
 * Extracts text/label configurations from the state and couples them with functional callbacks.
 *
 * @template TContext - The execution engine or operational context passed to the handler.
 */
export type AdminPanelDialogOption<TContext = unknown> = Omit<
  AdminPanelDialogState,
  "open" | "loading"
> & {
  /** Unique identifier indicating which specific operation or form strategy to execute. */
  actionId: string;
  /**
   * Execution pipeline triggered when the user submits or confirms the dialog.
   */
  onConfirm: (options: {
    prevState?: AdminPanelFormActionState;
    form: FormData;
    context: TContext;
  }) => AdminPanelFormActionState | Promise<AdminPanelFormActionState>;

  /** Optional cleanup hook executed when the user explicitly dismisses or cancels the dialog. */
  onCancel?: () => void;

  /** Custom React content rendered inside the dialog body (used when contentOnly is true) */
  children?: ReactNode;
};

export interface UseAdminPanelDialog extends AdminPanelDialogState {
  /**
   * Triggers the dialog to open, injecting a context-specific layout and execution strategy.
   *
   * @template TContext - Implicitly or explicitly defined operational context type.
   */
  openDialog<TContext>(option: AdminPanelDialogOption<TContext>): void;

  /**
   * Programmatically closes the dialog window and resets transient display states.
   */
  closeDialog(): void;
  triggerConfirm<TContext>(form: FormData, context: TContext): void;
  /**
   * Combined action execution pipeline.
   * Accepts the context explicitly via the runner, currying it into useActionState.
   */
  executeAction<TContext>(
    prevState: AdminPanelFormActionState,
    payload: { formData: FormData; context: TContext },
  ): Promise<AdminPanelFormActionState>;

  setLoading(loading: boolean): void;
}
