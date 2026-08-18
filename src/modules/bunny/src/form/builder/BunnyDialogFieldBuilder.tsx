"use client";

import React, { useCallback, useMemo, useState } from "react";
import { Input, Select, ListBox, Label, TextArea, Checkbox } from "@heroui/react";
import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  MDXEditorMethods,
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import {
  AdminPanelFormActionState,
  AdminPanelFormFieldDefinition,
} from "@/src/modules/admin-panel/features/form-fields/admin-panel-form-field.interface";

interface BunnyDialogFieldsProps {
  fields: AdminPanelFormFieldDefinition[];
  formState: AdminPanelFormActionState;
}

export default function BunnyDialogFieldBuilder({
  fields,
  formState,
}: BunnyDialogFieldsProps) {
  if (!fields || fields.length === 0) return null;

  return (
    <BunnyDialogFieldsInner fields={fields} formState={formState} />
  );
}

/* ====================== Parent (lifted state) ====================== */

function BunnyDialogFieldsInner({
  fields,
  formState,
}: BunnyDialogFieldsProps) {
  // Lifted field values so `showIf` gating can react to checkbox/select changes
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    buildInitialValues(fields, formState?.values),
  );

  // Re-sync state whenever a new set of fields is supplied (e.g. a new dialog opens)
  const [prevFields, setPrevFields] = useState(fields);
  if (fields !== prevFields) {
    setPrevFields(fields);
    setValues(buildInitialValues(fields, formState?.values));
  }

  const handleValueChange = useCallback((name: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const visibleFields = useMemo(
    () => fields.filter((field) => isFieldVisible(field, values)),
    [fields, values],
  );

  return (
    <div className="space-y-6 w-full">
      <div className="grid gap-6 w-full py-2 grid-cols-1">
        {visibleFields.map((field) => (
          <div key={field.name} className="w-full px-1">
            <FieldRenderer
              field={field}
              formState={formState}
              onValueChange={handleValueChange}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ====================== Field Renderer ====================== */

interface FieldRendererProps {
  field: AdminPanelFormFieldDefinition;
  formState: AdminPanelFormActionState;
  onValueChange?: (name: string, value: unknown) => void;
}

function FieldRenderer({ field, formState, onValueChange }: FieldRendererProps) {
  const fieldId = `field-${field.name}`;
  const labelId = `${fieldId}-label`;
  const fieldErrors = formState?.errors?.[field.name];
  const showError = !!(fieldErrors && fieldErrors.length > 0);
  const errorText = fieldErrors?.join(", ");
  const isRequired = !!field.required;

  // Derive the current state value injected from validation snapshots or fallback definitions
  const fallbackValue = formState?.values?.[field.name] ?? field.defaultValue;

  // Local state synchronization mappings for non-native components
  const [editorValue, setEditorValue] = useState<string>(
    typeof fallbackValue === "string" ? fallbackValue : "",
  );
  const [checkboxSelected, setCheckboxSelected] = useState<boolean>(
    parseCheckboxValue(fallbackValue),
  );
  const [selectedKey, setSelectedKey] = useState<string>(
    fallbackValue ? String(fallbackValue) : "",
  );
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(
    () => new Set(splitMultiValue(fallbackValue)),
  );

  const editorRef = React.useRef<MDXEditorMethods>(null);

  // Track the previous fallback value and re-sync controlled state during
  // render (not in an effect) when it changes — avoids cascading setState
  // calls flagged by `react-hooks/set-state-in-effect`.
  const [prevFallbackValue, setPrevFallbackValue] = useState(fallbackValue);
  if (fallbackValue !== prevFallbackValue) {
    setPrevFallbackValue(fallbackValue);
    if (field.type === "checkbox") {
      setCheckboxSelected(parseCheckboxValue(fallbackValue));
    } else if (field.type === "select") {
      if (field.multiple) {
        setSelectedKeys(new Set(splitMultiValue(fallbackValue)));
      } else {
        setSelectedKey(fallbackValue ? String(fallbackValue) : "");
      }
    }
  }

  // Synchronize incoming resets or revalidation states across hook cycles
  React.useEffect(() => {
    if (field.type === "editor") {
      const currentMarkdown = editorRef.current?.getMarkdown();
      const nextValue = typeof fallbackValue === "string" ? fallbackValue : "";
      if (nextValue !== currentMarkdown) {
        editorRef.current?.setMarkdown(nextValue);
        setEditorValue(nextValue);
      }
    }
  }, [fallbackValue, field.type]);

  switch (field.type) {
    case "select": {
      if (field.multiple) {
        return (
          <div className="flex flex-col gap-1 w-full">
            <Label id={labelId} htmlFor={fieldId}>
              {field.label}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <select
              id={fieldId}
              multiple
              aria-labelledby={labelId}
              value={Array.from(selectedKeys)}
              onChange={(event) => {
                const values = Array.from(
                  event.target.selectedOptions,
                  (option) => option.value,
                );
                const next = new Set(values);
                setSelectedKeys(next);
                onValueChange?.(field.name, values.join(","));
              }}
              className="w-full min-h-[120px] rounded-md border border-default-200 bg-background px-2 py-1.5 text-sm outline-none focus:border-primary transition-colors"
            >
              {(field.options ?? []).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {/* Hidden input bridges the multi-Select value into the native
                FormData (comma-separated) for `onConfirm`. */}
            <input
              type="hidden"
              name={field.name}
              value={Array.from(selectedKeys).join(",")}
            />
            {showError && (
              <p className="text-sm text-red-500 mt-1">{errorText}</p>
            )}
          </div>
        );
      }

      return (
        <div className="flex flex-col gap-1 w-full">
          <Label id={labelId} htmlFor={fieldId}>
            {field.label}
            {isRequired && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <Select
            name={field.name}
            id={fieldId}
            aria-labelledby={labelId}
            value={selectedKey}
            // selectedKeys={selectedKey ? [selectedKey] : []}
            onChange={(key) => {
              const nextKey = key ? String(key) : "";
              setSelectedKey(nextKey);
              onValueChange?.(field.name, nextKey);
            }}
            placeholder={field.placeholder}
          >
            <Select.Trigger aria-labelledby={labelId}>
              <Select.Value aria-labelledby={labelId} />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox aria-labelledby={labelId}>
                {(field.options ?? []).map((opt) => (
                  <ListBox.Item
                    key={opt.value}
                    id={opt.value}
                    textValue={String(opt.value)}
                  >
                    {opt.label}
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
          {/* Hidden input bridges the HeroUI Select value into the native
              FormData submitted to `onConfirm` (the Select trigger is not a
              native form field). Mirrors the checkbox / editor cases. */}
          <input type="hidden" name={field.name} value={selectedKey} />
          {showError && (
            <p className="text-sm text-red-500 mt-1">{errorText}</p>
          )}
        </div>
      );
    }

    case "textarea":
      return (
        <div className="flex flex-col gap-1 w-full">
          <Label id={labelId} htmlFor={fieldId}>
            {field.label}
            {isRequired && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <TextArea
            id={fieldId}
            name={field.name}
            aria-labelledby={labelId}
            placeholder={field.placeholder}
            defaultValue={
              typeof fallbackValue === "string" ? fallbackValue : ""
            }
            className="min-h-[120px]"
            style={{ height: "6rem" }}
          />
          {showError && (
            <p className="text-sm text-red-500 mt-1">{errorText}</p>
          )}
        </div>
      );

    case "checkbox":
      return (
        <div className="flex flex-col gap-2 w-full">
          <Checkbox
            isSelected={checkboxSelected}
            onChange={(val) => {
              setCheckboxSelected(val);
              onValueChange?.(field.name, val);
            }}
            aria-labelledby={labelId}
          >
            {/* Checkbox.Content is the clickable RAC label that wraps the
                control + indicator; without it the field is not interactive. */}
            <Checkbox.Content className="cursor-pointer">
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              <span id={labelId} className="text-sm">
                {field.label}
                {isRequired && <span className="text-red-500 ml-1">*</span>}
              </span>
            </Checkbox.Content>
          </Checkbox>
          {/* Hidden input bridges the Checkbox boolean value into the
              FormAction context (the RAC CheckboxField isn't a native
              field submitted with the form). */}
          <input
            type="hidden"
            name={field.name}
            value={checkboxSelected ? "true" : "false"}
          />
          {showError && <p className="text-sm text-red-500">{errorText}</p>}
        </div>
      );

    case "editor":
      return (
        <div className="flex flex-col gap-1 w-full mdx-editor-wrapper">
          <Label id={labelId} htmlFor={fieldId}>
            {field.label}
            {isRequired && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <div
            className="border rounded-md p-1 min-h-[150px] bg-background prose max-w-none dark:prose-invert"
            role="application"
            aria-labelledby={labelId}
          >
            <MDXEditor
              ref={editorRef}
              markdown={editorValue}
              onChange={(val) => setEditorValue(val)}
              placeholder={field.placeholder}
              plugins={[
                headingsPlugin(),
                listsPlugin(),
                quotePlugin(),
                thematicBreakPlugin(),
                markdownShortcutPlugin(),
              ]}
            />
          </div>
          {/* Synchronized hidden portal guarantees MDX source texts stream smoothly straight into browser native arrays */}
          <input type="hidden" name={field.name} value={editorValue} />
          {showError && (
            <p className="text-sm text-red-500 mt-1">{errorText}</p>
          )}
        </div>
      );

    default: // text, email, password, number
      return (
        <div className="flex flex-col gap-1 w-full">
          <Label id={labelId} htmlFor={fieldId}>
            {field.label}
            {isRequired && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <Input
            id={fieldId}
            name={field.name}
            aria-labelledby={labelId}
            type={field.type === "number" ? "number" : "text"}
            placeholder={field.placeholder}
            defaultValue={
              typeof fallbackValue === "string" ||
              typeof fallbackValue === "number"
                ? String(fallbackValue)
                : ""
            }
          />
          {showError && (
            <p className="text-sm text-red-500 mt-1">{errorText}</p>
          )}
        </div>
      );
  }
}

/* ====================== Helpers ====================== */

/**
 * Builds the initial lifted value map for a set of fields, normalizing
 * checkbox defaults so a `"false"` string is not treated as truthy.
 */
function buildInitialValues(
  fields: AdminPanelFormFieldDefinition[],
  savedValues?: Record<string, unknown>,
): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const field of fields) {
    const saved = savedValues?.[field.name];
    const value = saved !== undefined ? saved : field.defaultValue;
    values[field.name] =
      field.type === "checkbox" ? parseCheckboxValue(value) : value;
  }
  return values;
}

/** Converts raw fallback values (string "false", booleans, etc.) to a real boolean. */
function parseCheckboxValue(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    return value === "true" || value === "1" || value === "on";
  }
  return Boolean(value);
}

/** Evaluates truthiness for `showIf` gating (empty strings / "false" are falsy). */
function isTruthy(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    return !(
      value === "" ||
      value === "false" ||
      value === "0" ||
      value === "null" ||
      value === "undefined"
    );
  }
  return Boolean(value);
}

/** Checks whether a field should be visible given the current field values. */
function isFieldVisible(
  field: AdminPanelFormFieldDefinition,
  values: Record<string, unknown>,
): boolean {
  if (!field.showIf) return true;
  const depValue = values[field.showIf.field];
  if (field.showIf.value === undefined) {
    return isTruthy(depValue);
  }
  return String(depValue) === String(field.showIf.value);
}

/** Splits a stored comma-separated multi-select value into individual keys. */
function splitMultiValue(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    return value
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return [];
}
