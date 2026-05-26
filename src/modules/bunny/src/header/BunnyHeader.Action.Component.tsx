import { Button, ButtonVariants } from "@heroui/react";
import { BunnyHeaderAction } from "./BunnyHeader.Interface";
import { useCallback, useMemo } from "react";
import { useBunnyConfig } from "../context/BunnyContext";
import { useAdminPanelContext } from "@/src/modules/admin-panel/features/provider";
import { BunnyKernel } from "../Bunny.Interface";

export default function BunnyHeaderActionComponent({
  action,
}: {
  action: BunnyHeaderAction;
}) {
  const config = useBunnyConfig();
  const panel = useAdminPanelContext();

  const kernel: BunnyKernel<unknown, unknown> = useMemo(
    () => ({
      config,
      panel,
    }),
    [config, panel],
  );

  const variant = useMemo<ButtonVariants["variant"]>(() => {
    if (action.variant === "primary") return "primary";
    if (action.variant === "secondary") return "secondary";
    if (action.variant === "ghost") return "ghost";
    if (action.variant === "danger") return "danger";
    if (action.variant === "danger-soft") return "danger-soft";
    if (action.variant === "outline") return "outline";
    if (action.variant === "tertiary") return "tertiary";
    return "primary";
  }, [action.variant]);

  const onClick = useCallback(() => {
    if (action.onClick) action.onClick(kernel);
  }, [action, kernel]);

  if (action.render) return action.render();

  return (
    <Button
      key={action.id || action.label}
      onClick={onClick}
      isDisabled={action.disable}
      variant={variant}
    >
      {action.icon}
      <span className="hidden sm:inline ml-1">{action.label}</span>
    </Button>
  );
}
