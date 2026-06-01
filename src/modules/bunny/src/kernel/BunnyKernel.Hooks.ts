import { useAdminPanelContext } from "@/src/modules/admin-panel/features/provider";
import { BunnyKernel } from "../Bunny.Interface";
import { useBunnyConfig } from "../context/BunnyContext";
import { useMemo } from "react";

export default function useBunnyKernel<TRow, TForm>(): BunnyKernel<
  TRow,
  TForm
> {
  const config = useBunnyConfig<TRow, TForm>();
  const adminPanel = useAdminPanelContext<TRow, TForm>();

  const kernel: BunnyKernel<TRow, TForm> = useMemo(
    () => ({
      config,
      adminPanel,
    }),
    [config, adminPanel],
  );

  return kernel;
}
