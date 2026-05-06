import { useCallback, useState } from "react";
import {
  UseAdminPanelDeleteProps,
  UseAdminPanelDeleteReturn,
} from "./admin-panel-del.interface";

export function useAdminPanelDelete<T = any>({
  mutation,
  table,
  modal,
  notify,
  successMessage = "Record deleted successfully",
  confirmMessage = (item: T) => `Are you sure you want to delete ${itemName}?`,
  itemName = "record",
}: UseAdminPanelDeleteProps<T>): UseAdminPanelDeleteReturn<T> {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const handleDelete = useCallback(
    async (id: string | number) => {
      setIsDeleting(true);
      setError(null);

      try {
        const result = await mutation(id);

        if (result?.status === "success") {
          // Success handling
          notify?.success(successMessage);

          // Refresh table (keep current query options)
          await table.fetchData?.();

          // Close modal if open
          modal.closeModal();
        } else {
          const err = new Error(result?.message || "Delete failed");
          setError(err);
          notify?.error(result?.message || "Failed to delete record");
        }
      } catch (err) {
        const errorObj =
          err instanceof Error ? err : new Error("Delete operation failed");
        setError(errorObj);
        notify?.error(errorObj.message);
      } finally {
        setIsDeleting(false);
      }
    },
    [mutation, table, modal, notify, successMessage],
  );

  const deleteItem = useCallback(
    async (id: string | number) => {
      await handleDelete(id);
    },
    [handleDelete],
  );

  const openDeleteConfirm = useCallback(
    (id: string | number) => {
      if (!id) {
        console.error("Cannot delete: ID is missing");
        return;
      }

      // Open modal in delete mode (or use 'plain' with context)
      modal.openModal("plain"); // or you can extend mode to include 'delete'

      // You can store the item to delete in modal data if needed
    },
    [modal],
  );

  const closeDeleteModal = useCallback(() => {
    modal.closeModal();
    setError(null);
  }, [modal]);

  const deleteWithoutConfirm = useCallback(
    async (id: string | number) => {
      await handleDelete(id);
    },
    [handleDelete],
  );

  return {
    isDeleting,
    error,
    deleteItem,
    confirmMessage: useCallback(
      (item: T) => confirmMessage(item),
      [confirmMessage],
    ),
    openDeleteConfirm,
    closeDeleteModal,
    deleteWithoutConfirm,
  };
}
