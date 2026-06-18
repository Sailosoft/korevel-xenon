# Custom & Render Fields

BunnyForm supports two advanced field types — **`"custom"`** and **`"render"`** — that let you build form fields not covered by the built-in set (`text`, `select`, `textarea`, `switch`, `editor`, `code-editor`, etc.).

Both types receive a [`BunnyFieldRendererProps`](#bunnyfieldrendererprops) object giving you full access to the field's current value, change handler, validation error, **and the entire form data snapshot** — making interdependent fields trivial.

---

## Quick Comparison

| Type       | Mechanism                        | Best for                                                                                                          |
| ---------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `"custom"` | A standalone React **component** | Reusable widgets, complex inputs with internal state, or when you want to keep the field logic in a separate file |
| `"render"` | An inline **render function**    | Simple overrides, one-off layouts, or when you need to close over local scope                                     |

---

## `BunnyFieldRendererProps`

Both types receive this props interface (exported from [`BunnyForm.Interface.ts`](../BunnyForm.Interface.ts)):

```ts
interface BunnyFieldRendererProps<TForm = Record<string, unknown>> {
  /** The field definition from the form configuration */
  field: BunnyFormField<TForm>;
  /** Current value of this field */
  value: unknown;
  /** Callback to update the field value — call with (name, value) */
  onChange: (name: string, value: unknown) => void;
  /** Validation error message for this field, if any */
  error?: string;
  /** The entire form data snapshot — useful for interdependent fields */
  formData: TForm;
}
```

> **Why `formData`?**  
> Many real-world forms have fields that depend on each other (e.g. a "Country" select that filters a "State/Province" select). Passing the full `formData` lets you read sibling field values directly inside your custom component or render function.

---

## Using `"custom"` Fields

Set `type: "custom"` and pass a **React component** via the `component` prop.

### Example: Color Picker

```tsx
import {
  BunnyFormConfig,
  BunnyFieldRendererProps,
} from "@/modules/bunny/src/form/BunnyForm.Interface";

// 1. Define the custom component
function ColorPicker({ value, onChange, error }: BunnyFieldRendererProps) {
  return (
    <div>
      <label>Background Color</label>
      <input
        type="color"
        value={typeof value === "string" ? value : "#000000"}
        onChange={(e) => onChange("backgroundColor", e.target.value)}
      />
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}

// 2. Use it in your form config
export const myFormConfig: BunnyFormConfig<MyFormData> = {
  gridCols: 1,
  fields: [
    { name: "title", label: "Title", type: "text", required: true },
    {
      name: "backgroundColor",
      label: "Background Color",
      type: "custom",
      component: ColorPicker,
    },
  ],
};
```

### Example: Interdependent Fields with `formData`

```tsx
import { BunnyFieldRendererProps } from "@/modules/bunny/src/form/BunnyForm.Interface";

function CountryCitySelector({
  value,
  onChange,
  formData,
}: BunnyFieldRendererProps) {
  const country = formData.country as string | undefined;

  const citiesByCountry: Record<string, string[]> = {
    US: ["New York", "Los Angeles", "Chicago"],
    PH: ["Manila", "Cebu", "Davao"],
    SG: ["Singapore"],
  };

  const cities = country ? (citiesByCountry[country] ?? []) : [];

  return (
    <div className="flex flex-col gap-2">
      <label>City</label>
      <select
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange("city", e.target.value)}
        disabled={!country}
      >
        <option value="">
          {country ? "Select a city" : "Select a country first"}
        </option>
        {cities.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </div>
  );
}
```

> The `CountryCitySelector` above reads `formData.country` to dynamically populate city options — no extra wiring needed.

---

## Using `"render"` Fields

Set `type: "render"` and pass a **render function** via the `render` prop. Useful for simple overrides or when you want to close over local variables.

### Example: Inline Rating Widget

```tsx
import { BunnyFormConfig } from "@/modules/bunny/src/form/BunnyForm.Interface";

export const reviewFormConfig: BunnyFormConfig<ReviewData> = {
  gridCols: 1,
  fields: [
    { name: "comment", label: "Comment", type: "textarea" },
    {
      name: "rating",
      label: "Rating",
      type: "render",
      render: ({ value, onChange }) => (
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => onChange("rating", star)}
              className={
                star <= (value as number) ? "text-yellow-400" : "text-gray-300"
              }
            >
              ★
            </button>
          ))}
        </div>
      ),
    },
  ],
};
```

---

## Performance Considerations

1. **`React.memo`**: The internal `FieldRenderer` is wrapped with [`React.memo`](https://react.dev/reference/react/memo), so fields that haven't changed their props (value, error, field definition) will **skip re-rendering** when a sibling field updates. This is especially beneficial for forms with many fields.

2. **Stable component references**: For `"custom"` fields, define your component **outside the render cycle** (as a top-level or `useMemo`-stabilized reference) so that `React.memo`'s shallow comparison works effectively:

   ```tsx
   // ❌ Avoid: creates a new component reference every render
   const formConfig = {
     fields: [{
       type: "custom",
       component: (props) => <MyWidget {...props} />,  // new reference!
     }],
   };

   // ✅ Preferred: define components at module scope
   function MyWidget(props: BunnyFieldRendererProps) { ... }

   const formConfig = {
     fields: [{
       type: "custom",
       component: MyWidget,  // stable reference
     }],
   };
   ```

3. **Render functions**: The `"render"` function is called inline. If the render function is expensive, wrap its output in `useMemo` inside your parent component, or consider extracting it into a standalone component and using `"custom"` instead.

---

## TypeScript Tips

Import the exported types directly from the interface module:

```ts
import type {
  BunnyFormConfig,
  BunnyFormField,
  BunnyFieldRendererProps,
  BunnyCustomFieldComponent,
  BunnyRenderFieldFn,
} from "@/modules/bunny/src/form/BunnyForm.Interface";
```

- **`BunnyFieldRendererProps<TForm>`** — the props object passed to your custom component or render function
- **`BunnyCustomFieldComponent<TForm>`** — a convenience type for `React.ComponentType<BunnyFieldRendererProps<TForm>>`
- **`BunnyRenderFieldFn<TForm>`** — a convenience type for `(props: BunnyFieldRendererProps<TForm>) => React.ReactNode`

---

## Summary

| Goal                                       | Approach                                                               |
| ------------------------------------------ | ---------------------------------------------------------------------- |
| Build a reusable widget with its own state | `type: "custom"` + `component`                                         |
| Inline a simple one-off override           | `type: "render"` + `render`                                            |
| Read sibling field values                  | Use the `formData` prop in `BunnyFieldRendererProps`                   |
| Avoid unnecessary re-renders               | Keep component references stable; `memo` is already applied internally |
