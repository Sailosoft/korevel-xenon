export interface AdminPanelFormFieldDefinition {
  name: string;
  label: string;
  type: "text" | "number" | "textarea" | "select" | "checkbox" | "editor";
  placeholder?: string;
  required?: boolean;
  defaultValue?: unknown;
  /** For select fields */
  options?: { label: string; value: string | number }[];
}

export interface AdminPanelFormActionState {
  success?: boolean;
  errors?: Record<string, string[]>; // Field-specific validation errors
  values?: Record<string, unknown>; // Retained user entries
  message?: string; // General summary message
}
