import { useAdminPanelContext } from "@/src/modules/admin-panel/features/provider";
import { BunnyKernel } from "../Bunny.Interface";
import { useBunnyConfig } from "../context/BunnyContext";
import { useMemo } from "react";
import { useNextBunnyRouter } from "../router/NextBunnyRouter";

export default function useBunnyKernel<TRow, TForm>(): BunnyKernel<
  TRow,
  TForm
> {
  const config = useBunnyConfig<TRow, TForm>();
  const adminPanel = useAdminPanelContext<TRow, TForm>();
  const router = useNextBunnyRouter();

  const kernel: BunnyKernel<TRow, TForm> = useMemo(
    () => ({
      config,
      adminPanel,
      router,
    }),
    [config, adminPanel, router],
  );

  return kernel;
}
