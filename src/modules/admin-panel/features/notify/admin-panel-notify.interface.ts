export type AdminPanelNotifyType =
  | "accent"
  | "default"
  | "success"
  | "warning"
  | "error"
  | "custom";

export interface AdminPanelNotifyOptions {
  type?: AdminPanelNotifyType;
  duration?: number; // in milliseconds
  position?:
    | "top"
    | "bottom"
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right";
  actionLabel?: string;
  onAction?: () => void;
  [key: string]: any; // for custom options
}

export interface AdminPanelNotify {
  success: (
    message: string,
    options?: Omit<AdminPanelNotifyOptions, "type">,
  ) => void;
  error: (
    message: string,
    options?: Omit<AdminPanelNotifyOptions, "type">,
  ) => void;
  warning: (
    message: string,
    options?: Omit<AdminPanelNotifyOptions, "type">,
  ) => void;
  info: (
    message: string,
    options?: Omit<AdminPanelNotifyOptions, "type">,
  ) => void;
  show: (message: string, options?: AdminPanelNotifyOptions) => void;
}
