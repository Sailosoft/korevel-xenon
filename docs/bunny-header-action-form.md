# BunnyHeaderActionForm — Reusable Form-Based Header Actions

`BunnyHeaderActionForm` is a builder-pattern hook that creates a [`BunnyHeaderAction`](../src/modules/bunny/src/header/BunnyHeader.Interface.ts:36) with an integrated modal form. It replaces the need to write a dedicated component (like [`BUIBookChapterComponentGenerate`](../src/modules/bunny-ai/src/modules/books/bui.book-chapter.component.generate.tsx:27)) by letting you configure form fields, dynamic labels, and chained server actions declaratively.

---

## ✨ Features

1. **Dynamic Button Labels** — Labels can change at runtime based on form data, loading state, or action execution state (e.g., `"Writing chapter 4/10"`).
2. **Action State Management** — Track execution phase (`idle | processing | success | error`), progress messages, and error states.
3. **Long-Running Action Chains** — Execute a series of server actions in a single submit, updating progress mid-flight via `setState`.
4. **Custom Submit Actions** — Full control over what happens when the user clicks submit. Access `BunnyKernel` for table refresh, notifications, routing, etc.
5. **`useBunnyKernel` Integration** — Every submit context includes the full kernel for direct engine control.
6. **`BunnyFormBuilder` Integration** — Fields are rendered using the existing `BunnyFormBuilder`, supporting all standard field types plus the new `"display"` type.
7. **`"display"` Form Field Type** — Information-only fields that react to form data changes and display computed values in card, badge, text, or custom modes.

---

## 🚀 Quick Start

### 1. Basic Usage

```tsx
import { useBunnyHeaderActionForm } from "@/src/modules/bunny";

function MyFeature() {
  const myAction = useBunnyHeaderActionForm((builder) => {
    builder.setLabel("Generate");
    builder.setVariant("primary");
    builder.setIcon(<Rocket className="size-4" />);

    builder.setInitialData({
      templateType: "default",
    });

    builder.setForm([
      {
        name: "templateType",
        label: "Template Style",
        type: "select",
        options: [
          { label: "Default", value: "default" },
          { label: "Creative", value: "creative" },
        ],
      },
    ]);

    builder.data({ total: 10 });

    builder.setButtonLabel(({ state }) => {
      if (state.type === "processing" && state.progress) return state.progress;
      if (state.type === "processing") return "Generating...";
      return "Generate Chapters";
    });

    builder.setSubmitAction(async ({ formData, data, kernel, setState }) => {
      for (let i = 0; i < data.total; i++) {
        setState((prev) => ({
          ...prev,
          progress: `Writing chapter ${i + 1}/${data.total}`,
        }));
        await someServerAction(formData, i);
      }
      kernel.adminPanel.table.refresh();
    });
  });

  return myAction; // use this in your header config
}
```

### 2. Integrate with BunnyFeature

```tsx
const config = BunnyFeature.create("Books", "id", (f) => {
  f.configureHeader((header) => {
    header.addAction(myAction);
  });
});
```

### 3. Direct Config Object

Instead of a builder callback, you can pass a config object directly:

```tsx
const myAction = useBunnyHeaderActionForm({
  id: "generate-chapters",
  label: "Generate",
  variant: "primary",
  icon: <Rocket />,
  initialData: { templateType: "default" },
  formFields: [...],
  initialDataPayload: { total: 10 },
  buttonLabel: ({ state }) => state.progress || "Generate",
  submitAction: async ({ formData, data, kernel, setState }) => {
    // ... your logic
  },
});
```

---

## 📋 Builder API Reference

### `BunnyHeaderActionFormBuilder<TForm, TData>`

| Method | Description |
|--------|-------------|
| `setInitialData(data)` | Pre-populate form fields with default values. |
| `setForm(fields, config?)` | Define form fields (BunnyFormField array) and optional grid/submit config. |
| `data(initialData)` | Provide arbitrary data payload outside of form schema (e.g., counts, IDs). |
| `setButtonLabel(fn)` | Dynamic label resolver `({ formData, loading, state }) => string`. |
| `setSubmitAction(fn)` | Submit handler `({ formData, data, kernel, setState }) => Promise<void>`. |
| `setVariant(variant)` | Header button variant (`"primary"`, `"secondary"`, `"ghost"`, etc.). |
| `setIcon(icon)` | Header button icon (ReactNode). |
| `setLabel(label)` | Header button label text. |
| `setModalTitle(title)` | Modal header title (defaults to action label). |
| `setSubmitLabel(label)` | Custom submit button label inside modal. |
| `setCancelLabel(label)` | Custom cancel button label inside modal. |

