# BunnyPackage — URL-Driven Module Resolution

`BunnyPackage` lets you register feature modules (each backed by a [`BunnyConfig`](../Bunny.Interface.ts:58)) keyed to a URL pattern. When the user navigates to a matching route, the corresponding package — with its full CRUD UI — is activated automatically.

Every `BunnyPackage` gets a **default component** ([`BunnyDefaultComponent`](BunnyDefaultComponent.tsx:16)) that renders `<Bunny config={config}><BunnyForm /></Bunny>` — a complete table + form + modal shell — with **zero boilerplate**.

---

## 🏆 Recommended: Named Registry Pattern

Create a [`BunnyPackageRegistry`](BunnyPackageRegistry.ts:5) instance per app section, register once, and pass it to `<BunnyNextPackage>`.

### 1. Create a feature module

```tsx
// src/modules/books/books.package.ts
import { BunnyPackage } from "@/src/modules/bunny/src/package";
import { BunnyFeature } from "@/src/modules/bunny/src/feature/Bunny-Feature";
import { columns } from "./books.columns";

const BooksConfig = BunnyFeature.create("Books", "id", (f) => {
  f.configureTable((t) => t.addColumns(columns));
});

// BunnyDefaultComponent is used automatically — you get Bunny + BunnyForm
export const booksPackage = new BunnyPackage({
  ...BooksConfig,
  module_url: "/modules/books",
});
```

That's it. No need to pass a component — the default gives you a full CRUD UI with table, header, modal, form, delete, and toast notifications.

### 2. Create a registry in the central barrel

```ts
// src/modules/bunny/src/package/packages.ts
import { BunnyPackageRegistry } from "./BunnyPackageRegistry";
import { booksPackage } from "@/src/modules/books/books.package";
import { authorsPackage } from "@/src/modules/authors/authors.package";

// One registry per app section — add one .register() call per feature:
export const adminRegistry = new BunnyPackageRegistry();
adminRegistry.register(booksPackage, authorsPackage);
// When adding a feature → add one line above ↑

// You can have multiple registries for different sections:
// export const publicRegistry = new BunnyPackageRegistry();
```

### 3. Wire into your layout

```tsx
// src/app/admin/layout.tsx
"use client";

import { BunnyNextPackage } from "@/src/modules/bunny/src/package";
import { adminRegistry } from "@/src/modules/bunny/src/package/packages";

export default function AdminLayout({ children }) {
  return (
    <BunnyNextPackage
      registry={adminRegistry}
      fallback={<div>Select a module</div>}
    >
      {children}
    </BunnyNextPackage>
  );
}
```

**When you add a new feature, you touch one file — `packages.ts` — and add one `.register()` call.** No layout changes. No growing arrays.

---

## 🎨 Custom Components

To override the default, pass an explicit `Component` as the second argument:

```tsx
import Bunny from "@/src/modules/bunny/src/Bunny";
import { BunnyDefaultComponent } from "@/src/modules/bunny/src/package";

// Custom rendering
export const booksPackage = new BunnyPackage(
  { ...BooksConfig, module_url: "/modules/books" },
  ({ config, children }) => <Bunny config={config}>{children}</Bunny>,
);

// Or explicitly use the default (same as omitting Component)
export const samePackage = new BunnyPackage(BooksConfig, BunnyDefaultComponent);
```

---

## 📋 Alternative: Explicit Package Array

```tsx
import { BunnyNextPackage } from "@/src/modules/bunny/src/package";
import { booksPackage } from "@/src/modules/books/books.package";

<BunnyNextPackage packages={[booksPackage]} fallback={<div>…</div>}>
  {children}
</BunnyNextPackage>;
```

---

## 🛠️ Advanced: Direct Hook Usage

```tsx
import {
  BunnyPackageManagerProvider,
  useBunnyPackageManager,
  useBunnyNextInference,
} from "@/src/modules/bunny/src/package";

function MyShell({ children }) {
  const { register } = useBunnyPackageManager();
  const activePkg = useBunnyNextInference();

  useEffect(() => { register(somePackage); }, []);

  return (
    <main>
      {activePkg && (
        <activePkg.Component config={activePkg.config}>
          {children}
        </activePkg.Component>
      )}
    </main>
  );
}

export default function Root({ children }) {
  return (
    <BunnyPackageManagerProvider packages={[...]}>
      <MyShell>{children}</MyShell>
    </BunnyPackageManagerProvider>
  );
}
```

---

## URL Pattern Reference

Set [`module_url`](../Bunny.Interface.ts:60) on your config:

| Pattern             | Example               | Matches                                                           |
| ------------------- | --------------------- | ----------------------------------------------------------------- |
| **Exact**           | `/modules/books`      | `/modules/books` only                                             |
| **Prefix wildcard** | `/modules/books/*`    | `/modules/books`, `/modules/books/123`, `/modules/books/123/edit` |
| **Regex**           | `/^\/modules\/books/` | Any path starting with `/modules/books`                           |

---

## Lazy Loading (recommended)

Use `dynamic` to split package components into separate chunks:

```tsx
import dynamic from "next/dynamic";

const BooksPage = dynamic(() => import("@/src/modules/books/page"), {
  loading: () => <div className="p-8">Loading books…</div>,
});

export const booksPackage = new BunnyPackage(
  { ...BooksConfig, module_url: "/modules/books" },
  () => <BooksPage />, // ← chunk loaded only when URL matches
);
```

---

## Performance

See [`PERFORMANCE.md`](PERFORMANCE.md) for benchmarks. TL;DR:

- **~2.5 KB** registry infrastructure overhead (tree-shakeable)
- **~25-35 KB** per matched package when using the default `<Bunny>` + `<BunnyForm>`
- **O(1)** registration — 100 packages cost the same as 1
- **< 0.01 ms** URL scan for 200 packages
- **Zero re-renders** on registry mutations
- Provide an explicit lightweight `Component` to skip the default overhead
