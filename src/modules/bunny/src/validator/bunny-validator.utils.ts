// utils/bunny-validator.ts

import { BunnyFormField } from '../form/BunnyForm.Interface';


export function validateBunnyForm<TForm = Record<string, unknown>>(
  fields: BunnyFormField<TForm>[],
  formData: TForm
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const field of fields) {
    const value = formData[field.name as keyof TForm];

    // 1. Implicit required field check
    if (field.required && (value === undefined || value === null || String(value).trim() === "")) {
      errors[field.name] = `${field.label} is required`;
      continue;
    }

    // 2. Process explicit rules array
    if (field.rules) {
      for (const ruleDef of field.rules) {
        let isValid = true;

        switch (ruleDef.rule) {
          case "required":
            isValid = value !== undefined && value !== null && String(value).trim() !== "";
            break;
          case "minLength":
            isValid = String(value || "").length >= (ruleDef.value as number ?? 0);
            break;
          case "maxLength":
            isValid = String(value || "").length <= (ruleDef.value as number ?? 0);
            break;
          case "email":
            isValid = !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value));
            break;
          case "custom":
            if (typeof ruleDef.validate === "function") {
              isValid = ruleDef.validate(value, formData);
            }
            break;
        }

        if (!isValid) {
          errors[field.name] = ruleDef.message;
          break; // Stop assessing this field on first error match
        }
      }
    }
  }

  return errors;
}