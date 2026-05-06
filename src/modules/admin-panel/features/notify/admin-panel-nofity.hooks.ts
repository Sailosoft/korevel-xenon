// hooks/use-admin-panel-notify.ts
import { useCallback } from "react";
import type {
  AdminPanelNotify,
  AdminPanelNotifyOptions,
} from "./admin-panel-notify.interface";

interface UseAdminPanelNotifyProps {
  // Optional adapter for different toast/snackbar libraries (Sonner, React Hot Toast, Material UI, etc.)
  adapter?: (message: string, options: AdminPanelNotifyOptions) => void;
}

/**
 * AdminPanelNotify Hook
 * @description - Hook for displaying notifications with different types and options
 * @param adapter - Optional adapter for different toast/snackbar libraries (Sonner, React Hot Toast, Material UI, etc.)
 * @returns AdminPanelNotify
 *
 * @example
 * ```typescript
 * const { success, error, warning, info, show } = useAdminPanelNotify();
 * ```
 */
export function useAdminPanelNotify({
  adapter,
}: UseAdminPanelNotifyProps = {}): AdminPanelNotify {
  const show = useCallback(
    (message: string, options: AdminPanelNotifyOptions = {}) => {
      const notifyOptions: AdminPanelNotifyOptions = {
        type: "default",
        duration: 5000,
        position: "top-right",
        ...options,
      };

      if (adapter) {
        // Use custom adapter (Sonner, custom snackbar, etc.)
        adapter(message, notifyOptions);
      } else {
        // Fallback: Console notification (for development / when no UI adapter is provided)
        const prefix = options.type
          ? `[${options.type.toUpperCase()}]`
          : "[NOTIFY]";
        console.log(`${prefix} ${message}`, notifyOptions);

        // You can also trigger a global event if needed
        window.dispatchEvent(
          new CustomEvent("adminpanel:notify", {
            detail: { message, options: notifyOptions },
          }),
        );
      }
    },
    [adapter],
  );

  const success = useCallback(
    (message: string, options?: Omit<AdminPanelNotifyOptions, "type">) => {
      show(message, { ...options, type: "success" });
    },
    [show],
  );

  const error = useCallback(
    (message: string, options?: Omit<AdminPanelNotifyOptions, "type">) => {
      show(message, { ...options, type: "error", duration: 7000 });
    },
    [show],
  );

  const warning = useCallback(
    (message: string, options?: Omit<AdminPanelNotifyOptions, "type">) => {
      show(message, { ...options, type: "warning" });
    },
    [show],
  );

  const info = useCallback(
    (message: string, options?: Omit<AdminPanelNotifyOptions, "type">) => {
      show(message, { ...options, type: "accent" });
    },
    [show],
  );

  return {
    success,
    error,
    warning,
    info,
    show,
  };
}
