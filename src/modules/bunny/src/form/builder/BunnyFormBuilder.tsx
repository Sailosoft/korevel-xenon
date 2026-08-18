"use client";

import {
  Input,
  Select,
  ListBox,
  Label,
  TextArea,
  Switch,
} from "@heroui/react";

import { memo, useCallback, useEffect, useId, useState } from "react";
import {
  BunnyFormConfig,
  BunnyFormField,
  BunnyFormMode,
  BunnySelectOption,
} from "../BunnyForm.Interface";
import BunnyMDXEditor from "./BunnyMDXEditor";
import BunnyCodeEditor from "./BunnyCodeEditor";
import { BunnyFormSlugField } from "./BunnyFormSlugField";
import BunnyFormDisplayField from "./BunnyFormDisplayField";

/** Maps colSpan values to Tailwind CSS grid classes (avoids JIT dynamic class issues). */
const colSpanMap: Record<1 | 2 | 3 | 4 | 6 | 8 | 12, string> = {
  1: "col-span-1",
  2: "col-span-2",
  3: "col-span-3",
  4: "col-span-4",
  6: "col-span-6",
  8: "col-span-8",
  12: "col-span-12",
};

interface BunnyFormBuilderProps<T> {
  config: BunnyFormConfig<T>;
  formData: T;
  onChange: (name: string, value: unknown) => void;
  errors?: Record<string, string>;
  /** Current form mode (create/update/view/plain) used to gate `modes`-restricted fields. */
  mode?: BunnyFormMode;
}

export function BunnyFormBuilder<T>({
  config,
  formData,
  onChange,
  errors = {},
  mode,
}: BunnyFormBuilderProps<T>) {
  // Unique instance ID to prevent field id collisions when multiple forms exist on the same page
  const instanceId = useId();

  // Defensive guard: if config is somehow undefined, render nothing
  if (!config) return null;

  // ── Grid arrangement (12-column system) ──────────────────────────────────
  // The form is laid out on a 12-column CSS grid so that `colSpan` values
  // (1,2,3,4,6,8,12) and arbitrary `gridCols` arrangements work consistently:
  //   - `gridCols` = columns per row (1, 2, 3, 4, 6, or 12)
  //   - default    = 1 column per field, i.e. a span of 12 / gridCols
  //   - `colSpan`  = number of columns (of `gridCols`) the field occupies
  const gridCols =
    config.gridCols === 2 ||
    config.gridCols === 3 ||
    config.gridCols === 4 ||
    config.gridCols === 6 ||
    config.gridCols === 12
      ? config.gridCols
      : 1;
  const columnsPerCell = 12 / gridCols;

  // Fields restricted by `modes` are only rendered while the form is in one of
  // the listed modes. Unrestricted fields always render.
  const visibleFields = config.fields.filter((field) => {
    if (!field.modes || field.modes.length === 0) return true;
    return !!mode && field.modes.includes(mode);
  });

  return (
    <div className="space-y-6 w-full">
      <div className="grid w-full grid-cols-12 gap-x-6 gap-y-4">
        {visibleFields.map((field) => {
          const rawValue = (formData as Record<string, unknown>)[field.name];
          const formattedValue = field.format
            ? field.format(rawValue, formData)
            : rawValue;

          // Resolve the field's requested span to a valid 12-column grid class.
          const span = Math.min(
            12,
            Math.max(1, Math.round((field.colSpan ?? 1) * columnsPerCell)),
          );
          const spanClass =
            colSpanMap[span as keyof typeof colSpanMap] ?? "col-span-12";

          return (
            <div key={field.name} className={spanClass}>
              <FieldRenderer
                field={field as BunnyFormField<Record<string, unknown>>}
                value={formattedValue}
                formData={formData as Record<string, unknown>}
                onChange={onChange}
                error={errors[field.name]}
                instanceId={instanceId}
              />
            </div>
          );
        })}
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
  instanceId: string;
}

const FieldRenderer = memo(function FieldRenderer({
  field,
  value,
  formData,
  onChange,
  error,
  instanceId,
}: FieldRendererProps) {
  // Unique per-form-instance ID prefix prevents collisions when multiple forms exist on the same page
  const fieldId = `${instanceId}-field-${field.name}`;
  const showError = !!error;
  const isRequired = !!field.required;

  // States to manage asynchronous mapping cleanly
  const [computedOptions, setComputedOptions] = useState<BunnySelectOption[]>(
    [],
  );
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  const handleChange = useCallback((val: unknown) => {
    if (field.type === "select") {
      // Look up the original option to preserve its value type (string vs number).
      // HeroUI Select coerces everything to string; we restore the original type
      // so form data retains `"123"` (string) vs `123` (number) correctly.
      const stringVal = String(val);
      const matchedOption = computedOptions.find(
        (o) => String(o.value) === stringVal,
      );
      const preservedValue =
        matchedOption !== undefined
          ? typeof matchedOption.value === "number"
            ? Number(stringVal)
            : stringVal
          : val;
      onChange(field.name, preservedValue);
    } else {
      onChange(field.name, val);
    }
  }, [field.type, field.name, onChange, computedOptions]);

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
            setOptionsError(null);
          }
        })
        .catch((err) => {
          console.error(
            `Failed to load options for field "${field.name}":`,
            err,
          );
          if (isMounted) {
            setOptionsError("Failed to load options");
          }
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
            fullWidth
            value={value != null ? String(value) : null}
            onChange={(val) => handleChange(val)}
            placeholder={isLoadingOptions ? "Loading..." : field.placeholder}
            isDisabled={isLoadingOptions}
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover className="max-w-(--trigger-width)">
              {optionsError ? (
                <p className="px-3 py-2 text-sm text-red-500">{optionsError}</p>
              ) : (
                <ListBox
                  key={isLoadingOptions ? "loading-state" : "ready-state"}
                  className="max-h-[320px] overflow-y-auto"
                >
                  {isLoadingOptions ? (
                    <ListBox.Item
                      key="loading-item"
                      id="loading"
                      textValue="Loading options..."
                      className="text-default-400 italic"
                    >
                      Loading options...
                    </ListBox.Item>
                  ) : computedOptions.length === 0 ? (
                    <ListBox.Item
                      key="empty-item"
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
              )}
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
              height: `${Math.max(4, field.rows ?? 4) * 1.5}rem`,
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
              onChange={(isSelected: boolean) => handleChange(isSelected)}
            />
            <Label htmlFor={fieldId} className="cursor-pointer">
              {field.label}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
          </div>
          {showError && <p className="text-sm text-red-500">{error}</p>}
        </div>
      );

    case "slug":
      return (
        <BunnyFormSlugField
          field={field}
          value={value}
          formData={formData}
          onChange={onChange}
          error={error}
        />
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
          language={field.language ?? "typescript"}
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
            field={field}
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
            field,
            value,
            formData,
            onChange,
            error,
          })}
          {showError && <p className="text-sm text-red-500 mt-1">{error}</p>}
        </div>
      );
    }

    case "display":
      // Dev-mode warnings for semantically invalid display field configuration
      if (process.env.NODE_ENV === "development") {
        if (field.required) {
          console.warn(
            `[BunnyForm] Field "${field.name}" has type "display" but is marked required — this has no effect.`,
          );
        }
        if (field.rules && field.rules.length > 0) {
          console.warn(
            `[BunnyForm] Field "${field.name}" has type "display" but has validation rules — these will be ignored.`,
          );
        }
      }
      return (
        <BunnyFormDisplayField
          field={field}
          value={value}
          formData={formData}
          onChange={onChange}
          error={error}
        />
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
