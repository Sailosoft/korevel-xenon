"use client";

import { Card, Toast, toast } from "@heroui/react";
import { useCallback, useEffect, useMemo, ReactNode } from "react";
import {
  AdminPanelProvider,
  useAdminPanelContext,
} from "../../admin-panel/features/provider";
import { BunnyProvider } from "./context/BunnyContext";
import {
  BunnyCustomize,
  ExtendedBunnyProps,
  BunnyConfig,
  BunnyHasId,
  BunnyOnSuccessBehavior,
} from "./Bunny.Interface";
import { AdminPanelFormMode } from "../../admin-panel/features/form/admin-panel-form.interface";
import { adminPanelEvents } from "../../admin-panel/features/event/admin-panel-event";
import { useBunnyHeaderActions } from "./header/BunnyHeader.Action.Default";
import { useBunnyRowActionDefault } from "./rows/BunnyRow.Action.Default";
import { validateBunnyForm } from "./validator/bunny-validator.utils";
import BunnyHeader from "./header/BunnyHeader";
import BunnyModal from "./modal/BunnyModal";
import BunnyDeleteModal from "./del/BunnyDelete.Modal";
import { AdminPanelEventFormSuccessPayload } from "../../admin-panel/features/event/admin-panel-event.interface";
import { BunnyReactiveTable } from "./table/BunnyReactiveTable";
import { UseAdminPanel } from "../../admin-panel/admin-panel.interface";
import { BunnyHeaderActionType } from "./header/BunnyHeader.Interface";
import { BunnyRowAction } from "./table/BunnyTable.Interface";
import BunnyDialogAction from "./dialog/BunnyDialogAction";
import { useNextBunnyRouter } from "./router/NextBunnyRouter";

export default function Bunny<TRow, TForm>({
  children,
  config,
  customize,
}: ExtendedBunnyProps<TRow, TForm>) {
  return (
    <AdminPanelProvider
      query={config.query}
      mutation={config.mutation}
      props={config.props}
    >
      <BunnyMainPanel config={config} customize={customize}>
        {children}
      </BunnyMainPanel>
    </AdminPanelProvider>
  );
}

