export type BunnyFieldType =
  | "text"
  | "number"
  | "email"
  | "password"
  | "select"
  | "textarea"
  | "switch"
  | "editor";

export interface BunnyFormField {
  name: string;
  label: string;
  placeholder?: string;
  type: BunnyFieldType;
  options?: { label: string; value: string | number }[]; // For select
  defaultValue?: any;
  required?: boolean;
  colSpan?: 1 | 2 | 3 | 4 | 6 | 8 | 12;
  validation?: (value: any, formData?: any) => string | boolean | undefined;
}

export interface BunnyFormConfig {
  fields: BunnyFormField[];
  submitLabel?: string;
  gridCols?: number;
}
