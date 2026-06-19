"use client";

import { Input, Label } from "@heroui/react";
import { useEffect } from "react";
import { BunnyFormField } from "../BunnyForm.Interface";

/* ====================== Slug Field Component ====================== */

interface BunnyFormSlugFieldProps {
  field: BunnyFormField<Record<string, unknown>>;
  value: unknown;
  formData: Record<string, unknown>;
  onChange: (name: string, value: unknown) => void;
  error?: string;
}

/**
 * Auto-generating slug field.
 *
 * Watches the configured `slug.sourceField` value in `formData` and
 * automatically computes a URL-safe slug whenever it changes.
 *
 * Supports optional `prefix`, `suffix`, and custom `transform` via the
 * field's `slug` configuration. The rendered Input is editable so users
 * can manually override the generated value.
 *
 * @see BunnyFormField.slug
 */
export function BunnyFormSlugField({
  field,
  value,
  formData,
  onChange,
  error,
}: BunnyFormSlugFieldProps) {
  const fieldId = `field-${field.name}`;
  const showError = !!error;
  const isRequired = !!field.required;
  const slugConfig = field.slug;

  const handleChange = (val: unknown) => {
    onChange(field.name, val);
  };

  // Resolve the current source field value for effect dependencies
  const sourceFieldValue: unknown = slugConfig
    ? formData[slugConfig.sourceField]
    : undefined;

  // Auto-generate slug when the source field value changes
  useEffect(() => {
    if (!slugConfig) return;

    const { sourceField, prefix = "", suffix = "", transform } = slugConfig;
    const sourceVal = formData[sourceField];

    if (typeof sourceVal !== "string" || !sourceVal.trim()) return;

    // Default slug transform: lowercase, trim, replace special chars with hyphens
    const defaultSlugify = (val: string) =>
      val
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/[\s_]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "");

    const slugify = transform ?? defaultSlugify;
    const newSlug = `${prefix}${slugify(sourceVal)}${suffix}`;

    if (newSlug !== value) {
      onChange(field.name, newSlug);
    }
    // Intentionally only re-run when source-field-derived dependencies change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    slugConfig?.sourceField,
    slugConfig?.prefix,
    slugConfig?.suffix,
    sourceFieldValue,
    field.name,
  ]);

  return (
    <div className="flex flex-col gap-1 w-full">
      <Label htmlFor={fieldId}>
        {field.label}
        {isRequired && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <Input
        id={fieldId}
        type="text"
        placeholder={field.placeholder ?? "Auto-generated slug"}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => handleChange(e.target.value)}
      />
      {showError && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
}
