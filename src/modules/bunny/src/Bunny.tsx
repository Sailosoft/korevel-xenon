"use client";

import { Card, toast, Toast } from "@heroui/react";
import { useCallback, useEffect, useMemo } from "react";
import {
  AdminPanelProvider,
  useAdminPanelContext,
} from "../../admin-panel/features/provider";
import { BunnyProvider } from "./context/BunnyContext";
import { ExtendedBunnyProps } from "./Bunny.Interface";
import { adminPanelEvents } from "../../admin-panel/features/event/admin-panel-event";
import BunnyHeader from "./header/BunnyHeader";
import { BunnyTable } from "./table/BunnyTable";
import BunnyModal from "./modal/BunnyModal";
import BunnyDeleteModal from "./del/BunnyDelete.Modal";

// 1. Updated Props to include the 'adjust' callback

export default function Bunny<TRow, TForm>({
  children,
  config,
  adjust,
}: ExtendedBunnyProps<TRow, TForm>) {
  return (
    // AdminPanel MUST be first so children can access context for adjustment
    <AdminPanelProvider query={config.query} mutation={config.mutation}>
      <Toast.Provider />
      <BunnyMainPanel config={config} adjust={adjust}>
        {children}
      </BunnyMainPanel>
    </AdminPanelProvider>
  );
}

function BunnyMainPanel({
  children,
  config,
  adjust,
}: {
  children: React.ReactNode;
  config: any;
  adjust?: any;
}) {
  const admin = useAdminPanelContext();
  const { form, modal, table } = admin;

  // 2. Merge config with dynamic adjustments on the fly
  const finalConfig = useMemo(() => {
    return {
      ...config,
      ...(adjust ? adjust(admin, config) : {}),
    };
  }, [config, adjust, admin]);

  const handlePrimaryAction = useCallback(async () => {
    await form.submit();
  }, [form]);

  // 3. Keep your existing events logic
  useEffect(() => {
    const onFormSuccess = ({ mode, result }: any) => {
      if (mode === "update") {
        modal.openView(modal.id!);
        table.fetchData();
        toast.success("Updated successfully");
      } else if (mode === "create" && result.status === "success") {
        const { data } = result;
        modal.openView(data?.id ?? "");
        table.fetchData();
        toast.success("Created successfully");
      }
    };

    const onDeleteSuccess = () => {
      toast.success("Deleted successfully");
    };

    adminPanelEvents.on("form:success", onFormSuccess);
    adminPanelEvents.on("del:success", onDeleteSuccess);

    return () => {
      adminPanelEvents.off("form:success", onFormSuccess);
      adminPanelEvents.off("del:success", onDeleteSuccess);
    };
  }, [modal, table]);

  return (
    // 4. Finally wrap the UI in BunnyProvider with the MERGED config
    <BunnyProvider config={finalConfig}>
      <Card>
        <BunnyHeader />
        <BunnyTable />
        <BunnyModal onPrimaryAction={handlePrimaryAction}>
          {children}
        </BunnyModal>
        <BunnyDeleteModal />
      </Card>
    </BunnyProvider>
  );
}
