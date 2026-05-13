import { Card, toast, Toast } from "@heroui/react";
import {
  AdminPanelProvider,
  useAdminPanelContext,
} from "../../admin-panel/features/provider";
import { BunnyProps } from "./Bunny.Interface";
import { BunnyProvider } from "./context/BunnyContext";
import BunnyHeader from "./header/BunnyHeader";
import { BunnyTable } from "./table/BunnyTable";
import BunnyModal from "./modal/BunnyModal";
import { useCallback, useEffect } from "react";
import { adminPanelEvents } from "../../admin-panel/features/event/admin-panel-event";
import BunnyDeleteModal from "./del/BunnyDelete.Modal";

export default function Bunny<TRow, TForm>({
  children,
  config,
}: BunnyProps<TRow, TForm>) {
  return (
    <BunnyProvider config={config}>
      <AdminPanelProvider query={config.query} mutation={config.mutation}>
        <Toast.Provider />
        <BunnyMainPanel>{children}</BunnyMainPanel>
      </AdminPanelProvider>
    </BunnyProvider>
  );
}

function BunnyMainPanel({ children }: { children: React.ReactNode }) {
  const { form, modal, table } = useAdminPanelContext();

  const handlePrimaryAction = useCallback(async () => {
    await form.submit();
  }, [form]);

  useEffect(() => {
    adminPanelEvents.on("form:success", ({ mode, result }) => {
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
    });

    adminPanelEvents.on("del:success", () => {
      toast.success("Deleted successfully");
    });

    // clean up
    return () => {
      adminPanelEvents.off("del:success");
      adminPanelEvents.off("form:success");
    };
  }, [modal]);

  return (
    <Card>
      <BunnyHeader />
      <BunnyTable />
      <BunnyModal onPrimaryAction={handlePrimaryAction}>{children}</BunnyModal>
      <BunnyDeleteModal />
    </Card>
  );
}
