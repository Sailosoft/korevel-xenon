# TEMPLATE.md — Bunny Feature Scaffold

This template defines the **YAML contract** for generating a new Bunny feature module.  
When attached to a new feature request, the generation tooling reads the YAML and scaffolds the full set of TypeScript files — entity, module, repository, component, and optional AI enhancement files.

---

## YAML Schema

| Field         | Type       | Required | Description                                                               |
| ------------- | ---------- | -------- | ------------------------------------------------------------------------- |
| `title`       | `string`   | ✅       | Human-readable feature name (singular) — e.g. "Author", "Book", "Product" |
| `description` | `string`   | ✅       | What the feature does                                                     |
| `workflow`    | `array`    | ✅       | Ordered implementation steps                                              |
| `components`  | `string[]` | ❌       | Bunny components to include (default: `["Bunny", "BunnyForm"]`)           |
| `entity`      | `object`   | ✅       | Entity model definition                                                   |
| `module`      | `object`   | ✅       | Module / BunnyConfig configuration                                        |
| `repository`  | `object`   | ✅       | Repository + data layer config                                            |
| `ai`          | `object`   | ❌       | Optional AI enhancement configuration                                     |

---

## YAML Template

```yaml
# ============================================================
# Feature:  {{FeatureName}}   ← e.g. "Product", "Category", "Tag"
# Domain:   {{Domain}}        ← e.g. "bunny-ai", "admin-panel"
# ============================================================
title: "{{FeatureName}}" # e.g. "Product"
description: "{{Description}}" # e.g. "Manage product catalog entries"
workflow:
  - step: "Define entity interface"
    action: "Create TypeScript interfaces for the {{FeatureName}} data model"
  - step: "Create Dexie table registration"
    action: "Add {{TableName}} table to BUIDatabase class"
  - step: "Implement repository"
    action: "Create repository class extending BUIRepositoryAdminPanel<{{EntityName}}>"
  - step: "Configure module"
    action: "Create BunnyConfig with columns, form fields, query, and mutation"
  - step: "Build component"
    action: "Create React component wrapping <Bunny> with <BunnyForm>"
  - step: "Register in container (if DI needed)"
    action: "Wire up to bui.container.ts"

# ── Component Configuration ──
components:
  - Bunny
  - BunnyForm

# ── Entity / Data Model ──
entity:
  name: "{{EntityName}}" # e.g. "BUIProduct"
  fileName: "bui.{{featureName}}.entity" # e.g. "bui.product.entity"
  tableName: "{{tableName}}" # e.g. "products"
  tableKey: "++id, name" # Dexie index schema
  properties:
    - name: "id"
      type: "number"
      optional: true
      primaryKey: true
      description: "Auto-generated primary key"
    - name: "name"
      type: "string"
      description: "Name of the {{FeatureName}}"
    - name: "description"
      type: "string"
      optional: true
      description: "Description for the {{FeatureName}}"

# ── Module / BunnyConfig ──
module:
  fileName: "bui.{{featureName}}.module" # e.g. "bui.product.module"
  variableName: "bui{{PascalFeature}}Module" # e.g. "buiProductModule"
  title: "{{FeatureName}}" # Display title (singular)
  titlePlural: "{{FeatureNamePlural}}" # Display title (plural) — e.g. "Products"
  rowKey: "id" # Primary key field
  onFormSuccess:
    mode: "closeOnly" # openView | closeOnly | redirect
  columns:
    - field: "id"
      header: "Id"
      sortable: true
      isRowHeader: true
    - field: "name"
      header: "Name"
      sortable: true
  formConfig:
    fields:
      - name: "name"
        label: "Name"
        type: "text"
        rules:
          - rule: "required"
            message: "Name is required"
  defaultHeaderActions: true
  defaultRowActions: true

# ── Repository & Data Layer ──
repository:
  fileName: "bui.{{featureName}}.repository" # e.g. "bui.product.repository"
  className: "BUI{{PascalFeature}}Repository" # e.g. "BUIProductRepository"
  extends: "BUIRepositoryAdminPanel" # Base repository class
  table: "buiDatabase.{{tableName}}" # e.g. "buiDatabase.products"

# ── AI Enhancement (Optional) ──
ai:
  enabled: false # Set true to generate prompt + server files
  enhance:
    title: "Enhance {{FeatureName}} with AI"
    actionId: "enhance"
    fields:
      - name: "promptType"
        label: "AI Tone Style"
        type: "select"
        defaultValue: "professional"
        options:
          - label: "Professional"
            value: "professional"
          - label: "Creative"
            value: "creative"
  prompt:
    fileName: "bui.{{featureName}}.prompt"
    variableName: "bui{{PascalFeature}}Prompt"
    types:
      - name: "professional"
        systemPrompt: |
          You are an expert assistant specializing in {{FeatureName}}.
        userPrompt: "{{FeatureName}} Name: {{name}} \n Description: {{description}}"
  serverEnhance:
    fileName: "bui.{{featureName}}.server.enhance"
    functionName: "bui{{PascalFeature}}ServerEnhanceWithParams"
    schemaName: "{{featureName}}_enhancement"
```

