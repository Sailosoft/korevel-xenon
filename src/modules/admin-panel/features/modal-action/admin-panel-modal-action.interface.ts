import { BunnyKernel } from "@/src/modules/bunny/src/Bunny.Interface";

/**
 * Core UI state for managing the Admin Panel Modal visibility and basic messaging.
 */
export interface AdminPanelModalActionState {
  /** Tracks whether the modal overlay is currently visible. */
  open: boolean;
  /** Toggles loading/spinner states on buttons during processing. */
  loading: boolean;
  /** The main body text or prompt description shown inside the modal. */
  message?: string;
  /** Custom text for the confirmation/affirmative button (e.g., "Save", "Delete"). */
  labelPositive?: string;
  /** Custom text for the cancellation/dismiss button (e.g., "Cancel", "Go Back"). */
  labelNegative?: string;
  /** The header title text of the modal window. */
  title?: string;
}

type ModalActionInterface<TRow = any, TForm = any> = Omit<
  AdminPanelModalActionState,
  "open" | "loading"
> & {
  /** Unique identifier indicating which specific operation or form strategy to execute. */
  actionId: string;

  /**
   * Execution pipeline triggered when the user submits or confirms the modal.
   *
   * @param form - Raw browser FormData instance extracted from the submission event.
   * @param context - The operational engine context containing specialized state and methods.
   */
  onConfirm: (form: FormData, context: BunnyKernel<TRow, TForm>) => void;

  /** Optional cleanup hook executed when the user explicitly dismisses or cancels the modal. */
  onCancel?: () => void;
};

export interface UseAdminPanelModalAction extends AdminPanelModalActionState {
  /**
   * Triggers the modal to open, injecting a context-specific layout and execution strategy.
   *
   */
  openActionModal<TRow, TForm>(option: ModalActionInterface<TRow, TForm>): void;

  /**
   * Programmatically closes the modal window and resets transient display states.
   */
  closeActionModal(): void;
}
