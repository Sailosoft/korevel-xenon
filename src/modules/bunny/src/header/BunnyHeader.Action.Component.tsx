import { Button, ButtonProps, ButtonVariants } from "@heroui/react";
import { BunnyHeaderAction } from "./BunnyHeader.Interface";
import { useCallback, useMemo } from "react";
import { useAdminPanelContext } from "@/src/modules/admin-panel/features/provider";

export default function BunnyHeaderActionComponent({
  action,
}: {
  action: BunnyHeaderAction;
}) {
  if (action.render) return action.render();

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
    if (action.onClick) action.onClick();
  }, [action]);

  return (
    <Button
      key={action.id || action.label}
      onClick={onClick}
      isDisabled={action.disable}
      variant={variant}
    >
      {action.icon}
      {action.label}
    </Button>
  );
}
