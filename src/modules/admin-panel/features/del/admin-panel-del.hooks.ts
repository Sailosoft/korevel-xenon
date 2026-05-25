import { useCallback, useState } from "react";
import {
  UseAdminPanelDeleteProps,
  UseAdminPanelDelete,
  AdminPanelDeleteMode,
} from "./admin-panel-del.interface";
import { AdminPanelId } from "../id/admin-panel-id.interface";
import { adminPanelEvents } from "../event/admin-panel-event";

export function useAdminPanelDelete<TRow, TForm>({
  mutation,
  table,
  notify,
  successMessage = "Record deleted successfully",
  confirmMessage = (item: TRow) => `Are you sure you want to delete ${itemName}?`,
  itemName = "record",
}: UseAdminPanelDeleteProps<TRow, TForm>): UseAdminPanelDelete<TRow> {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AdminPanelDeleteMode>("single");
  const [id, setId] = useState<AdminPanelId | null>(null);

  const handleDelete = useCallback(
    async (id: AdminPanelId) => {
      setIsDeleting(true);
      setError(null);

      try {
        const result = await mutation.delete(id);

        if (result?.status === "success") {
          // notify?.success(successMessage);
          await table.fetchData?.();
          setOpen(false);
          console.log("call for emit");
          adminPanelEvents.emit("del:success");
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
    [mutation, table, notify],
  );

  const openDeleteConfirm = useCallback(
    (id: AdminPanelId) => {
      if (!id) {
        console.error("Cannot delete: ID is missing");
        return;
      }
      setOpen(true);
      setMode("single");
      setId(id);
    },
    [setOpen, setId, setMode],
  );

  const closeDeleteModal = useCallback(() => {
    setOpen(false);
    setError(null);
  }, [setOpen]);

  const deleteWithoutConfirm = useCallback(
    async (id: AdminPanelId) => {
      await handleDelete(id);
    },
    [handleDelete],
  );

  const openBatchDeleteConfirm = useCallback(() => {
    if (table.selection.length === 0) {
      return;
    }
    setOpen(true);
    setMode("batch");
  }, [table.selection]);

  // Inside useAdminPanelDelete.ts

  const deleteBatch = useCallback(async () => {
    setIsDeleting(true);
    setError(null);

    try {
      // Option A: If your API supports batch delete
      // const result = await mutation.deleteMany(ids);

      // Option B: Sequential deletion (fallback)
      const results = await Promise.all(
        table.selection.map((id) => mutation.delete(id)),
      );
      const allSuccessful = results.every((res) => res?.status === "success");

      if (allSuccessful) {
        await table.fetchData?.();
        table.setSelection([]);
        closeDeleteModal();
        adminPanelEvents.emit("del:success");
      } else {
        notify?.error("Some records failed to delete");
      }
    } catch (err) {

      setError(err instanceof Error ? err : new Error("Batch delete failed"));
      throw err instanceof Error ? err : new Error("Batch delete failed");
    } finally {
      setIsDeleting(false);
    }
  }, [table, mutation, closeDeleteModal, notify]);

  const deleteItem = useCallback(async () => {
    if (mode === "batch") {
      await deleteBatch();
    } else {
      if (!id) return;
      await handleDelete(id);
    }
  }, [mode, deleteBatch, id, handleDelete]);

  return {
    isDeleting,
    error,
    mode,
    open,
    deleteItem,
    setMode,
    setOpen,
    confirmMessage: useCallback(
      (item: TRow) => confirmMessage(item),
      [confirmMessage],
    ),
    openBatchDeleteConfirm,
    openDeleteConfirm,
    closeDeleteModal,
    deleteWithoutConfirm,
    deleteBatch,
  };
}
