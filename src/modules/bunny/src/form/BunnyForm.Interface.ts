export type BunnyFieldType =
  | "text"
  | "number"
  | "email"
  | "password"
  | "select"
  | "textarea"
  | "switch"
  | "editor"
  | "code-editor"
  | "custom"
  | "render";

export interface BunnySelectOption {
  label: string;
  value: string | number;
}

/**
 * Props passed to custom/render field components.
 * Provides full access to field metadata, current value,
 * change handler, validation error, and the entire form data snapshot.
 */
export interface BunnyFieldRendererProps<TForm = Record<string, unknown>> {
  /** The field definition from the form configuration */
  field: BunnyFormField<TForm>;
  /** Current value of this field */
  value: unknown;
  /** Callback to update the field value (name, value) */
  onChange: (name: string, value: unknown) => void;
  /** Validation error message for this field, if any */
  error?: string;
  /** The entire form data snapshot (useful for interdependent fields) */
  formData: TForm;
}

/**
 * Discriminated union helper: extracts the props type for "custom" fields
 * that use a React component.
 */
export type BunnyCustomFieldComponent<TForm = Record<string, unknown>> =
  React.ComponentType<BunnyFieldRendererProps<TForm>>;

/**
 * Discriminated union helper: extracts the props type for "render" fields
 * that use a render function.
 */
export type BunnyRenderFieldFn<TForm = Record<string, unknown>> = (
  props: BunnyFieldRendererProps<TForm>,
) => React.ReactNode;

export interface BunnyFormField<TForm = Record<string, unknown>> {
  name: string;
  label: string;
  placeholder?: string;
  type: BunnyFieldType;
  options?:
    | BunnySelectOption[]
    | (() => BunnySelectOption[] | Promise<BunnySelectOption[]>);
  defaultValue?: TForm[keyof TForm];
  required?: boolean;
  disabled?: boolean;
  colSpan?: 1 | 2 | 3 | 4 | 6 | 8 | 12;
  // Number of visible text rows for textarea fields (default: 4)
  rows?: number;
  // Programming language for code-editor syntax highlighting (default: "typescript")
  language?: string;
  // validation?: (value: unknown, formData?: unknown) => string | boolean | undefined;
  rules?: BunnyValidationRule[];
  /**
   * Custom React component to render this field.
   * Only used when `type === "custom"`.
   * Receives {@link BunnyFieldRendererProps} including formData.
   */
  component?: BunnyCustomFieldComponent<TForm>;
  /**
   * Render function to render this field inline.
   * Only used when `type === "render"`.
   * Receives {@link BunnyFieldRendererProps} including formData.
   */
  render?: BunnyRenderFieldFn<TForm>;
}

export interface BunnyValidationRule {
  rule: "required" | "minLength" | "maxLength" | "email" | "custom";
  message: string;
  value?: unknown;
  validate?: (value: unknown, formData: unknown) => boolean;
}

export interface BunnyFormConfig<TForm> {
  fields: BunnyFormField<TForm>[];
  submitLabel?: string;
  gridCols?: number;
}
