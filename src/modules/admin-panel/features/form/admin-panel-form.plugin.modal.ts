// plugins/admin-panel-modal-plugin.ts
import type { AdminPanelFormMode } from "./admin-panel-form.interface";
import type { UseAdminPanelTable } from "../table/admin-panel-table.interface";
import type { UseAdminPanelModal } from "../modal/admin-panel-modal.interface";
import type { UseAdminPanelNotify } from "../notify/admin-panel-notify.interface";

export interface CreateAdminPanelModalPluginProps {
  table: UseAdminPanelTable<unknown>;
  modal: UseAdminPanelModal;
  notify: UseAdminPanelNotify;
  successMessages?: {
    create?: string;
    update?: string;
  };
}

/**
 * Default Plugin for Modal Forms
 * Handles: Snackbar + Close Modal + Refresh Table
 */
export function createAdminPanelModalPlugin<T = unknown>({
  table,
  modal,
  notify,
  successMessages = {
    create: "Record created successfully",
    update: "Record updated successfully",
  },
}: CreateAdminPanelModalPluginProps) {
  return {
    onSuccess: (data: T, mode?: AdminPanelFormMode) => {
      // Show success notification
      if (notify?.success) {
        const message =
          mode === "create" ? successMessages.create! : successMessages.update!;

        notify.success(message);
      } else {
        console.log(`✅ ${mode?.toUpperCase()} successful`, data);
      }

      // Close modal
      modal.closeModal();

      // Refresh table
      if (table?.fetchData) {
        table.fetchData();
      }

      // Special handling for create: reset to first page
      if (mode === "create" && table?.setPage) {
        table.setPage(1);
      }
    },

    onError: (error: Error, mode?: AdminPanelFormMode) => {
      const message = `Failed to ${mode} record`;

      if (notify?.error) {
        notify.error(message);
      } else {
        console.error(`❌ ${mode?.toUpperCase()} failed:`, error);
      }
    },

    onBeforeSubmit: async (data: T, _mode?: AdminPanelFormMode) => {
      // You can add unknown pre-processing logic here (e.g. formatting dates, cleaning fields)
      return data;
    },

    onAfterSubmit: () => {
      // Runs after success or error
      // Can be used for cleanup if needed
    },
  };
}
