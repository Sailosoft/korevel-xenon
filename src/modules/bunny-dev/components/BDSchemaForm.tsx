"use client";

// BDSchemaForm — adapts the App Builder's `BDAppField[]` descriptors onto the
// generic BDForm renderer. Lets designers and the App Rendering engine reuse a
// single form implementation.

import type { BDAppField, BDAppFieldType } from "../BDDomain.Types";
import BDForm, {
  type BDFormField,
  type BDFormFieldType,
  type BDFormValues,
} from "./BDForm";
import type { BDFormOption } from "./BDForm";

export interface BDSchemaFormProps {
  fields: BDAppField[];
  value: BDFormValues;
  onChange: (value: BDFormValues) => void;
  onSubmit?: (value: BDFormValues) => void | Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
  columns?: 1 | 2 | 3 | 4;
  isLoading?: boolean;
  error?: string | null;
  /** Relation options keyed by field name (resolved by the caller). */
  relationOptions?: Record<string, BDFormOption[]>;
}

const TYPE_MAP: Record<BDAppFieldType, BDFormFieldType> = {
  text: "text",
  textarea: "textarea",
  richEditor: "textarea",
  markdown: "textarea",
  code: "textarea",
  slug: "text",
  hidden: "hidden",
  select: "select",
  multiSelect: "multiSelect",
  radio: "select",
  checkbox: "toggle",
  checkboxList: "multiSelect",
  toggle: "toggle",
  toggleButtons: "select",
  date: "date",
  time: "text",
  dateTime: "date",
  color: "color",
  tags: "tags",
  keyValue: "keyValue",
  fileUpload: "fileUpload",
  image: "fileUpload",
  repeater: "repeater",
  builder: "repeater",
  relationSelect: "relationSelect",
};

function toOptions(
  options: Record<string, string> | undefined,
): BDFormOption[] | undefined {
  if (!options) return undefined;
  return Object.entries(options).map(([value, label]) => ({ label, value }));
}

export function BDSchemaForm({
  fields,
  value,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
  columns = 2,
  isLoading,
  error,
  relationOptions,
}: BDSchemaFormProps) {
  const formFields: BDFormField[] = fields
    .filter((field) => !field.hidden)
    .map((field) => {
      const isRelation = field.type === "relationSelect";
      const relationMultiple = isRelation && field.relation?.multiple === true;
      // Free-form `tags` becomes a constrained multi-select when the field
      // defines options, so authored option lists are honored.
      const tagsWithOptions =
        field.type === "tags" &&
        !!field.options &&
        Object.keys(field.options).length > 0;
      return {
        name: field.name,
        label: field.label ?? field.name,
        type:
          relationMultiple || tagsWithOptions
            ? "multiSelect"
            : (TYPE_MAP[field.type] ?? "text"),
        placeholder: field.placeholder,
        helperText: field.helperText,
        required: field.required,
        disabled: field.disabled,
        rows: field.type === "richEditor" ? 10 : 4,
        accept: field.accept,
        columnSpan:
          field.columnSpan === "full"
            ? "full"
            : (field.columnSpan as BDFormField["columnSpan"]),
        options: isRelation
          ? relationOptions?.[field.name]
          : toOptions(field.options),
        searchable: isRelation && field.relation?.searchable === true,
      };
    });

  return (
    <BDForm
      fields={formFields}
      value={value}
      onChange={onChange}
      onSubmit={onSubmit}
      onCancel={onCancel}
      submitLabel={submitLabel}
      columns={columns}
      isLoading={isLoading}
      error={error}
    />
  );
}

export default BDSchemaForm;
