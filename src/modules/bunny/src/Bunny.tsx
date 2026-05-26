// Bunny.tsx
"use client";

import { Card, toast } from "@heroui/react";
import { useCallback, useEffect, useMemo } from "react";
import { AdminPanelProvider, useAdminPanelContext } from "../../admin-panel/features/provider";
import { BunnyProvider } from "./context/BunnyContext";
import { BunnyCustomize, ExtendedBunnyProps, BunnyConfig, BunnyHasId } from "./Bunny.Interface";
import { adminPanelEvents } from "../../admin-panel/features/event/admin-panel-event";
import { useBunnyHeaderActions } from "./header/BunnyHeader.Action.Default";
import { useBunnyRowActionDefault } from "./rows/BunnyRow.Action.Default";
import { validateBunnyForm } from './validator/bunny-validator.utils';
import BunnyHeader from "./header/BunnyHeader";
import { BunnyTable } from "./table/BunnyTable";
import BunnyModal from "./modal/BunnyModal";
import BunnyDeleteModal from "./del/BunnyDelete.Modal";
import { AdminPanelEventFormSuccessPayload } from '../../admin-panel/features/event/admin-panel-event.interface';
import { BunnyHeaderActionType, BunnyHeaderDefaultActions } from './header/BunnyHeader.Interface';
import { BunnyReactiveTable } from './table/BunnyReactiveTable';



export default function Bunny<TRow, TForm>({
  children,
  config,
  customize,
}: ExtendedBunnyProps<TRow, TForm>) {
  return (
    <AdminPanelProvider query={config.query} mutation={config.mutation}>
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
  children: React.ReactNode;
  config: BunnyConfig<TRow, TForm>;
  customize?: BunnyCustomize<TRow, TForm>;
}) {
  const admin = useAdminPanelContext<TRow, TForm>();
  const { form, modal, table } = admin;

  // 1. Fetch default action arrays from hooks unconditionally at the top level
  const defaultHeaderActions = useBunnyHeaderActions([]);
  const defaultRowActions = useBunnyRowActionDefault({ hides: config.hideRowActions || [] });

  // 2. Compute the composite configuration on the fly
  const finalConfig = useMemo(() => {
    // Resolve base header actions
    let resolvedHeaders = config.headerActions || [];
    if (config.defaultHeaderActions) {
      const filteredDefaults = defaultHeaderActions.filter(
        (action) => !config.hideHeaderActions?.includes(action.id as BunnyHeaderActionType)
      );
      resolvedHeaders = [...filteredDefaults, ...resolvedHeaders];
    }

    // Resolve base row actions
    let resolvedRows = config.rowActions || [];
    if (config.defaultRowActions) {
      resolvedRows = [...defaultRowActions, ...resolvedRows];
    }

    const baseMergedConfig = {
      ...config,
      headerActions: resolvedHeaders,
      rowActions: resolvedRows,
    };

    // Apply unknown late runtime modifications from the customize property function
    return {
      ...baseMergedConfig,
      ...(customize ? customize(admin, baseMergedConfig) : {}),
    };
  }, [config, customize, admin, defaultHeaderActions, defaultRowActions]);

  const handlePrimaryAction = useCallback(async () => {
    form.clearFormError();
    if (finalConfig.formConfig?.fields) {
      const clientErrors = validateBunnyForm(finalConfig.formConfig.fields, form.formData);
      if (Object.keys(clientErrors).length > 0) {
        form.setFormError(clientErrors);
        return;
      }
    }
    await form.submit();
  }, [form, finalConfig]);

  useEffect(() => {
    const onFormSuccess = ({ mode, result }: AdminPanelEventFormSuccessPayload<unknown>) => {
      if (mode === "update") {
        modal.openView(modal.id!);
        table.fetchData();
        toast.success("Updated successfully");
      } else if (mode === "create" && result.status === "success") {
        const data = result.data as unknown as BunnyHasId;
        modal.openView(data?.id ?? "");
        table.fetchData();
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
  }, [modal, table]);

  return (
    <BunnyProvider config={finalConfig}>
      <Card>
        <BunnyHeader />
        <BunnyReactiveTable />
        <BunnyModal onPrimaryAction={handlePrimaryAction}>
          {children}
        </BunnyModal>
        <BunnyDeleteModal />
      </Card>
    </BunnyProvider>
  );
}