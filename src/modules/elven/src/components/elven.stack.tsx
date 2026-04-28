// Stack Component (similar to MUI Stack)
type StackDirection = "row" | "column";
type StackSpacing = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16;

interface StackProps {
  children: React.ReactNode;
  direction?: StackDirection;
  spacing?: StackSpacing;
  className?: string;
  alignItems?: "start" | "center" | "end" | "stretch" | "baseline";
  justifyContent?: "start" | "center" | "end" | "between" | "around" | "evenly";
  wrap?: boolean;
  [key: string]: any;
}

const spacingMap: Record<StackSpacing, string> = {
  0: "gap-0",
  1: "gap-1",
  2: "gap-2",
  3: "gap-3",
  4: "gap-4",
  5: "gap-5",
  6: "gap-6",
  8: "gap-8",
  10: "gap-10",
  12: "gap-12",
  16: "gap-16",
};

const alignMap: Record<NonNullable<StackProps["alignItems"]>, string> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
  baseline: "items-baseline",
};

const justifyMap: Record<NonNullable<StackProps["justifyContent"]>, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
  around: "justify-around",
  evenly: "justify-evenly",
};

export const ElvenStack: React.FC<StackProps> = ({
  children,
  direction = "column",
  spacing = 4,
  alignItems = "stretch",
  justifyContent = "start",
  wrap = false,
  className = "",
  ...props
}) => {
  const flexDirection = direction === "row" ? "flex-row" : "flex-col";
  const gap = spacingMap[spacing];
  const align = alignMap[alignItems];
  const justify = justifyMap[justifyContent];
  const flexWrap = wrap ? "flex-wrap" : "";

  return (
    <div
      className={`flex ${flexDirection} ${gap} ${align} ${justify} ${flexWrap} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