---

## Placeholder Reference

When filling in the YAML, replace these placeholders:

| Placeholder             | Example Value                    | Description                         |
| ----------------------- | -------------------------------- | ----------------------------------- |
| `{{FeatureName}}`       | `Product`                        | Feature name (PascalCase, singular) |
| `{{FeatureNamePlural}}` | `Products`                       | Feature name plural                 |
| `{{featureName}}`       | `product`                        | Feature name (camelCase, lowercase) |
| `{{PascalFeature}}`     | `Product`                        | Feature name (PascalCase)           |
| `{{EntityName}}`        | `BUIProduct`                     | TypeScript entity interface name    |
| `{{TableName}}`         | `products`                       | Dexie table name                    |
| `{{tableName}}`         | `products`                       | Dexie table name (lowercase)        |
| `{{Description}}`       | `Manage product catalog entries` | Brief feature description           |
| `{{Domain}}`            | `bunny-ai`                       | Module domain folder                |

---

## Generated Files

When the YAML is processed, up to **6 files** are scaffolded into `src/modules/bunny-ai/src/modules/{{featureName}}/`:

| #   | File                                    | Purpose                                                                                                                        | Always?                  |
| --- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------ |
| 1   | `bui.{{featureName}}.entity.ts`         | TypeScript interfaces for the data model                                                                                       | ✅ Yes                   |
| 2   | `bui.{{featureName}}.module.ts`         | [`BunnyConfig`](src/modules/bunny/src/Bunny.Interface.ts:58) configuration                                                     | ✅ Yes                   |
| 3   | `bui.{{featureName}}.repository.ts`     | Repository class extending [`BUIRepositoryAdminPanel`](src/modules/bunny-ai/src/database/bui.repository.admin-panel.ts)        | ✅ Yes                   |
| 4   | `bui.{{featureName}}.component.tsx`     | React component using [`<Bunny>`](src/modules/bunny/src/Bunny.tsx) + [`<BunnyForm>`](src/modules/bunny/src/form/BunnyForm.tsx) | ✅ Yes                   |
| 5   | `bui.{{featureName}}.prompt.ts`         | AI prompt templates for server-side enhancement                                                                                | ❌ If `ai.enabled: true` |
| 6   | `bui.{{featureName}}.server.enhance.ts` | Server action calling AI with structured output                                                                                | ❌ If `ai.enabled: true` |

Additionally, the following **existing files** must be updated:

| File                                                                                       | Change                                                    |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| [`bui.database.ts`](src/modules/bunny-ai/src/database/bui.database.ts)                     | Register new Dexie table with index schema (bump version) |
| [`bui.container.ts`](src/modules/bunny-ai/src/container/bui.container.ts) _(if DI needed)_ | Register new services                                     |

---

## File Templates

### 1️⃣ Entity — `bui.{{featureName}}.entity.ts`

