// components/index.ts — barrel for the shared, config-first BD component kit.

export { BDButton, default as BDButtonDefault } from "./BDButton";
export type {
  BDButtonProps,
  BDButtonVariant,
  BDButtonSize,
} from "./BDButton";

export { BDBadge } from "./BDBadge";
export type { BDBadgeProps } from "./BDBadge";

export { BDStatusDot } from "./BDStatusDot";
export type { BDStatusDotProps, BDStatusColor } from "./BDStatusDot";

export { BDEmptyState } from "./BDEmptyState";
export type { BDEmptyStateProps } from "./BDEmptyState";

export { BDModal } from "./BDModal";
export type { BDModalProps, BDModalSize } from "./BDModal";

export { BDDrawer } from "./BDDrawer";
export type { BDDrawerProps } from "./BDDrawer";

export { BDConfirmDialog } from "./BDConfirmDialog";
export type { BDConfirmDialogProps } from "./BDConfirmDialog";

export { BDToastProvider, useBDToast } from "./BDToast";
export type {
  BDToastStatus,
  BDToastInput,
  BDToastContextValue,
} from "./BDToast";

export { BDAsyncBoundary } from "./BDAsyncBoundary";
export type { BDAsyncBoundaryProps } from "./BDAsyncBoundary";

export { BDList } from "./BDList";
export type {
  BDListProps,
  BDListColumn,
  BDListAction,
} from "./BDList";

export { BDForm } from "./BDForm";
export type {
  BDFormProps,
  BDFormField,
  BDFormFieldType,
  BDFormOption,
  BDFormValues,
} from "./BDForm";

export { BDSchemaForm } from "./BDSchemaForm";
export type { BDSchemaFormProps } from "./BDSchemaForm";

export { BDPageHeader } from "./BDPageHeader";
export type { BDPageHeaderProps } from "./BDPageHeader";

export { BDMarkdownView } from "./BDMarkdownView";
export type { BDMarkdownViewProps } from "./BDMarkdownView";

export { BDCodeEditor } from "./BDCodeEditor";
export type { BDCodeEditorProps } from "./BDCodeEditor";

export { BDWysiwygEditor } from "./BDWysiwygEditor";
export type { BDWysiwygEditorProps } from "./BDWysiwygEditor";

export { BDDiagramView } from "./BDDiagramView";
export type { BDDiagramViewProps } from "./BDDiagramView";

export { BDComingSoon } from "./BDComingSoon";
export type { BDComingSoonProps } from "./BDComingSoon";
