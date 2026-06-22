# Bunny Validation Adapter

## Overview

Bunny ships with a built-in validation system based on `BunnyValidationRule` (required, minLength, maxLength, email, custom). But what if you want **Zod** — or Yup, Joi, or anything else?

The **Validation Adapter** pattern lets you plug any external validation library into Bunny **without adding that library as a dependency of Bunny itself**. Bunny only imports a lightweight interface — the adapter implementation lives in **your consumer project**.

---

## How It Works

```mermaid
flowchart LR
    subgraph "Bunny Core (zero validation deps)"
        BI[BunnyValidationAdapter\ninterface: validate()]
        BP["handlePrimaryAction\n↓\nif adapter exists, use it\nelse use built-in rules"]
    end

    subgraph "Your Project"
        ZA["useBunnyZodAdapter(schema)\nreturns BunnyValidationAdapter"]
        Z[Zod Schema]
    end

    Z --> ZA
    ZA -->|implements| BI
    BP -->|calls| BI
    BI -->|"Record<string, string>"| FE["form.setFormError()"]
```

---

## The Interface

```ts
// src/modules/bunny/src/Bunny.Interface.ts
export interface BunnyValidationAdapter<TForm = Record<string, unknown>> {
  validate: (formData: TForm) => Record<string, string>;
}
```

That's it. One method. Return `{}` on success, return `{ fieldName: "error message" }` on failure.

---

## Use Cases

### 1. Full-form Zod validation (recommended)

Define one Zod schema for the entire form shape.

```tsx
import Bunny from "@/modules/bunny/src/Bunny";
import { useBunnyZodAdapter } from "@/modules/bunny/adapters/BunnyZodAdapter";
import { z } from "zod";

const bookSchema = z.object({
  title: z.string().min(1, "Title is required"),
  isbn: z.string().regex(/^\d{10,13}$/, "ISBN must be 10-13 digits"),
  authorId: z.string().uuid("Select a valid author"),
  publishedYear: z.coerce
    .number()
    .int()
    .min(1900, "Year must be 1900 or later")
    .max(new Date().getFullYear(), "Year cannot be in the future"),
});

// Create the adapter once — it's a plain object
const adapter = useBunnyZodAdapter(bookSchema);

export default function BooksPage() {
  return (
    <Bunny
      config={{
        title: "Books",
        columns: bookColumns,
        rowKey: "id",
        query: bookQuery,
        mutation: bookMutation,
        formConfig: myBookFormConfig,
        validationAdapter: adapter, // ← Zod handles all validation
        defaultHeaderActions: true,
        defaultRowActions: true,
      }}
    />
  );
}
```

### 2. Partial / incremental migration

Have an existing form with `BunnyValidationRule` fields? Migrate **one field at a time** using a partial Zod schema.

```tsx
import { useBunnyZodAdapter } from "@/modules/bunny/adapters/BunnyZodAdapter";

// Only validate the email field via Zod; everything else uses built-in rules
const emailOnlySchema = z.object({
  email: z.string().email("Invalid email format"),
});

// BunnyConfig stays the same — adapter only adds email validation
<Bunny
  config={{
    formConfig: myFormConfig, // still has rules[] on other fields
    validationAdapter: useBunnyZodAdapter(emailOnlySchema),
  }}
/>;
```

> **Note**: When an adapter is present, it **replaces** the built-in rules entirely for the fields it validates. There's no automatic merging. If you need hybrid validation, include all relevant fields in your Zod schema.

### 3. Custom adapter (Yup, Joi, or plain functions)

The interface is generic — you can implement it with any library.

```tsx
// Yup adapter example
import { object, string, ValidationError } from "yup";
import type { BunnyValidationAdapter } from "@/modules/bunny/src/Bunny.Interface";

const schema = object({
  title: string().required("Title is required"),
  email: string().email("Invalid email"),
});

const yupAdapter: BunnyValidationAdapter<MyForm> = {
  validate: async (formData) => {
    try {
      await schema.validate(formData, { abortEarly: false });
      return {};
    } catch (err) {
      if (err instanceof ValidationError) {
        const errors: Record<string, string> = {};
        err.inner.forEach((e) => {
          if (e.path && !errors[e.path]) {
            errors[e.path] = e.errors[0];
          }
        });
        return errors;
      }
      return { _form: "Validation failed unexpectedly" };
    }
  },
};

// Usage
<Bunny config={{ validationAdapter: yupAdapter, ... }} />
```

### 4. Real-time (per-keystroke) validation

The adapter pattern is also compatible with real-time validation. You can connect it to an `onChange` handler in your form fields:

```tsx
// In a custom field component
function MyField({
  field,
  value,
  onChange,
  error,
  formData,
}: BunnyFieldRendererProps) {
  const handleChange = (newValue: string) => {
    onChange(field.name, newValue);

    // Optionally validate on change if you have access to the adapter
    // (you'd get it from BunnyContext or pass it as a prop)
  };

  return (
    <div>
      <input value={value as string} onChange={handleChange} />
      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
}
```

> **Tip**: For full real-time validation, consider passing the adapter down through context or running it inside `BunnyForm`'s change handler.

---

## File Structure

```
src/modules/bunny/
├── src/
│   ├── Bunny.Interface.ts       ← BunnyValidationAdapter interface here
│   ├── Bunny.tsx                ← handlePrimaryAction uses adapter
│   └── validator/
│       └── bunny-validator.utils.ts  ← built-in rules (unchanged fallback)
└── adapters/
    ├── BunnyZodAdapter.ts       ← useBunnyZodAdapter() helper
    └── docs/
        └── validation-adapter.md    ← this file
```

---

## FAQ

**Q: Can I use both the adapter and built-in rules together?**

The adapter takes **precedence**. When `validationAdapter` is set, `handlePrimaryAction` calls the adapter and skips the built-in rules. This keeps the logic simple and predictable.

If you need hybrid behavior, write a **composite adapter**:

```ts
import { validateBunnyForm } from "@/modules/bunny/src/validator/bunny-validator.utils";

function compositeAdapter<TForm>(
  zodSchema: z.ZodSchema<TForm>,
  fields: BunnyFormField<TForm>[],
): BunnyValidationAdapter<TForm> {
  return {
    validate: (formData) => {
      // 1. Run Zod first
      const zodResult = zodSchema.safeParse(formData);
      if (!zodResult.success) {
        const errors: Record<string, string> = {};
        for (const issue of zodResult.error.issues) {
          const path = issue.path.join(".");
          if (!errors[path]) errors[path] = issue.message;
        }
        return errors;
      }
      // 2. Fallback to built-in rules
      return validateBunnyForm(fields, formData);
    },
  };
}
```

**Q: Does the adapter support async validation?**

The current `BunnyValidationAdapter.validate` is synchronous. If you need async (e.g., server-side checks), extend the interface in your project:

```ts
interface AsyncBunnyValidationAdapter<TForm> {
  validate: (formData: TForm) => Promise<Record<string, string>>;
}
```

Then update `handlePrimaryAction` to `await` the result. This can be added as a future enhancement without breaking changes.

**Q: What about `ZodEffects` / `.pipe()` / refinements?**

Zod v4 handles all effects and refinements natively. Just include them in your schema — `safeParse` will return all issues, including those from `.refine()`, `.superRefine()`, `.pipe()`, etc., and the adapter flattens them into field-level errors.