```typescript
export interface BUI{{PascalFeature}} {
  id?: number;
  name: string;
  description?: string;
  // Add more fields as needed
}

/** Optional: Prompt type enum if AI enhancement is enabled */
export type BUI{{PascalFeature}}PromptType =
  | "professional"
  | "creative"
  | "short"
  | "custom";
```

### 2️⃣ Repository — `bui.{{featureName}}.repository.ts`

Extends [`BUIRepositoryAdminPanel<T>`](src/modules/bunny-ai/src/database/bui.repository.admin-panel.ts) which implements [`IBUIRepositoryAdminPanel<T>`](src/modules/bunny-ai/src/database/bui.repository.interface.ts:14):

```typescript
import { buiDatabase } from "../../database/bui.database";
import BUIRepositoryAdminPanel from "../../database/bui.repository.admin-panel";
import { BUI{{PascalFeature}} } from "./bui.{{featureName}}.entity";

export default class BUI{{PascalFeature}}Repository extends BUIRepositoryAdminPanel<BUI{{PascalFeature}}> {
  constructor() {
    super(buiDatabase.{{tableName}});
  }
}
```

### 3️⃣ Module — `bui.{{featureName}}.module.ts`

Uses the [`BunnyConfig<TRow, TForm>`](src/modules/bunny/src/Bunny.Interface.ts:58) interface. Can be written as a **static object** or via the [`BunnyFeature.create()`](src/modules/bunny/src/feature/Bunny-Feature.ts:32) builder pattern.

**Option A — Static object (simpler):**

```typescript
import { BunnyConfig } from "@/src/modules/bunny/src/Bunny.Interface";
import { BUI{{PascalFeature}} } from "./bui.{{featureName}}.entity";
import { buiDatabase } from "../../database/bui.database";
import { adminPanelQueryResponseAll } from "../../../../admin-panel/features/query/admin-panel-query.util";
import {
  AdminPanelResult,
  adminPanelResultSuccess,
} from "@/src/modules/admin-panel/shared/admin-panel-result";

const repository = new BUI{{PascalFeature}}Repository();

export const bui{{PascalFeature}}Module: BunnyConfig<BUI{{PascalFeature}}, BUI{{PascalFeature}}> = {
  title: "{{FeatureName}}",
  titlePlural: "{{FeatureNamePlural}}",
  rowKey: "id",
  onFormSuccess: { mode: "closeOnly" },
  columns: [
    { field: "id", header: "Id", sortable: true, isRowHeader: true },
    { field: "name", header: "Name", sortable: true },
  ],
  formConfig: {
    fields: [
      {
        name: "name",
        label: "Name",
        type: "text",
        rules: [{ rule: "required", message: "Name is required" }],
      },
    ],
  },
  defaultHeaderActions: true,
  defaultRowActions: true,
  query: {
    getAll: (options, overrideOptions) =>
      repository.panelGetAll(options, overrideOptions),
    getOne: (id) => repository.panelGetOne(id),
  },
  mutation: {
    create: (data) => repository.panelCreate(data),
    update: (id, data) => repository.panelUpdate(id, data),
    delete: (id) => repository.panelDelete(id),
  },
};
```

**Option B — Using [`BunnyFeature.create()`](src/modules/bunny/src/feature/Bunny-Feature.ts:32) builder pattern (recommended for complex features):**

```typescript
import { BunnyFeature } from "@/src/modules/bunny/src/feature/Bunny-Feature";
import { BUI{{PascalFeature}} } from "./bui.{{featureName}}.entity";
import BUI{{PascalFeature}}Repository from "./bui.{{featureName}}.repository";

const repository = new BUI{{PascalFeature}}Repository();

export const bui{{PascalFeature}}Module = BunnyFeature.create<BUI{{PascalFeature}}, BUI{{PascalFeature}}>(
  "{{FeatureName}}",
  "id",
  (feature) => {
    feature.configureDataLayer((dataLayer) => {
      dataLayer.useRepository(repository);
    });

    feature.configureTable((table) => {
      table.addColumns([
        { field: "id", header: "Id", sortable: true, isRowHeader: true },
        { field: "name", header: "Name", sortable: true },
      ]);
    });

    feature.configureForm((form) => {
      form.setOnSuccess({ mode: "closeOnly" });
    });
  },
);
```

