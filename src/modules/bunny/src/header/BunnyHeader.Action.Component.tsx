import { Button, ButtonVariants } from "@heroui/react";
import { BunnyHeaderAction } from "./BunnyHeader.Interface";
import { useCallback, useMemo } from "react";
import { useBunnyKernel } from '../kernel';

export default function BunnyHeaderActionComponent({
  action,
}: {
  action: BunnyHeaderAction;
}) {
  const kernel = useBunnyKernel();

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
    console.log("Action kernel", kernel);
    if (action.onClick) action.onClick(kernel);
  }, [action, kernel]);

  if (action.render) return action.render(kernel);

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