function BunnyMainPanel<TRow, TForm>({
  children,
  config,
  customize,
}: {
  children: ReactNode;
  config: BunnyConfig<TRow, TForm>;
  customize?: BunnyCustomize<TRow, TForm>;
}) {
  const admin = useAdminPanelContext<TRow, TForm>() as unknown as UseAdminPanel<
    TRow,
    TForm
  >;

  /**
   * Admin Panel State and Action
   */
  const { form, modal, table } = admin;
  const router = useNextBunnyRouter();

  const defaultHeaderActions = useBunnyHeaderActions<TRow, TForm>([]);
  const defaultRowActions = useBunnyRowActionDefault({
    hides: config.hideRowActions || [],
  });

  const finalConfig = useMemo<BunnyConfig<TRow, TForm>>(() => {
    let resolvedHeaders = config.headerActions || [];
    if (config.defaultHeaderActions) {
      const filteredDefaults = defaultHeaderActions.filter(
        (action) =>
          !config.hideHeaderActions?.includes(
            action.id as BunnyHeaderActionType,
          ),
      );
      resolvedHeaders = [...filteredDefaults, ...resolvedHeaders];
    }

    let resolvedRows = config.rowActions || [];
    if (config.defaultRowActions) {
      resolvedRows = [
        ...(defaultRowActions as BunnyRowAction<TRow>[]),
        ...resolvedRows,
      ];
    }

    const baseMergedConfig: BunnyConfig<TRow, TForm> = {
      ...config,
      headerActions: resolvedHeaders,
      rowActions: resolvedRows,
      modalHeaderActions: config.modalHeaderActions || [],
    };

    const customizations = customize ? customize(admin, baseMergedConfig) : {};

    const data = {
      ...baseMergedConfig,
      ...customizations,
      // Ensure the raw formConfig (whether static or function) passes through safely
      // formConfig: config.formConfig,
      rowActions: customizations.rowActions || baseMergedConfig.rowActions,
      headerActions:
        customizations.headerActions || baseMergedConfig.headerActions,
      modalHeaderActions:
        customizations.modalHeaderActions ||
        baseMergedConfig.modalHeaderActions,
    };

    // console.log(data, customizations);
    return data;
  }, [
    customize,
    admin,
    defaultHeaderActions,
    defaultRowActions,
    config.title,
    config.titlePlural,
    config.modalSize,
    config.modalSizeWidth,
    config.columns,
    config.rowKey,
    config.tableHeight,
    config.query,
    config.mutation,
    config.rowActionsColLength,
    config.rowActionsColWidth,
    config.defaultHeaderActions,
    config.hideHeaderActions,
    config.headerActions,
    config.defaultRowActions,
    config.hideRowActions,
    config.rowActions,
    config.modalHeaderActions,
    config.onFormSuccess,
    config.tableMode,
    config.tableMobileView,
    config.props,
  ]);
  const handlePrimaryAction = useCallback(async () => {
    form.clearFormError();

    let formData = form.formData;

    // --- Before Form Submit ---
    if (finalConfig.beforeFormSubmit) {
      formData = {
        ...formData,
        ...finalConfig.beforeFormSubmit(formData, modal.mode || "create"),
      };
      form.setFormData(formData);
    }

    // --- Validation: adapter takes precedence over built-in rules ---
    if (finalConfig.validationAdapter) {
      const errors = finalConfig.validationAdapter.validate(formData);
      if (Object.keys(errors).length > 0) {
        form.setFormError(errors);
        console.error("There is form error", errors);
        toast.danger(
          <div className="space-y-2">
            <p className="font-medium">Please fix the following errors:</p>
            <ul className="list-disc pl-5 text-sm">
              {Object.entries(errors).map(
                ([field, message]: [string, string]) => (
                  <li key={field}>
                    <strong>{field}</strong>: {message}
                  </li>
                ),
              )}
            </ul>
          </div>,
          {},
        );
        return;
      }
    } else {
      // Fallback to built-in field-level rules
      const rawFormConfig = config.formConfig;
      const resolvedFormConfig =
        typeof rawFormConfig === "function"
          ? rawFormConfig(form)
          : rawFormConfig;

      if (resolvedFormConfig?.fields) {
        const clientErrors = validateBunnyForm(
          resolvedFormConfig.fields,
          formData,
        );
        if (Object.keys(clientErrors).length > 0) {
          form.setFormError(clientErrors);
          return;
        }
      }
    }

    await form.submit();
  }, [form, modal.mode, config.formConfig, finalConfig.validationAdapter, finalConfig.beforeFormSubmit]); // Stable and explicit dependency

  useEffect(() => {
    const onFormSuccess = ({
      mode,
      result,
    }: AdminPanelEventFormSuccessPayload<unknown>) => {
      const behavior: BunnyOnSuccessBehavior = finalConfig.onFormSuccess ?? {
        mode: "openView",
      };

      // Resolve the entity id — narrow the discriminated union first
      const entityId =
        mode === "update"
          ? ((modal.id ?? "") as string)
          : mode === "create" && result.status === "success"
            ? (((result.data as unknown as BunnyHasId)?.id ?? "") as string)
            : "";

      if (behavior.mode === "redirect") {
        const baseRoute = behavior.route
          ? `/${behavior.route.replace(/^\/+/, "")}`
          : window.location.pathname.replace(/\/+$/, "");
        router.push(`${baseRoute}/${entityId}`);
      } else if (behavior.mode === "closeOnly") {
        modal.closeModal();
      } else {
        // openView (default)
        if (entityId) modal.openView(entityId);
      }

      table.fetchData();

      if (mode === "update") {
        toast.success("Updated successfully");
      } else if (mode === "create") {
        toast.success("Created successfully");
      }
    };

    const onDeleteSuccess = () => toast.success("Deleted successfully");

    adminPanelEvents.on("form:success", onFormSuccess);
    adminPanelEvents.on("del:success", onDeleteSuccess);
    return () => {
      adminPanelEvents.off("form:success", onFormSuccess);
      adminPanelEvents.off("del:success", onDeleteSuccess);
    };
  }, [modal, table, finalConfig, router]);

  return (
    <BunnyProvider config={finalConfig}>
      <Card>
        <BunnyHeader />
        <BunnyReactiveTable />
        <BunnyModal onPrimaryAction={handlePrimaryAction}>
          {children}
        </BunnyModal>
        <BunnyDeleteModal />

        <BunnyDialogAction />
      </Card>

      <Toast.Provider />
    </BunnyProvider>
  );
}
