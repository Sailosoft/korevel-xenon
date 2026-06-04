import { useAdminPanelContext } from "@/src/modules/admin-panel/features/provider";
import { Button, Dropdown, Modal, Spinner } from "@heroui/react";
import { ReactNode, useCallback, useMemo } from "react";
import { useBunnyConfig } from "../context/BunnyContext";
import { UseAdminPanel } from "@/src/modules/admin-panel/admin-panel.interface";
import { MoreVerticalIcon } from "lucide-react";
import { AdminPanelFormMode } from "@/src/modules/admin-panel/features/form/admin-panel-form.interface";
import { BunnyKernel } from "../Bunny.Interface";
import { useBunnyKernel } from "../kernel";

function Label({ children }: { children: ReactNode }) {
  return <span className="text-sm font-medium">{children}</span>;
}

export default function BunnyModal({
  children,
  onPrimaryAction,
}: {
  children: ReactNode;
  onPrimaryAction?: () => void;
}) {
  const kernel = useBunnyKernel();
  const { adminPanel: admin,  } = kernel;
  const { modal } = admin;
  const { title, modalSize, modalSizeWidth, modalHeaderActions } =
    useBunnyConfig();
  const { isOpen, setIsOpen, mode, isLoading } = modal;

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (isLoading) return;
      if (!open) setIsOpen(open);
    },
    [setIsOpen, isLoading],
  );

  const dialogClassName = useMemo(() => {
    // added standard relative positioning to safely anchor our loading layer
    const base = "relative overflow-hidden";
    if (modalSizeWidth) return `${base} sm:max-w-[${modalSizeWidth}px]`;

    return base;
  }, [modalSizeWidth]);

  const computedTitle = useMemo(() => {
    const rawTitle = `${mode} ${title}`;
    return rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1).toLowerCase();
  }, [mode, title]);

  const handleDropdownAction = useCallback(
    (key: string | number) => {
      if (!modalHeaderActions || isLoading) return;
      const targetedAction = modalHeaderActions.find((action, index) => {
        const actionId = action.id || `overflow-${index}`;
        return actionId === String(key);
      });
      if (targetedAction) {
        targetedAction.onClick(kernel);
      }
    },
    [modalHeaderActions, kernel],
  );

  // Evaluates the hide arrays or function rules safely
  const visibleHeaderActions = useMemo(() => {
    if (!modalHeaderActions) return [];

    return modalHeaderActions.filter((action) => {
      if (!action.hide) return true;

      // Handle Array of AdminPanelFormModes
      if (Array.isArray(action.hide)) {
        return !action.hide.includes(mode as AdminPanelFormMode);
      }

      // Handle Evaluation Callback Function
      if (typeof action.hide === "function") {
        return !action.hide(kernel);
      }

      return true;
    });
  }, [modalHeaderActions, mode, kernel]);

  return (
    <Modal.Backdrop
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      isDismissable={false}
    >
      <Modal.Container size={modalSize}>
        <Modal.Dialog className={dialogClassName}>
          {/* --- TOP LAYER LOADING OVERLAY --- */}
          {isLoading && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/70 dark:bg-black/70 backdrop-blur-[1px] transition-all animate-fade-in">
              <div className="flex flex-col items-center gap-3 p-4 rounded-xl">
                {/* HeroUI Spinner or custom Tailwind layout */}
                <Spinner size="lg" color="current" />
                <Label>Loading...</Label>

                {/* FALLBACK: If HeroUI Spinner is missing, uncomment below: */}
                {/* 
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-medium text-default-600">Processing...</span> 
                */}
              </div>
            </div>
          )}
          <Modal.Header className="w-full pr-12">
            <div className="flex items-center w-full gap-4">
              {/* Heading and dropdown trigger are now forced onto the same line with space-between spacing */}
              {/* Renders dropdown ONLY if visible actions exist after conditional evaluation */}

              <Modal.Heading>{computedTitle}</Modal.Heading>
              {visibleHeaderActions.length > 0 && (
                <div>
                  <Dropdown>
                    <Button
                      aria-label="More options"
                      variant="tertiary"
                      size="sm"
                    >
                      <MoreVerticalIcon className="size-4 shrink-0" />
                    </Button>
                    <Dropdown.Popover>
                      <Dropdown.Menu onAction={handleDropdownAction}>
                        {visibleHeaderActions.map((action, index) => {
                          const actionId = action.id || `overflow-${index}`;
                          const isDanger =
                            action.variant === "danger" ||
                            action.variant === "danger-soft";

                          return (
                            <Dropdown.Item
                              key={actionId}
                              id={actionId}
                              textValue={action.label}
                              variant={isDanger ? "danger" : "default"}
                            >
                              {action.render ? (
                                action.render()
                              ) : (
                                <div className="flex items-center gap-2">
                                  {action.icon}
                                  <Label>{action.label}</Label>
                                </div>
                              )}
                            </Dropdown.Item>
                          );
                        })}
                      </Dropdown.Menu>
                    </Dropdown.Popover>
                  </Dropdown>
                </div>
              )}

              <Modal.CloseTrigger />
            </div>
          </Modal.Header>
          <Modal.Body>{children}</Modal.Body>
          {mode === "view" || (
            <Modal.Footer>
              <Button slot="close" variant="secondary">
                Cancel
              </Button>
              <Button onClick={onPrimaryAction}>Confirm</Button>
            </Modal.Footer>
          )}
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
