// components/Typography.tsx
import React from "react";

type TypographyVariant =
  | "display-large"
  | "display-medium"
  | "display-small"
  | "headline-large"
  | "headline-medium"
  | "headline-small"
  | "title-large"
  | "title-medium"
  | "title-small"
  | "body-large"
  | "body-medium"
  | "body-small"
  | "label-large"
  | "label-medium"
  | "label-small";

interface TypographyProps {
  variant?: TypographyVariant;
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span" | "div" | "label";
  children: React.ReactNode;
  className?: string;
  [key: string]: any; // for additional props like onClick, id, etc.
}

const variantClasses: Record<TypographyVariant, string> = {
  // Display
  "display-large": "text-[57px] leading-[64px] tracking-[-0.25px]",
  "display-medium": "text-[45px] leading-[52px]",
  "display-small": "text-[36px] leading-[44px]",

  // Headline
  "headline-large": "text-[32px] leading-[40px]",
  "headline-medium": "text-[28px] leading-[36px]",
  "headline-small": "text-[24px] leading-[32px]",

  // Title
  "title-large": "text-[22px] leading-[28px]",
  "title-medium": "text-[16px] leading-[24px] tracking-[0.15px] font-medium",
  "title-small": "text-[14px] leading-[20px] tracking-[0.1px] font-medium",

  // Body
  "body-large": "text-[16px] leading-[24px] tracking-[0.5px]",
  "body-medium": "text-[14px] leading-[20px] tracking-[0.25px]",
  "body-small": "text-[12px] leading-[16px] tracking-[0.4px]",

  // Label
  "label-large": "text-[14px] leading-[20px] tracking-[0.1px] font-medium",
  "label-medium": "text-[12px] leading-[16px] tracking-[0.5px] font-medium",
  "label-small": "text-[11px] leading-[16px] tracking-[0.5px] font-medium",
};

export const ElvenTypography: React.FC<TypographyProps> = ({
  variant = "body-medium",
  as: Tag = "p",
  children,
  className = "",
  ...props
}) => {
  const baseClasses = variantClasses[variant];

  return (
    <Tag className={`${baseClasses} ${className}`} {...props}>
      {children}
    </Tag>
  );
};
