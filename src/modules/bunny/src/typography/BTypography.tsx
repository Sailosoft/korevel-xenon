// src/components/bunny/BTypography.tsx
import React from "react";

type Variant =
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "subtitle1"
  | "subtitle2"
  | "body1"
  | "body2"
  | "caption"
  | "overline";

type Color =
  | "default"
  | "primary"
  | "secondary"
  | "success"
  | "error"
  | "warning"
  | "info";

interface BTypographyProps extends React.HTMLAttributes<HTMLElement> {
  variant?: Variant;
  component?: React.ElementType;
  color?: Color;
  align?: "left" | "center" | "right" | "justify" | "inherit";
  gutterBottom?: boolean;
  noWrap?: boolean;
  children: React.ReactNode;
}

// Map variant → actual HTML element
const variantToComponent: Record<Variant, React.ElementType> = {
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  h5: "h5",
  h6: "h6",
  subtitle1: "p",
  subtitle2: "p",
  body1: "p",
  body2: "p",
  caption: "span",
  overline: "span",
};

const variantStyles: Record<Variant, string> = {
  h1: "text-5xl font-bold tracking-tight",
  h2: "text-4xl font-semibold tracking-tight",
  h3: "text-3xl font-semibold tracking-tight",
  h4: "text-2xl font-semibold tracking-tight",
  h5: "text-xl font-semibold",
  h6: "text-lg font-semibold",
  subtitle1: "text-lg font-medium",
  subtitle2: "text-base font-medium",
  body1: "text-base",
  body2: "text-sm",
  caption: "text-xs",
  overline: "text-xs uppercase tracking-widest font-medium",
};

const colorStyles: Record<Color, string> = {
  default: "text-foreground",
  primary: "text-primary",
  secondary: "text-muted-foreground",
  success: "text-green-600 dark:text-green-500",
  error: "text-destructive",
  warning: "text-yellow-600 dark:text-yellow-500",
  info: "text-blue-600 dark:text-blue-500",
};

export const BTypography = React.forwardRef<HTMLElement, BTypographyProps>(
  (
    {
      variant = "body1",
      component,
      color = "default",
      align = "inherit",
      gutterBottom = false,
      noWrap = false,
      className = "",
      children,
      ...props
    },
    ref,
  ) => {
    const Component = component || variantToComponent[variant];

    const classes = [
      variantStyles[variant],
      colorStyles[color],
      align !== "inherit" && `text-${align}`,
      gutterBottom && "mb-4",
      noWrap && "truncate",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <Component ref={ref as any} className={classes} {...props}>
        {children}
      </Component>
    );
  },
);

BTypography.displayName = "BTypography";