### `BunnyHeaderActionFormConfig<TForm, TData>`

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Unique action identifier. |
| `label` | `string` (optional) | Header button label. |
| `icon` | `ReactNode` (optional) | Header button icon. |
| `variant` | `BunnyHeaderVariants` (optional) | Button variant. |
| `initialData` | `Partial<TForm>` (optional) | Default form values. |
| `formFields` | `BunnyFormField<TForm>[]` (optional) | Form field definitions. |
| `formConfig` | `object` (optional) | Grid cols, submit label overrides. |
| `initialDataPayload` | `TData` (optional) | Custom data payload. |
| `buttonLabel` | `fn` (optional) | Dynamic label resolver. |
| `submitAction` | `fn` (optional) | Submit handler with chain support. |
| `modalTitle` | `string` (optional) | Modal title. |
| `submitLabel` | `string` (optional) | Modal submit button label. |
| `cancelLabel` | `string` (optional) | Modal cancel button label. |

### `BunnyHeaderActionFormSubmitContext<TForm, TData>`

| Property | Type | Description |
|----------|------|-------------|
| `formData` | `TForm` | Current form field values. |
| `state` | `BunnyHeaderActionFormState<TData>` | Current action execution state. |
| `kernel` | `BunnyKernel` | Full Bunny kernel (config, adminPanel, router). |
| `setState` | `fn` | Update execution state mid-flight for progress reporting. |

### `BunnyHeaderActionFormState<TData>`

| Property | Type | Description |
|----------|------|-------------|
| `type` | `"idle" \| "processing" \| "success" \| "error"` | Execution phase. |
| `progress` | `string` (optional) | Progress message (e.g., "Chapter 4/10"). |
| `errorMessage` | `string` (optional) | Error message when type is "error". |
| `data` | `TData` | Custom data payload. |

### `BunnyHeaderActionFormButtonContext<TForm, TData>`

| Property | Type | Description |
|----------|------|-------------|
| `formData` | `TForm` | Current form values. |
| `loading` | `boolean` | Whether the action is currently processing. |
| `state` | `BunnyHeaderActionFormState<TData>` | Current action execution state. |

---

## 🎨 "display" Form Field Type

The `"display"` field type renders information-only fields that react to form data changes. It's perfect for computed previews, status indicators, or contextual information within a form.

### Usage

```tsx
builder.setForm([
  {
    name: "summary",
    label: "Summary",
    type: "display",
    display: {
      mode: "card",
      title: (formData) => `Processing ${formData.count} items`,
      subtitle: (formData) =>
        `Template: ${formData.templateType}`,
    },
  },
]);
```

### `BunnyDisplayFieldConfig`

| Property | Type | Description |
|----------|------|-------------|
| `mode` | `"card" \| "badge" \| "text" \| "custom"` | Visual display mode. Defaults to `"card"`. |
| `title` | `string \| ((formData) => string)` | Primary title (static or derived from form data). |
| `subtitle` | `string \| ((formData) => string)` | Secondary description (static or derived from form data). |
| `render` | `fn` (optional) | Custom render function, only used with `mode: "custom"`. |

### Display Modes

| Mode | Rendering |
|------|-----------|
| `"card"` | Styled card with border, background, title + subtitle |
| `"badge"` | Compact inline pill with primary color |
| `"text"` | Plain text with label in uppercase tracking |
| `"custom"` | Delegates to your custom render function |

---

## 🔄 Chained Server Actions Example

```tsx
const syncAction = useBunnyHeaderActionForm((builder) => {
  builder.setLabel("Sync Data");
  builder.setVariant("primary");
  builder.setInitialData({ source: "api-v2" });
  builder.setForm([
    { name: "source", label: "Data Source", type: "select", options: [...] },
  ]);
  builder.data({ synced: 0, total: 50 });

  builder.setButtonLabel(({ state }) => {
    if (state.type === "processing" && state.progress) return state.progress;
    if (state.type === "processing") return "Syncing...";
    return "Start Sync";
  });

  builder.setSubmitAction(async ({ formData, data, kernel, setState }) => {
    for (let i = 0; i < data.total; i++) {
      setState((prev) => ({
        ...prev,
        progress: `Syncing ${i + 1}/${data.total}`,
      }));
      await fetch("/api/sync", {
        method: "POST",
        body: JSON.stringify({ source: formData.source, index: i }),
      });
    }
    kernel.adminPanel.table.refresh();
    kernel.adminPanel.notify.success("Sync completed!");
  });
});
```

---

## 🧩 Type Parameters

- **`TForm`** — Shape of the form data object. Must match the field definitions.
- **`TData`** — Shape of the custom data payload (used with `.data()`). Defaults to `unknown`.

```tsx
interface GenerateForm {
  templateType: string;
  count: number;
}

interface GenerateData {
  total: number;
  current: number;
}

const action = useBunnyHeaderActionForm<GenerateForm, GenerateData>(
  (builder) => {
    builder.data({ total: 10, current: 0 });
    // ...
  },
);
```
