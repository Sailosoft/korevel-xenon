// modules/shell/index.ts — barrel for the BunnyDev shell.

export { BDShell } from "./BDShell";
export type { BDShellProps } from "./BDShell";

export { BDShellSidebar } from "./BDShell.sidebar";
export type { BDShellSidebarProps } from "./BDShell.sidebar";

export { BDShellHeader } from "./BDShell.header";
export type { BDShellHeaderProps } from "./BDShell.header";

export {
  BD_SHELL_THEME,
} from "./BDShell.config";
export type {
  BDShellConfig,
  BDShellTheme,
  BDNavItem,
  BDShellProfile,
  BDShellWizard,
} from "./BDShell.config";
