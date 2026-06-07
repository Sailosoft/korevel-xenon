import { useAdminPanelContext } from "@/src/modules/admin-panel/features/provider";
import { Button, Modal } from "@heroui/react";

export default function BunnyDeleteModal() {
  const {
    del: { open, setOpen, deleteItem, mode },
  } = useAdminPanelContext();
  return (
    <Modal.Backdrop isOpen={open} onOpenChange={setOpen}>
      <Modal.Container>
        <Modal.Dialog>
          <Modal.CloseTrigger /> {/* Optional: Close button */}
          <Modal.Header>
            <Modal.Heading>Delete</Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            {mode === "batch" ? (
              <p>Are you sure you want to delete this items?</p>
            ) : (
              <p>Are you sure you want to delete this item?</p>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Modal.CloseTrigger />
            <Button slot="close" variant="secondary">
              Cancel
            </Button>
            <Button variant="danger" onClick={deleteItem}>
              Delete
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
