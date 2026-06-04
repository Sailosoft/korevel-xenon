export type BunnyFieldType =
  | "text"
  | "number"
  | "email"
  | "password"
  | "select"
  | "textarea"
  | "switch"
  | "editor";
export interface BunnySelectOption {
  label: string;
  value: string | number;
}

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
  colSpan?: 1 | 2 | 3 | 4 | 6 | 8 | 12;
  // validation?: (value: unknown, formData?: unknown) => string | boolean | undefined;
  rules?: BunnyValidationRule[];
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
