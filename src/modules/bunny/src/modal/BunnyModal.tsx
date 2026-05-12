import { useAdminPanelContext } from "@/src/modules/admin-panel/features/provider";
import { Button, Modal } from "@heroui/react";
import { CircleCheck } from "lucide-react";
import { ReactNode, useCallback, useMemo } from "react";
import { useBunnyConfig } from "../context/BunnyContext";

export default function BunnyModal({ children }: { children: ReactNode }) {
  const { modal } = useAdminPanelContext();
  const { title, modalSize } = useBunnyConfig();
  const { isOpen, setIsOpen } = modal;

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) setIsOpen(open);
  }, []);

  const dialogClassName = useMemo(() => {
    if (modalSize) return `sm:max-w-[${modalSize}px]`;

    return "sm:max-w-[700px]";
  }, [modalSize]);

  return (
    <Modal>
      <Modal.Backdrop isOpen={isOpen} onOpenChange={handleOpenChange}>
        <Modal.Container>
          <Modal.Dialog className={dialogClassName}>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{title}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>{children}</Modal.Body>
            <Modal.Footer>
              <Button slot="close" variant="secondary">
                Cancel
              </Button>
              <Button slot="close">Confirm</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
