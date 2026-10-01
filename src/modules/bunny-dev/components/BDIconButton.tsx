"use client";

// BDIconButton — an icon-only BDButton wrapped in a hover/focus tooltip.
// Opt-in: normal BDButton usage is untouched.

import { useState, type MouseEventHandler } from "react";
import { Loader2 } from "lucide-react";
import { Tooltip, cn } from "@heroui/react";
import BDButton, {
  BD_BUTTON_SIZE_CLASSES,
  BD_BUTTON_VARIANT_CLASSES,
  type BDButtonProps,
} from "./BDButton";

export interface BDIconButtonProps extends BDButtonProps {
  /** Accessible label; also the default tooltip text. */
  label: string;
  /** Tooltip text. Falls back to `label`. */
  tooltip?: string;
  /** When set, renders an anchor instead of a button. */
  href?: string;
}

export function BDIconButton({
  label,
  tooltip,
  href,
  children,
  variant = "ghost",
  size = "md",
  icon: Icon,
  isLoading = false,
  className,
  ...rest
}: BDIconButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const text = tooltip ?? label;

  const sharedClassName = cn(
    "inline-flex items-center justify-center rounded-lg border font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
    BD_BUTTON_VARIANT_CLASSES[variant],
    BD_BUTTON_SIZE_CLASSES[size],
    className,
  );

  const content = isLoading ? (
    <Loader2 className="h-4 w-4 animate-spin" />
  ) : (
    <>
      {Icon && <Icon className="h-4 w-4" />}
      {children}
    </>
  );

  return (
    <Tooltip
      trigger="focus"
      delay={0}
      closeDelay={0}
      isOpen={isOpen}
      onOpenChange={setIsOpen}
    >
      {href ? (
        <a
          href={href}
          aria-label={label}
          className={sharedClassName}
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
          onClick={rest.onClick as unknown as MouseEventHandler<HTMLAnchorElement>}
        >
          {content}
        </a>
      ) : (
        <BDButton
          aria-label={label}
          variant={variant}
          size={size}
          icon={Icon}
          isLoading={isLoading}
          className={className}
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
          {...rest}
        >
          {children}
        </BDButton>
      )}
      <Tooltip.Content>{text}</Tooltip.Content>
    </Tooltip>
  );
}

export default BDIconButton;
