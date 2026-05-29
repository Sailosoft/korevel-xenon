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

/**
 * Dynamic configuration payload passed when opening a headless modal action.
 * Extracts text/label configurations from the state and couples them with functional callbacks.
 * * @template TContext - The execution engine or operational context passed to the handler.
 */
export type ModalActionInterface<TContext = any> = Omit<
  AdminPanelModalActionState,
  "open" | "loading"
> & {
  /** Unique identifier indicating which specific operation or form strategy to execute. */
  actionId: string;

  /**
   * Execution pipeline triggered when the user submits or confirms the modal.
   * * @param form - Raw browser FormData instance extracted from the submission event.
   * @param context - The dynamic context engine containing specialized runtime state and methods.
   */
  onConfirm: (form: FormData, context: TContext) => void;

  /** Optional cleanup hook executed when the user explicitly dismisses or cancels the modal. */
  onCancel?: () => void;
};

export interface UseAdminPanelModalAction extends AdminPanelModalActionState {
  /**
   * Triggers the modal to open, injecting a context-specific layout and execution strategy.
   * * @template TContext - Implicitly or explicitly defined operational context type.
   */
  openActionModal<TContext>(option: ModalActionInterface<TContext>): void;

  /**
   * Programmatically closes the modal window and resets transient display states.
   */
  closeActionModal(): void;
}
