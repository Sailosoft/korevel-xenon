// src/components/bunny/BStack.tsx
import React from "react";

type Direction = "row" | "column" | "row-reverse" | "column-reverse";

type AlignItems = "flex-start" | "center" | "flex-end" | "baseline" | "stretch";

type JustifyContent =
  | "flex-start"
  | "center"
  | "flex-end"
  | "space-between"
  | "space-around"
  | "space-evenly";

interface SxProps {
  p?: number | string;
  px?: number | string;
  py?: number | string;
  padding?: number | string;
  paddingX?: number | string;
  paddingY?: number | string;
  [key: string]: unknown; // Allow other styles
}

interface BStackProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: Direction;
  gap?: number | string;
  alignItems?: AlignItems;
  justifyContent?: JustifyContent;
  flexWrap?: "nowrap" | "wrap" | "wrap-reverse";
  divider?: React.ReactNode;
  component?: React.ElementType;
  sx?: SxProps;
  children: React.ReactNode;
}

export const BStack = React.forwardRef<HTMLDivElement, BStackProps>(
  (
    {
      direction = "column",
      gap = 4,
      alignItems,
      justifyContent,
      flexWrap,
      divider,
      component: Component = "div",
      className = "",
      sx = {},
      children,
      ...props
    },
    ref,
  ) => {
    const childrenArray = React.Children.toArray(children);

    // Direction
    const directionClass =
      direction === "row"
        ? "flex-row"
        : direction === "row-reverse"
          ? "flex-row-reverse"
          : direction === "column-reverse"
            ? "flex-col-reverse"
            : "flex-col";

    // Gap
    const gapClass = typeof gap === "number" ? `gap-${gap}` : gap;

    // Align Items
    const alignClass = alignItems
      ? `items-${
          alignItems === "flex-start"
            ? "start"
            : alignItems === "flex-end"
              ? "end"
              : alignItems
        }`
      : "";

    // Justify Content
    const justifyClass = justifyContent
      ? `justify-${
          justifyContent === "flex-start"
            ? "start"
            : justifyContent === "flex-end"
              ? "end"
              : justifyContent === "space-between"
                ? "between"
                : justifyContent === "space-around"
                  ? "around"
                  : justifyContent === "space-evenly"
                    ? "evenly"
                    : justifyContent
        }`
      : "";

    // Flex Wrap
    const wrapClass = flexWrap
      ? flexWrap === "nowrap"
        ? ""
        : flexWrap === "wrap"
          ? "flex-wrap"
          : "flex-wrap-reverse"
      : "";

    // Convert sx padding to Tailwind classes
    const getPaddingClasses = (sx: SxProps): string => {
      const classes: string[] = [];

      const p = sx.p ?? sx.padding;
      if (p !== undefined) {
        classes.push(typeof p === "number" ? `p-${p}` : String(p));
      }

      const px = sx.px ?? sx.paddingX;
      if (px !== undefined) {
        classes.push(typeof px === "number" ? `px-${px}` : String(px));
      }

      const py = sx.py ?? sx.paddingY;
      if (py !== undefined) {
        classes.push(typeof py === "number" ? `py-${py}` : String(py));
      }

      return classes.join(" ");
    };

    const paddingClasses = getPaddingClasses(sx);

    const combinedClass = [
      "flex",
      directionClass,
      gapClass,
      alignClass,
      justifyClass,
      wrapClass,
      paddingClasses,
      className,
    ]
      .filter(Boolean)
      .join(" ");

    // Handle remaining styles as inline styles (safely)
    const inlineStyle: React.CSSProperties = {};

    // Copy only valid CSS properties (exclude padding ones already handled)
    const excludedKeys = ["p", "px", "py", "padding", "paddingX", "paddingY"];
    Object.entries(sx).forEach(([key, value]) => {
      if (!excludedKeys.includes(key)) {
        (inlineStyle as unknown as Record<string, unknown>)[key] = value;
      }
    });

    return (
      <Component
        ref={ref}
        className={combinedClass}
        style={Object.keys(inlineStyle).length > 0 ? inlineStyle : undefined}
        {...props}
      >
        {childrenArray.map((child, index) => (
          <React.Fragment key={index}>
            {child}
            {divider && index < childrenArray.length - 1 && divider}
          </React.Fragment>
        ))}
      </Component>
    );
  },
);

BStack.displayName = "BStack";
