// hooks/use-admin-panel-form.ts
import { useState, useEffect, useCallback } from "react";

import type { AdminPanelMutation } from "../mutation/admin-panel-mutation.interface";
import type {
  AdminPanelFormMode,
  AdminPanelFormError,
  UseAdminPanelFormProps,
  UseAdminPanelForm,
} from "./admin-panel-form.interface";
import { AdminPanelResult } from "../../shared/admin-panel-result";
import { adminPanelEvents } from "../event/admin-panel-event";
import { AdminPanelId } from "../id/admin-panel-id.interface";

// Internal mutation handler (consolidated)
const useInternalMutation = <TForm>(
  mutation: AdminPanelMutation<TForm>,
  mode?: AdminPanelFormMode,
  onSuccess?: (data: TForm) => void,
  onError?: (error: Error) => void,
) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const submit = useCallback(
    async (formData: TForm, id?: AdminPanelId) => {
      if (isSubmitting) return;
      setIsSubmitting(true);
      setError(null);

      try {
        const dataToSubmit = { ...formData };

        // Plugin: before submit
        // if (plugin?.onBeforeSubmit) {
        //   dataToSubmit = await plugin.onBeforeSubmit(dataToSubmit, mode);
        // }
        adminPanelEvents.emit("form:beforeSubmit", {
          mode: mode,
          payload: formData,
        });

        let result: AdminPanelResult<TForm, Error | unknown> | undefined;

        if (mode === "create") {
          result = await mutation.create(dataToSubmit);
        } else if (mode === "update" && id !== undefined) {
          result = await mutation.update(id, dataToSubmit);
        } else {
          throw new Error("Invalid mode or missing ID for update operation");
        }

        if (result) {
          adminPanelEvents.emit("form:submit", {
            mode: mode,
            result,
          });
        }

        // Plugin: after success
        if (result !== undefined && result.status == "success") {
          if (result.data) {
            onSuccess?.(result.data);
            adminPanelEvents.emit("form:success", {
              mode: mode,
              result,
            });
          }
        } else if (result !== undefined && result.status === "error") {
          // plugin?.onError?.(result.error as Error, mode);
          onError?.(result.error as Error);
        } else if (
          result !== undefined &&
          result.status === "validation-error"
        ) {
          // plugin?.onError?.(result.error, mode);
          // onError?.(result.error);
          adminPanelEvents.emit("form:error", {
            mode: mode,
            error: result.error,
            result,
          });
        }

        return result;
      } catch (err) {
        const errorObj =
          err instanceof Error ? err : new Error("Operation failed");
        setError(errorObj);
        // plugin?.onError?.(errorObj, mode);
        onError?.(errorObj);
        throw errorObj;
      } finally {
        setIsSubmitting(false);
      }
    },
    [mutation, mode, onSuccess, onError, isSubmitting],
  );

  return { submit, isSubmitting, error };
};

export function useAdminPanelForm<TForm = unknown>({
  modal,
  mutation,
  query,
  initialData,
  onSuccess,
  onError,
}: UseAdminPanelFormProps<TForm>): UseAdminPanelForm<TForm> {
  const [formData, setFormDataState] = useState<TForm>({} as TForm);
  const [formError, setFormErrorState] = useState<AdminPanelFormError>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { mode, id, isOpen } = modal;
  const {
    submit: internalSubmit,
    isSubmitting,
    error: mutationError,
  } = useInternalMutation(mutation, mode, onSuccess, onError);

  // Initialize form with initialData
  useEffect(() => {
    if (initialData) {
      setFormDataState(initialData as TForm);
    }
  }, [initialData]);

  // Load data for update/view mode using getOne
  const loadData = useCallback(async () => {
    if ((mode !== "update" && mode !== "view") || !id || !query?.getOne) return;

    setIsLoading(true);
    try {
      const data = await query.getOne(id) as TForm;
      setFormDataState(data);
    } catch (err) {
      const errorObj =
        err instanceof Error ? err : new Error("Failed to load data");
      // You can choose to set mutationError or a separate one
      console.error(errorObj);
    } finally {
      setIsLoading(false);
    }
  }, [mode, id, query]);


  const setFormData = useCallback((data: TForm | ((prev: TForm) => TForm)) => {
    setFormDataState(data);
  }, []);

  const setFormError = useCallback((errors: AdminPanelFormError) => {
    setFormErrorState(errors);
  }, []);

  const clearFormError = useCallback(() => {
    setFormErrorState(null);
  }, []);

  const submit = useCallback(async () => {
    await internalSubmit(formData, id);
  }, [internalSubmit, formData, id]);

  const resetForm = useCallback(() => {
    setFormDataState((initialData as TForm) || ({} as TForm));
    setFormErrorState(null);
  }, [initialData]);

  const handleChange = useCallback(
    (field: string, data: unknown) => {
      setFormDataState((prev) => ({ ...prev, [field]: data }));
    },
    [setFormDataState],
  );

  useEffect(() => {
    if (isOpen) {
      if ((mode === "update" || mode === "view") && id) {
        loadData();
      } else {
        resetForm();
      }
    }
  }, [loadData, mode, id, isOpen, resetForm]);

  return {
    formData,
    formError,
    setFormData,
    isLoading,
    isSubmitting: isSubmitting || isLoading,
    error: mutationError,
    setFormError,
    clearFormError,
    submit,
    resetForm,
    loadData,
    handleChange,
  };
}
