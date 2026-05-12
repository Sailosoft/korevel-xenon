import { useAdminPanelContext } from "@/src/modules/admin-panel/features/provider";
import { Button, Modal } from "@heroui/react";
import { CircleCheck } from "lucide-react";
import { ReactNode, useCallback, useMemo } from "react";
import { useBunnyConfig } from "../context/BunnyContext";

export default function BunnyModal({
  children,
  onPrimaryAction,
}: {
  children: ReactNode;
  onPrimaryAction?: () => void;
}) {
  const { modal } = useAdminPanelContext();
  const { title, modalSize, modalSizeWidth } = useBunnyConfig();
  const { isOpen, setIsOpen, mode } = modal;

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) setIsOpen(open);
  }, []);

  const dialogClassName = useMemo(() => {
    if (modalSizeWidth) return `sm:max-w-[${modalSizeWidth}px]`;

    return "";
  }, [modalSizeWidth]);

  const computedTitle = useMemo(
    () => `${mode} ${title}`.toUpperCase(),
    [mode, title],
  );

  return (
    <Modal>
      <Modal.Backdrop isOpen={isOpen} onOpenChange={handleOpenChange}>
        <Modal.Container size={modalSize}>
          <Modal.Dialog className={dialogClassName}>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{computedTitle}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>{children}</Modal.Body>
            <Modal.Footer>
              <Button slot="close" variant="secondary">
                Cancel
              </Button>
              <Button onClick={onPrimaryAction}>Confirm</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