### 4️⃣ Component — `bui.{{featureName}}.component.tsx`

```typescript
"use client";

import Bunny from "@/src/modules/bunny/src/Bunny";
import BunnyForm from "@/src/modules/bunny/src/form/BunnyForm";
import { bui{{PascalFeature}}Module } from "./bui.{{featureName}}.module";

export default function BUI{{PascalFeature}}Component() {
  return (
    <Bunny config={bui{{PascalFeature}}Module}>
      <BunnyForm />
    </Bunny>
  );
}
```

### 5️⃣ Prompt Template — `bui.{{featureName}}.prompt.ts` _(optional, only if `ai.enabled: true`)_

```typescript
import { BUI{{PascalFeature}}PromptType } from "./bui.{{featureName}}.entity";

interface BUI{{PascalFeature}}Prompt {
  systemPrompt: string;
  userPrompt: string;
}

type BUI{{PascalFeature}}PromptGroup = {
  [key in BUI{{PascalFeature}}PromptType]: BUI{{PascalFeature}}Prompt;
};

export const bui{{PascalFeature}}Prompt: { enhance: BUI{{PascalFeature}}PromptGroup } = {
  enhance: {
    professional: {
      systemPrompt: `You are an expert assistant specializing in {{FeatureName}}.`,
      userPrompt: "Name: {{name}} \n Description: {{description}}",
    },
    creative: {
      systemPrompt: `You are a creative copywriter for {{FeatureName}} content.`,
      userPrompt: "Name: {{name}} \n Description: {{description}}",
    },
  },
};
```

### 6️⃣ Server Enhance — `bui.{{featureName}}.server.enhance.ts` _(optional, only if `ai.enabled: true`)_

```typescript
"use server";

import Handlebars from "handlebars";
import { buiContainer } from "../../container/bui.container";
import { bui{{PascalFeature}}Prompt } from "./bui.{{featureName}}.prompt";
import { BUI{{PascalFeature}}PromptType } from "./bui.{{featureName}}.entity";

export async function bui{{PascalFeature}}ServerEnhanceWithParams(
  name: string,
  description: string,
  promptType: BUI{{PascalFeature}}PromptType = "professional",
) {
  const container = buiContainer.createScope();
  const ai = container.resolve("ai");

  const schema = {
    name: "{{featureName}}_enhancement",
    properties: {
      name: { type: "string" },
      description: { type: "string" },
    },
  };

  const selectedPrompt = bui{{PascalFeature}}Prompt.enhance[promptType];
  const template = Handlebars.compile(selectedPrompt.userPrompt);

  return await ai.doChatStructuredFallback({
    system: selectedPrompt.systemPrompt,
    user: template({ name, description }),
    schema,
  });
}
```

---

## Repository Interface Contract

Every repository extends [`BUIRepositoryAdminPanel<T>`](src/modules/bunny-ai/src/database/bui.repository.admin-panel.ts) which implements [`IBUIRepositoryAdminPanel<T>`](src/modules/bunny-ai/src/database/bui.repository.interface.ts:14):

```typescript
export interface IBUIRepositoryAdminPanel<T> {
  panelGetOne(id: AdminPanelId): Promise<T>;
  panelGetAll(
    options: AdminPanelQueryOptions,
    overrideOptions?: AdminPanelQueryOptions,
  ): Promise<GetAllResponse<T>>;
  panelCreate(data: T): Promise<AdminPanelResult<T, unknown>>;
  panelUpdate(id: AdminPanelId, data: T): Promise<AdminPanelResult<T, unknown>>;
  panelDelete(id: AdminPanelId): Promise<AdminPanelResult<T, unknown>>;
}
```

