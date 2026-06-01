import { useState, useCallback } from "react";
import {
  AdminPanelDialogState,
  AdminPanelDialogOption,
  UseAdminPanelDialog,
} from "./admin-panel-dialog.interface";
import { AdminPanelFormActionState } from "../form-fields/admin-panel-form-field.interface";

const DEFAULT_STATE: AdminPanelDialogState = {
  open: false,
  loading: false,
  message: undefined,
  labelPositive: undefined,
  labelNegative: undefined,
  title: undefined,
};

export function useAdminPanelDialog(): UseAdminPanelDialog {
  const [state, setState] = useState<AdminPanelDialogState>(DEFAULT_STATE);
  const [activeOptions, setActiveOptions] =
    useState<AdminPanelDialogOption<any> | null>(null);

  const openDialog = useCallback(
    <TContext>(option: AdminPanelDialogOption<TContext>) => {
      setActiveOptions(option);
      setState({
        open: true,
        loading: false,
        title: option.title,
        message: option.message,
        labelPositive: option.labelPositive ?? "Confirm",
        labelNegative: option.labelNegative ?? "Cancel",
        fields: option.fields,
      });
    },
    [],
  );

  const triggerConfirm = useCallback(
    <TContext>(form: FormData, context: TContext) => {
      if (activeOptions?.onConfirm) {
        activeOptions.onConfirm({ form: form, context: context });
      }
    },
    [activeOptions],
  );

  const closeDialog = useCallback(() => {
    setState((prev) => ({ ...prev, open: false, loading: false }));
    if (activeOptions?.onCancel) {
      activeOptions.onCancel();
    }
    setActiveOptions(null);
  }, [activeOptions]);

  /**
   * Custom action runner designed to match React 19's useActionState mechanics,
   * receiving transient operational context right inside the execution dispatch.
   */
  const executeAction = useCallback(
    async <TContext>(
      prevState: AdminPanelFormActionState,
      payload: { formData: FormData; context: TContext },
    ): Promise<AdminPanelFormActionState> => {
      if (!activeOptions?.onConfirm) return prevState;

      setState((prev) => ({ ...prev, loading: true }));
      try {
        // Feed the previous form state, the form elements, and the dynamic context stringently
        const result = await activeOptions.onConfirm({
          prevState: prevState,
          context: payload.context,
          form: payload.formData,
        });

        if (result.success) {
          setState(DEFAULT_STATE);
          setActiveOptions(null);
        } else {
          setState((prev) => ({ ...prev, loading: false }));
        }

        return result;
      } catch (err) {
        setState((prev) => ({ ...prev, loading: false }));
        return {
          success: false,
          message:
            err instanceof Error ? err.message : "An execution error occurred.",
        };
      }
    },
    [activeOptions],
  );

  return {
    ...state,
    openDialog,
    closeDialog,
    triggerConfirm,
    executeAction,
  };
}
