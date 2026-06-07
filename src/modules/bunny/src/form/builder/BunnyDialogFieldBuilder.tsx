"use client";

import React, { useEffect, useRef, useState } from "react";
import { Input, Select, ListBox, Label, TextArea, Switch } from "@heroui/react";
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
    <div className="space-y-6 w-full">
      <div className="grid gap-6 w-full py-2 grid-cols-1">
        {fields.map((field) => (
          <div key={field.name} className="w-full px-1">
            <FieldRenderer field={field} formState={formState} />
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
}

function FieldRenderer({ field, formState }: FieldRendererProps) {
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
  const [switchSelected, setSwitchSelected] = useState<boolean>(
    Boolean(fallbackValue),
  );
  const [selectedKey, setSelectedKey] = useState<string>(
    fallbackValue ? String(fallbackValue) : "",
  );

  const editorRef = useRef<MDXEditorMethods>(null);

  // Synchronize incoming resets or revalidation states across hook cycles
  useEffect(() => {
    if (field.type === "editor") {
      const currentMarkdown = editorRef.current?.getMarkdown();
      const nextValue = typeof fallbackValue === "string" ? fallbackValue : "";
      if (nextValue !== currentMarkdown) {
        editorRef.current?.setMarkdown(nextValue);
        setEditorValue(nextValue);
      }
    } else if (field.type === "checkbox") {
      setSwitchSelected(Boolean(fallbackValue));
    } else if (field.type === "select") {
      setSelectedKey(fallbackValue ? String(fallbackValue) : "");
    }
  }, [fallbackValue, field.type]);

  switch (field.type) {
    case "select":
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
              setSelectedKey(key ? String(key) : "");
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
          {showError && (
            <p className="text-sm text-red-500 mt-1">{errorText}</p>
          )}
        </div>
      );

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
          />
          {showError && (
            <p className="text-sm text-red-500 mt-1">{errorText}</p>
          )}
        </div>
      );

    case "checkbox":
      return (
        <div className="flex flex-col gap-2 w-full">
          <div className="flex items-center gap-3">
            <Switch
              id={fieldId}
              isSelected={switchSelected}
              // onValueChange={setSwitchSelected}
              aria-labelledby={labelId}
            />
            <Label id={labelId} htmlFor={fieldId} className="cursor-pointer">
              {field.label}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
          </div>
          {/* Hidden element acts as an index placeholder bridging Switch boolean value into your FormAction context */}
          <input
            type="hidden"
            name={field.name}
            value={switchSelected ? "true" : "false"}
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
