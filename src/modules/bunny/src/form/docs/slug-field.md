# Slug Field

The **`"slug"`** field type automatically generates a URL-safe slug from a watched source field. It updates in real-time as the user types in the source field, with zero extra wiring.

---

## Configuration

The `slug` property on [`BunnyFormField`](../BunnyForm.Interface.ts:87) accepts the following options:

| Option        | Type                        | Required | Default                                 | Description                                        |
| ------------- | --------------------------- | -------- | --------------------------------------- | -------------------------------------------------- |
| `sourceField` | `string`                    | ✅ Yes   | —                                       | Name of the field to watch for generating the slug |
| `prefix`      | `string`                    | ❌ No    | `""`                                    | String prepended to the generated slug             |
| `suffix`      | `string`                    | ❌ No    | `""`                                    | String appended to the generated slug              |
| `transform`   | `(value: string) => string` | ❌ No    | [Default transform](#default-transform) | Custom transformation function                     |

### Default Transform

The built-in slug generation pipeline:

```
1. .toLowerCase()        → "Hello World"  → "hello world"
2. .trim()               → "  hello "     → "hello"
3. Strip [^a-z0-9\s-]   → "hello! world"  → "hello world"
4. Replace [\s_]+ with - → "hello world"   → "hello-world"
5. Collapse multiple -   → "hello---world" → "hello-world"
6. Strip leading/trailing hyphens
```

### TypeScript Interface

```ts
interface BunnyFormField {
  type: "slug";
  slug?: {
    sourceField: string;
    prefix?: string;
    suffix?: string;
    transform?: (value: string) => string;
  };
}
```

---

## Use Cases

### 1. Basic URL Slug from Title

```tsx
import { BunnyFormConfig } from "@/modules/bunny/src/form/BunnyForm.Interface";

interface PageFormData {
  title: string;
  slug: string;
}

export const pageFormConfig: BunnyFormConfig<PageFormData> = {
  gridCols: 1,
  fields: [
    { name: "title", label: "Title", type: "text", required: true },
    {
      name: "slug",
      label: "URL Slug",
      type: "slug",
      slug: { sourceField: "title" },
    },
  ],
};
```

As the user types in the **Title** field, the **URL Slug** field auto-populates:

| Title Input           | Generated Slug       |
| --------------------- | -------------------- |
| `Hello World`         | `hello-world`        |
| `My First Blog Post!` | `my-first-blog-post` |
| `什么是slug`          | `slug`               |

> Non-ASCII characters are stripped by the default transform. If you need Unicode support, provide a custom `transform`.

---

### 2. Unique Code Generator (Prefix)

Generate product codes or reference numbers from a name field:

```tsx
{
  name: "productCode",
  label: "Product Code",
  type: "slug",
  slug: {
    sourceField: "name",
    prefix: "PRD-",
  },
}
```

| Name Input       | Generated Code       |
| ---------------- | -------------------- |
| `Wireless Mouse` | `PRD-wireless-mouse` |
| `USB-C Hub`      | `PRD-usb-c-hub`      |

---

### 3. SEO-Friendly File Path (Prefix + Suffix)

```tsx
{
  name: "filePath",
  label: "File Path",
  type: "slug",
  slug: {
    sourceField: "articleTitle",
    prefix: "/blog/",
    suffix: ".html",
  },
}
```

| Article Title     | Generated Path               |
| ----------------- | ---------------------------- |
| `Getting Started` | `/blog/getting-started.html` |
| `Advanced Guide`  | `/blog/advanced-guide.html`  |

---

### 4. Custom Transform (UpperCase + Underscores)

```tsx
{
  name: "envKey",
  label: "Environment Variable",
  type: "slug",
  slug: {
    sourceField: "name",
    transform: (value: string) =>
      value
        .trim()
        .replace(/[^a-zA-Z0-9\s_]/g, "")
        .replace(/\s+/g, "_")
        .toUpperCase(),
  },
}
```

| Name Input       | Generated Key    |
| ---------------- | ---------------- |
| `Database URL`   | `DATABASE_URL`   |
| `API Secret Key` | `API_SECRET_KEY` |

---

## Usage with `BunnyFeature`

When building modules with [`BunnyFeature`](../../feature/Bunny-Feature.ts:69), the slug field is configured inside `configureForm` → `addFields`:

```tsx
import { BunnyFeature } from "@/src/modules/bunny/src/feature/Bunny-Feature";

const ProductsConfig = BunnyFeature.create("Product", "id", (f) => {
  f.configureTable((t) =>
    t.addColumns([
      { field: "name", header: "Name" },
      { field: "slug", header: "Slug" },
    ]),
  );

  f.configureForm((form) =>
    form.addFields([
      { name: "name", label: "Name", type: "text", required: true },
      {
        name: "slug",
        label: "URL Slug",
        type: "slug",
        slug: { sourceField: "name" },
      },
    ]),
  );
});
```

---

## How It Works

1. The slug field renders as a standard text `Input` inside [`BunnyFormBuilder`](../builder/BunnyFormBuilder.tsx)
2. A `useEffect` watches the `sourceField` value in `formData`
3. When the source value changes, the slug is computed and forwarded to `onChange`
4. The field is **editable** — users can override the auto-generated value if needed
5. The `useEffect` reactivates whenever the source field's value changes again, regenerating the slug

> **Performance note**: The internal `FieldRenderer` is wrapped with `React.memo`, so only the slug field re-renders when its source field changes. Other fields are unaffected.

---

## TypeScript Tips

Import types directly from the interface module:

```ts
import type {
  BunnyFormConfig,
  BunnyFormField,
} from "@/modules/bunny/src/form/BunnyForm.Interface";
```

To strongly type the slug field in a form data interface:

```ts
interface ProductFormData {
  name: string;
  slug: string; // Auto-generated via slug field
}
```

---

## Summary

| Goal                    | Configuration                                                      |
| ----------------------- | ------------------------------------------------------------------ |
| Basic URL slug          | `type: "slug"` + `slug: { sourceField: "title" }`                  |
| Prefixed code generator | Add `prefix: "PRD-"`                                               |
| Suffixed path           | Add `suffix: ".html"`                                              |
| Custom transformation   | Add `transform: (v) => ...`                                        |
| Use with `BunnyFeature` | `form.addFields([{ type: "slug", slug: { sourceField: "..." } }])` |
