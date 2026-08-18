export interface AdminPanelFormFieldDefinition {
  name: string;
  label: string;
  type: "text" | "number" | "textarea" | "select" | "checkbox" | "editor";
  placeholder?: string;
  required?: boolean;
  defaultValue?: unknown;
  /** For select fields */
  options?: { label: string; value: string | number }[];
  /**
   * When provided, the field is only rendered while the referenced field's
   * value satisfies the condition. If `value` is omitted the condition is a
   * truthiness check (e.g. a checkbox being checked).
   */
  showIf?: {
    /** Name of another field whose value gates this field's visibility. */
    field: string;
    /** Expected value of the referenced field. When omitted, any truthy value shows the field. */
    value?: string | number | boolean;
  };
  /** When true, a select field supports selecting multiple options (comma-separated value). */
  multiple?: boolean;
}

export interface AdminPanelFormActionState {
  success?: boolean;
  errors?: Record<string, string[]>; // Field-specific validation errors
  values?: Record<string, unknown>; // Retained user entries
  message?: string; // General summary message
}
