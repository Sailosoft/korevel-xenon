import { Card } from "@heroui/react";
import {
  AdminPanelProvider,
  useAdminPanelContext,
} from "../../admin-panel/features/provider";
import { BunnyProps } from "./Bunny.Interface";
import { BunnyProvider } from "./context/BunnyContext";
import BunnyHeader from "./header/BunnyHeader";
import { BunnyTable } from "./table/BunnyTable";
import BunnyModal from "./modal/BunnyModal";

export default function Bunny<TRow, TForm>({
  children,
  config,
}: BunnyProps<TRow, TForm>) {
  return (
    <BunnyProvider config={config}>
      <AdminPanelProvider query={config.query} mutation={config.mutation}>
        <BunnyMainPanel>{children}</BunnyMainPanel>
      </AdminPanelProvider>
    </BunnyProvider>
  );
}

function BunnyMainPanel({ children }: { children: React.ReactNode }) {
  // const { table } = useAdminPanelContext();

  return (
    <Card>
      <BunnyHeader />
      <BunnyTable />
      <BunnyModal>{children}</BunnyModal>
    </Card>
  );
}
