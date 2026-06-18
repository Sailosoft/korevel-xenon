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

import { memo, useEffect, useState } from "react";
import {
  BunnyFormConfig,
  BunnyFormField,
  BunnySelectOption,
} from "../BunnyForm.Interface";
import BunnyMDXEditor from "./BunnyMDXEditor";
import BunnyCodeEditor from "./BunnyCodeEditor";

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
  // Defensive guard: if config is somehow undefined, render nothing
  if (!config) return null;

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
              formData={formData as Record<string, unknown>}
              onChange={onChange}
              error={errors[field.name]}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ====================== Field Renderer (memoized) ====================== */

interface FieldRendererProps {
  field: BunnyFormField<Record<string, unknown>>;
  value: unknown;
  formData: Record<string, unknown>;
  onChange: (name: string, value: unknown) => void;
  error?: string;
}

const FieldRenderer = memo(function FieldRenderer({
  field,
  value,
  formData,
  onChange,
  error,
}: FieldRendererProps) {
  const handleChange = (val: unknown) => {
    // Safely cast numeric string IDs back to integers for form configuration
    const sanitizedValue =
      field.type === "select" && typeof val === "string" && !isNaN(Number(val))
        ? Number(val)
        : val;

    onChange(field.name, sanitizedValue);
  };
  const fieldId = `field-${field.name}`;
  const showError = !!error;
  const isRequired = !!field.required;

  // States to manage asynchronous mapping cleanly
  const [computedOptions, setComputedOptions] = useState<BunnySelectOption[]>(
    [],
  );
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  // Sync and resolve options configuration (runs explicitly for select fields)
  useEffect(() => {
    if (field.type !== "select" || !field.options) return;

    if (Array.isArray(field.options)) {
      setComputedOptions(field.options);
      return;
    }

    if (typeof field.options === "function") {
      let isMounted = true;
      setIsLoadingOptions(true);

      // Force resolution regardless of synchronous execution or API Promises
      Promise.resolve(field.options())
        .then((resolvedData) => {
          if (isMounted) {
            setComputedOptions(resolvedData || []);
          }
        })
        .catch((err) => {
          console.error(
            `Failed to load options for field "${field.name}":`,
            err,
          );
        })
        .finally(() => {
          if (isMounted) setIsLoadingOptions(false);
        });

      return () => {
        isMounted = false; // Prevents race conditions / state updates on unmounted components
      };
    }
  }, [field.options, field.type, field.name]);

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
            aria-label={field.label}
            value={value != null ? String(value) : null}
            onChange={(val) => handleChange(val)}
            placeholder={isLoadingOptions ? "Loading..." : field.placeholder}
            isDisabled={isLoadingOptions}
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              {/* 
                FIX 1: Keying the ListBox forces a total collection reset 
                when switching states, safely avoiding cached node reuse.
              */}
              <ListBox key={isLoadingOptions ? "loading-state" : "ready-state"}>
                {isLoadingOptions ? (
                  <ListBox.Item
                    key="loading-item" // FIX 2: Explicit React key
                    id="loading"
                    textValue="Loading options..."
                    className="text-default-400 italic"
                  >
                    Loading options...
                  </ListBox.Item>
                ) : computedOptions.length === 0 ? (
                  <ListBox.Item
                    key="empty-item" // FIX 2: Explicit React key
                    id="empty"
                    textValue="No options found"
                    className="text-default-400 italic"
                  >
                    No options available
                  </ListBox.Item>
                ) : (
                  computedOptions.map((opt) => (
                    <ListBox.Item
                      key={String(opt.value)}
                      id={String(opt.value)}
                      textValue={opt.label}
                    >
                      {opt.label}
                    </ListBox.Item>
                  ))
                )}
              </ListBox>
            </Select.Popover>
          </Select>
          {showError && <p className="text-sm text-red-500 mt-1">{error}</p>}
        </div>
      );
    // TextArea
    case "textarea":
      return (
        <div className="flex flex-col gap-1 w-full">
          <Label htmlFor={fieldId}>
            {field.label}
            {isRequired && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <TextArea
            id={fieldId}
            // isDisabled={field.disabled}
            placeholder={field.placeholder}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => handleChange(e.target.value)}
            className="min-h-[120px]"
            style={{
              height: `${Math.max(4, (field as BunnyFormField<Record<string, unknown>>).rows ?? 4) * 1.5}rem`,
            }}
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
              isDisabled={field.disabled}
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
        <BunnyMDXEditor
          id={fieldId}
          label={field.label}
          required={isRequired}
          value={typeof value === "string" ? value : ""}
          onChange={(val: string) => handleChange(val)}
          placeholder={field.placeholder}
          error={error}
        />
      );

    case "code-editor":
      return (
        <BunnyCodeEditor
          id={fieldId}
          label={field.label}
          required={isRequired}
          value={typeof value === "string" ? value : ""}
          onChange={(val: string) => handleChange(val)}
          placeholder={field.placeholder}
          error={error}
          language={
            (field as BunnyFormField<Record<string, unknown>>).language ??
            "typescript"
          }
        />
      );

    /* ====================== Custom / Render Fields ====================== */

    case "custom": {
      const CustomComponent = field.component;
      if (!CustomComponent) {
        console.warn(
          `Field "${field.name}" has type "custom" but no "component" prop provided.`,
        );
        return null;
      }
      return (
        <div className="flex flex-col gap-1 w-full">
          {field.label && (
            <Label htmlFor={fieldId}>
              {field.label}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
          )}
          <CustomComponent
            field={field as BunnyFormField<Record<string, unknown>>}
            value={value}
            formData={formData}
            onChange={onChange}
            error={error}
          />
          {showError && <p className="text-sm text-red-500 mt-1">{error}</p>}
        </div>
      );
    }

    case "render": {
      const renderFn = field.render;
      if (!renderFn) {
        console.warn(
          `Field "${field.name}" has type "render" but no "render" prop provided.`,
        );
        return null;
      }
      return (
        <div className="flex flex-col gap-1 w-full">
          {field.label && (
            <Label htmlFor={fieldId}>
              {field.label}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
          )}
          {renderFn({
            field: field as BunnyFormField<Record<string, unknown>>,
            value,
            formData,
            onChange,
            error,
          })}
          {showError && <p className="text-sm text-red-500 mt-1">{error}</p>}
        </div>
      );
    }

    default: // text, email, password, number
      return (
        <div className="flex flex-col gap-1 w-full">
          <Label htmlFor={fieldId}>
            {field.label}
            {isRequired && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <Input
            id={fieldId}
            // isDisabled={field.disabled}
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
});
