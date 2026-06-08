import { UseAdminPanelDialog } from "@/src/modules/admin-panel/features/dialog/admin-panel-dialog.interface";
import { Button, Modal, Spinner } from "@heroui/react";
import {
  ReactNode,
  startTransition,
  useActionState,
  useCallback,
  useMemo,
} from "react";
import BunnyDialogFieldBuilder from "../form/builder/BunnyDialogFieldBuilder";

function Label({ children }: { children: ReactNode }) {
  return <span className="text-sm font-medium">{children}</span>;
}

interface BunnyDialogProps<TContext> {
  /** The initialized dialog tracking state and trigger pipeline hook. */
  dialog: UseAdminPanelDialog;
  /** The specific runtime pipeline context containing state engines or methods. */
  context: TContext;
  /** Optional custom form fields or node structure overriding standard text. */
  children?: ReactNode;
}

export default function BunnyDialog<TContext>({
  dialog,
  context,
  children,
}: BunnyDialogProps<TContext>) {
  const {
    open,
    loading,
    title,
    message,
    labelPositive,
    labelNegative,
    fields,
    closeDialog,
    executeAction,
  } = dialog;
  const [formState, formDispatch, isPending] = useActionState(
    executeAction<TContext>,
    {
      success: false,
      errors: {},
      values: {},
    },
  );
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (loading || isPending) return; // Matches BunnyModal loading block[cite: 8]
      if (!isOpen) closeDialog();
    },
    [closeDialog, loading, isPending],
  );

  const dialogClassName = useMemo(() => {
    // Matches BunnyModal styling rules for loading anchors and constraints[cite: 8]
    return "relative overflow-hidden w-full sm:max-w-[440px]";
  }, []);

  const handleSubmit = useCallback(
    (e: React.SubmitEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (loading || isPending) return;

      const formData = new FormData(e.currentTarget);
      // Fire dispatch tracking both the native form data and your custom dynamic context
      startTransition(() => {
        formDispatch({
          formData,
          context: context,
        });
      });
    },
    [loading, isPending, context, formDispatch],
  );

  return (
    <Modal.Backdrop
      isOpen={open}
      onOpenChange={handleOpenChange}
      isDismissable={false}
    >
      <Modal.Container>
        <Modal.Dialog className={dialogClassName}>
          {/* --- TOP LAYER LOADING OVERLAY (Mirrors BunnyModal structure) --- */}
          {(loading || isPending) && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/70 dark:bg-black/70 backdrop-blur-[1px] transition-all animate-fade-in">
              <div className="flex flex-col items-center gap-3 p-4 rounded-xl">
                <Spinner size="lg" color="current" />
                <Label>Processing...</Label>
              </div>
            </div>
          )}

          <Modal.CloseTrigger isDisabled={loading || isPending} />

          <Modal.Header className="w-full pr-12">
            <Modal.Heading>
              {title ?? "Are you sure you want to done this action?"}
            </Modal.Heading>
          </Modal.Header>

          <form onSubmit={handleSubmit}>
            <Modal.Body>
              {children
                ? children
                : message && (
                    <p className="text-sm text-default-600 leading-relaxed">
                      {message}
                    </p>
                  )}
              {/* Integrates your updated HeroUI Field Builder mapping with formState validation feedback loop */}
              {fields && (
                <BunnyDialogFieldBuilder
                  fields={fields}
                  formState={formState}
                />
              )}

              {/* General API error banner presentation */}
              {formState?.message && (
                <div className="p-3 text-xs font-medium text-danger bg-danger-50 rounded-lg border border-danger-100">
                  {formState.message}
                </div>
              )}
            </Modal.Body>

            <Modal.Footer>
              <Button
                type="button"
                variant="secondary"
                onClick={closeDialog}
                isDisabled={loading || isPending}
              >
                {labelNegative}
              </Button>
              <Button
                type="submit"
                variant="primary"
                isDisabled={loading || isPending}
              >
                {labelPositive}
              </Button>
            </Modal.Footer>
          </form>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