The base class [`BUIRepository<T>`](src/modules/bunny-ai/src/database/bui.repository.ts) (inherited by `BUIRepositoryAdminPanel`) wraps a Dexie [`Table<T>`](https://dexie.org/docs/Table/Table) and provides:

| Method             | Description                                       |
| ------------------ | ------------------------------------------------- |
| `getList(options)` | Returns all records as `BuiRepositoryResult<T[]>` |
| `get(id)`          | Returns a single record by `AdminPanelId`         |
| `create(data)`     | Adds a record, returns the created entity         |
| `update(id, data)` | Merges partial data into an existing record       |
| `delete(id)`       | Removes a record by ID                            |

---

## Database Registration

When adding a new feature, the entity table must be registered in [`BUIDatabase`](src/modules/bunny-ai/src/database/bui.database.ts):

```typescript
import { BUI{{PascalFeature}} } from "../modules/{{featureName}}/bui.{{featureName}}.entity";

export class BUIDatabase extends Dexie {
  // ...existing tables...
  {{tableName}}!: Dexie.Table<BUI{{PascalFeature}}, number>;

  constructor(databaseName: string) {
    super(databaseName);

    // ...existing versions...

    // NEW: bump version and add table
    this.version({{NextVersion}}).stores({
      {{tableName}}: "{{tableKey}}",
    });
  }
}
```

---

## How to Use

1. **Copy** the YAML template from this file into a new file named `feature.yaml`.
2. **Replace** all `{{Placeholders}}` with your actual feature values using the [placeholder reference](#placeholder-reference).
3. **Customize** the `entity.properties`, `module.columns`, and `module.formConfig.fields` as needed.
4. **Remove** the `ai` block entirely if AI enhancement is not needed (the 4 core files will still be generated).
5. **Feed** the `feature.yaml` to the generation tooling, which will:
   - Create the directory `src/modules/bunny-ai/src/modules/{{featureName}}/`
   - Scaffold all files with placeholders resolved
   - Register the Dexie table in [`bui.database.ts`](src/modules/bunny-ai/src/database/bui.database.ts)
   - Wire the repository and module automatically

---

## Quick Reference — What You Always Need to Fill

| Section                    | Minimum Required                                             |
| -------------------------- | ------------------------------------------------------------ |
| `title`                    | The name of your feature (e.g. "Product", "Category", "Tag") |
| `description`              | One-sentence feature description                             |
| `entity.name`              | The TypeScript interface name (e.g. `BUIProduct`)            |
| `entity.tableName`         | The Dexie table name (e.g. `products`)                       |
| `entity.tableKey`          | Dexie index schema (e.g. `++id, name`)                       |
| `entity.properties`        | At minimum: `id` and `name`                                  |
| `module.columns`           | At minimum: `id` and `name` columns                          |
| `module.formConfig.fields` | At minimum: `name` field                                     |
| `repository.table`         | Must match `buiDatabase.{{tableName}}`                       |

---

## Examples of Generated Features

| Feature      | Placeholder Set                                     | Entity                                                                           | Module Variable                                                                         | Repository                                                                                      |
| ------------ | --------------------------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **Authors**  | `{{FeatureName}}=Author`, `{{tableName}}=authors`   | [`BUIAuthor`](src/modules/bunny-ai/src/modules/authors/bui.author.entity.ts)     | [`buiAuthorModule`](src/modules/bunny-ai/src/modules/authors/bui.author.module.ts)      | [`BUIAuthorRepository`](src/modules/bunny-ai/src/modules/authors/bui.author.repository.ts)      |
| **Books**    | `{{FeatureName}}=Book`, `{{tableName}}=books`       | [`BUIBookEntity`](src/modules/bunny-ai/src/modules/books/bui.book.entity.ts)     | [`buiBookModule`](src/modules/bunny-ai/src/modules/books/bui.book.module.ts)            | [`BUIBookRepository`](src/modules/bunny-ai/src/modules/books/bui.book.repository.ts)            |
| **Settings** | `{{FeatureName}}=Setting`, `{{tableName}}=settings` | [`BUISetting`](src/modules/bunny-ai/src/modules/settings/bui.settings.entity.ts) | [`buiSettingsModule`](src/modules/bunny-ai/src/modules/settings/bui.settings.module.ts) | [`BUISettingsRepository`](src/modules/bunny-ai/src/modules/settings/bui.settings.repository.ts) |
