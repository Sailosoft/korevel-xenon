export type BunnyDisplayFieldMode = "card" | "badge" | "text" | "custom";

/** Form modes a field can be restricted to. */
export type BunnyFormMode = "create" | "update" | "view" | "plain";

export interface BunnyDisplayFieldConfig<TForm = Record<string, unknown>> {
  /**
   * Visual display mode:
   * - `"card"`: Renders a styled card with title + subtitle
   * - `"badge"`: Renders a compact badge/pill
   * - `"text"`: Renders plain text (title only)
   * - `"custom"`: Uses a custom render function
   * @default "card"
   */
  mode?: BunnyDisplayFieldMode;
  /** Primary title text — can be a static string or a function receiving formData */
  title?: string | ((formData: TForm) => string);
  /** Secondary subtitle/description — can be a static string or a function receiving formData */
  subtitle?: string | ((formData: TForm) => string);
  /**
   * Custom render function.
   * Only used when `mode === "custom"`.
   * Receives the field props including full formData snapshot.
   */
  render?: (props: BunnyFieldRendererProps<TForm>) => React.ReactNode;
}

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
  | "slug"
  | "custom"
  | "render"
  | "display";

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
  /**
   * Restricts the field to only be displayed/available in the given form modes
   * (e.g. `["create"]` shows it only when creating, `["update", "view"]` for
   * edit/read). When omitted, the field is always rendered.
   */
  modes?: BunnyFormMode[];
  /** Custom formatter function to format the value for display/rendering */
  format?: (value: unknown, formData: TForm) => unknown;
  options?:
    | BunnySelectOption[]
    | (() => BunnySelectOption[] | Promise<BunnySelectOption[]>);
  defaultValue?: TForm[keyof TForm];
  required?: boolean;
  disabled?: boolean;
  /**
   * Number of columns (out of `gridCols`) this field occupies on the
   * form's 12-column grid. Omitting it places the field in a single column.
   *
   * Examples with `gridCols: 2`:
   * - `colSpan: 1` (or omitted) → half width (6 / 12)
   * - `colSpan: 2` → full row width (12 / 12)
   */
  colSpan?: 1 | 2 | 3 | 4 | 6 | 8 | 12;
  // Number of visible text rows for textarea fields (default: 4)
  rows?: number;
  // Programming language for code-editor syntax highlighting (default: "typescript")
  language?: string;
  rules?: BunnyValidationRule[];
  /**
   * Configuration for "display" field type.
   * Renders an information-only field that reacts to form data changes.
   * Supports card, badge, text, and custom visual modes with
   * dynamic title/subtitle resolution based on formData.
   */
  display?: BunnyDisplayFieldConfig<TForm>;
  /**
   * Custom React component to render this field.
   * Only used when `type === "custom"`.
   * Receives {@link BunnyFieldRendererProps} including formData.
   */
  component?: BunnyCustomFieldComponent;
  /**
   * Render function to render this field inline.
   * Only used when `type === "render"`.
   * Receives {@link BunnyFieldRendererProps} including formData.
   */
  render?: BunnyRenderFieldFn;
  /**
   * Configuration for "slug" field type.
   * Automatically generates a URL-safe slug from a watched source field.
   */
  slug?: {
    /** Name of the source field to watch for generating the slug */
    sourceField: string;
    /** Optional prefix added before the generated slug (e.g., "prod-") */
    prefix?: string;
    /** Optional suffix added after the generated slug (e.g., "-v2") */
    suffix?: string;
    /**
     * Custom transformation function.
     * Default transform: lowercase, trim, replace spaces/special chars with hyphens,
     * collapse multiple hyphens, strip leading/trailing hyphens.
     */
    transform?: (value: string) => string;
  };
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
  /**
   * Columns per row on the form's 12-column grid.
   * Supported values: `1`, `2`, `3`, `4`, `6`, `12`.
   * @default 1
   */
  gridCols?: number;
}
