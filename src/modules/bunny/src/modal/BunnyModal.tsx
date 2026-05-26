import { useAdminPanelContext } from "@/src/modules/admin-panel/features/provider";
import { Button, Dropdown, Modal } from "@heroui/react";
import { ReactNode, useCallback, useMemo } from "react";
import { useBunnyConfig } from "../context/BunnyContext";
import { UseAdminPanel } from "@/src/modules/admin-panel/admin-panel.interface";
import { MoreVerticalIcon } from "lucide-react";
import { AdminPanelFormMode } from "@/src/modules/admin-panel/features/form/admin-panel-form.interface";

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
  const admin = useAdminPanelContext();
  const bunny = useBunnyConfig();
  const { modal } = admin;
  const { title, modalSize, modalSizeWidth, modalHeaderActions } =
    useBunnyConfig();
  const { isOpen, setIsOpen, mode } = modal;

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) setIsOpen(open);
    },
    [setIsOpen],
  );

  const dialogClassName = useMemo(() => {
    if (modalSizeWidth) return `sm:max-w-[${modalSizeWidth}px]`;

    return "";
  }, [modalSizeWidth]);

  const computedTitle = useMemo(() => {
    const rawTitle = `${mode} ${title}`;
    return rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1).toLowerCase();
  }, [mode, title]);

  const handleDropdownAction = useCallback(
    (key: string | number) => {
      if (!modalHeaderActions) return;
      const targetedAction = modalHeaderActions.find((action, index) => {
        const actionId = action.id || `overflow-${index}`;
        return actionId === String(key);
      });
      if (targetedAction) {
        targetedAction.onClick({
          config: bunny,
          panel: admin,
        });
      }
    },
    [modalHeaderActions, admin],
  );

  const kernelContext = useMemo(
    () => ({
      config: bunny,
      panel: admin,
    }),
    [bunny, admin],
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
        return !action.hide(kernelContext);
      }

      return true;
    });
  }, [modalHeaderActions, mode, kernelContext]);

  return (
    <Modal.Backdrop
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      isDismissable={false}
    >
      <Modal.Container size={modalSize}>
        <Modal.Dialog className={dialogClassName}>
          <Modal.CloseTrigger />
          <Modal.Header className="w-full pr-12">
            <div className="flex items-center w-full gap-4">
              {/* Heading and dropdown trigger are now forced onto the same line with space-between spacing */}
              {/* Renders dropdown ONLY if visible actions exist after conditional evaluation */}
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
              <Modal.Heading>{computedTitle}</Modal.Heading>
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
