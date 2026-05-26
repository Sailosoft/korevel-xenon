"use client";

import {
  Input,
  Select,
  ListBox,
  Label,
  TextArea,
  Switch,
  cn,
} from "@heroui/react";
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
import { BunnyFormConfig, BunnyFormField } from "../BunnyForm.Interface";
import { useEffect, useRef } from "react";

interface BunnyFormBuilderProps<T> {
  config: BunnyFormConfig<T>;
  formData: T;
  onChange: (name: string, value: unknown) => void;
  errors?: Record<string, string>;
}

export function BunnyFormBuilder<T>({
  config,
  formData,
  onChange,
  errors = {},
}: BunnyFormBuilderProps<T>) {
  return (
    <div className="space-y-6 w-full">
      <div
        className={cn(
          "grid gap-6 w-full py-2",
          config.gridCols === 2 ? "grid-cols-2" : "grid-cols-1",
        )}
      >
        {config.fields.map((field) => (
          <div
            key={field.name}
            className={cn(
              field.colSpan ? `col-span-${field.colSpan}` : "",
              "w-full px-1",
            )}
          >
            <FieldRenderer
              field={field as BunnyFormField<Record<string, unknown>>}
              value={(formData as Record<string, unknown>)[field.name]}
              onChange={onChange}
              error={errors[field.name]}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ====================== Field Renderer ====================== */

interface FieldRendererProps {
  field: BunnyFormField<Record<string, unknown>>;
  value: unknown;
  onChange: (name: string, value: unknown) => void;
  error?: string;
}

function FieldRenderer({ field, value, onChange, error }: FieldRendererProps) {
  const handleChange = (val: unknown) => onChange(field.name, val);
  const fieldId = `field-${field.name}`;
  const showError = !!error;
  const isRequired = !!field.required;

  const editorRef = useRef<MDXEditorMethods>(null);

  // Sync external changes (like a form reset or API load) into the editor
  useEffect(() => {
    const currentMarkdown = editorRef.current?.getMarkdown();

    // Only update if the parent state is genuinely different from internal state
    if (value !== currentMarkdown) {
      editorRef.current?.setMarkdown((value as string) || "");
    }
  }, [value]);
  switch (field.type) {
    case "select":
      return (
        <div className="flex flex-col gap-1 w-full">
          <Label htmlFor={fieldId}>
            {field.label}
            {isRequired && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <Select
            id={fieldId}
            value={value != null ? String(value) : undefined}
            onChange={handleChange}
            placeholder={field.placeholder}
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {field.options?.map((opt) => (
                  <ListBox.Item key={opt.value} textValue={String(opt.value)}>
                    {opt.label}
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
          {showError && <p className="text-sm text-red-500 mt-1">{error}</p>}
        </div>
      );

    case "textarea":
      return (
        <div className="flex flex-col gap-1 w-full">
          <Label htmlFor={fieldId}>
            {field.label}
            {isRequired && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <TextArea
            id={fieldId}
            placeholder={field.placeholder}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => handleChange(e.target.value)}
          />
          {showError && <p className="text-sm text-red-500 mt-1">{error}</p>}
        </div>
      );

    case "switch":
      return (
        <div className="flex flex-col gap-2 w-full">
          <div className="flex items-center gap-3">
            <Switch
              id={fieldId}
              isSelected={Boolean(value)}
              onChange={handleChange}
            />
            <Label htmlFor={fieldId} className="cursor-pointer">
              {field.label}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
          </div>
          {showError && <p className="text-sm text-red-500">{error}</p>}
        </div>
      );

    case "editor":
      return (
        <div className="flex flex-col gap-1 w-full mdx-editor-wrapper">
          <Label htmlFor={fieldId}>
            {field.label}
            {isRequired && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <div className="border rounded-md p-1 min-h-[150px] bg-background prose max-w-none dark:prose-invert">
            <MDXEditor
              ref={editorRef}
              markdown={typeof value === "string" ? value : ""}
              onChange={handleChange}
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
          {showError && <p className="text-sm text-red-500 mt-1">{error}</p>}
        </div>
      );

    default: // text, email, password, number
      return (
        <div className="flex flex-col gap-1 w-full">
          <Label htmlFor={fieldId}>
            {field.label}
            {isRequired && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <Input
            id={fieldId}
            type={
              field.type === "number"
                ? "number"
                : field.type === "password"
                  ? "password"
                  : field.type === "email"
                    ? "email"
                    : "text"
            }
            placeholder={field.placeholder}
            value={
              typeof value === "string" || typeof value === "number"
                ? String(value)
                : ""
            }
            onChange={(e) => handleChange(e.target.value)}
          />
          {showError && <p className="text-sm text-red-500 mt-1">{error}</p>}
        </div>
      );
  }
}
