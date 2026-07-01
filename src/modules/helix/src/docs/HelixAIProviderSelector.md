# HelixAIProviderSelector

A generic, database-agnostic React component for selecting AI providers and models in Helix.

## Overview

The `HelixAIProviderSelector` component provides a UI for selecting an AI provider (e.g., OpenAI, DeepSeek, Groq) and a model from that provider. It persists settings to any Dexie database via a generic table interface, making it adaptable to any module's database schema.

## Interface

### HelixAISettings

The settings shape stored in Dexie:

```typescript
interface HelixAISettings {
  /** The selected AI provider key */
  provider: HelixAIProvider;
  /** The selected model identifier for that provider */
  model: string;
}
```

### HelixAIProviderSelectorProps

```typescript
interface HelixAIProviderSelectorProps<T extends Table<HelixAISettings>> {
  /** The Dexie table to read/write settings. Must have HelixAISettings schema. */
  table: T;
  /** Primary key value used to lookup/update settings (default: "default") */
  settingsKey?: string;
  /** CSS override for wrapper div */
  className?: string;
}
```

## Setup

### 1. Define Your Dexie Table

In your Dexie database class, add a table for `HelixAISettings`:

```typescript
// your-database.ts
import Dexie from "dexie";
import { HelixAISettings, HelixAIProvider } from "helix";

export class YourDatabase extends Dexie {
  aiSettings!: Table<HelixAISettings, string>; // <value_type, primary_key_type>

  constructor() {
    super("YourDatabase");
    this.version(1).stores({
      aiSettings: "key, provider, model",
    });
  }
}
```

### 2. Use the Component

```tsx
// your-settings-page.tsx
import { HelixAIProviderSelector } from "@/modules/helix";
import { YourDatabase } from "./your-database";

const db = new YourDatabase();

export function YourSettingsPage() {
  return (
    <div>
      <h1>AI Settings</h1>
      <HelixAIProviderSelector table={db.aiSettings} />
    </div>
  );
}
```

## Multiple Settings Keys

If you need multiple independent settings (e.g., per-user or per-project):

```tsx
<HelixAIProviderSelector table={db.aiSettings} settingsKey="user-123" />
<HelixAIProviderSelector table={db.aiSettings} settingsKey="project-456" />
```

## Reading the Settings

```typescript
import { db } from "./your-database";

// Get single setting
const settings = await db.aiSettings.get("default");

// Watch for changes reactively
import { useLiveQuery } from "dexie-react-hooks";

function MyComponent() {
  const settings = useLiveQuery(
    () => db.aiSettings.get("default")
  );

  if (!settings) return <div>Loading...</div>;

  return (
    <div>
      Provider: {settings.provider}
      Model: {settings.model}
    </div>
  );
}
```

## Custom Classes

```tsx
<HelixAIProviderSelector 
  table={db.aiSettings} 
  className="max-w-md mx-auto p-4 bg-card rounded-lg"
/>
```

## Supported Providers

The component supports all Helix providers:

| Provider | Description |
|----------|-------------|
| `ollamaLocal` | Ollama running locally |
| `ollamaCloud` | Ollama Cloud |
| `deepseek` | DeepSeek |
| `groq` | Groq |
| `openai` | OpenAI |
| `openRouter` | OpenRouter |
| `requesty` | Requesty |
| `deepinfra` | DeepInfra |
| `googleAIStudio` | Google AI Studio |

## TypeScript Support

The component is fully typed and uses TypeScript generics to ensure type safety:

```typescript
import type { Table } from "dexie";
import type { HelixAISettings } from "@/modules/helix";

// T is constrained to Table<HelixAISettings>
function MyFunction<T extends Table<HelixAISettings>>(table: T) {
  return <HelixAIProviderSelector table={table} />;
}
```

## Behavior

- **Model filtering**: The model dropdown only shows models available for the selected provider
- **Auto-selection**: When you change the provider, the model automatically resets to the first available model for that provider
- **Live updates**: Uses Dexie's `useLiveQuery` for reactive updates across the app
- **Persistence**: All changes are immediately saved to the Dexie table via `put()`

## Troubleshooting

### Provider not appearing in dropdown

The `"default"` meta-provider is excluded from the UI. Use a specific provider like `"openai"` or `"deepseek"`.

### Empty model dropdown

This is expected when no provider is selected yet. Select a provider first.

### Settings not persisting

Ensure your Dexie table is properly defined with the correct schema:

```typescript
table: Table<HelixAISettings, string>
//                        ^^^^^^^^^ primary key type
```

---

## Companion Hooks

The `useHelixAISettings` hook provides programmatic access to the same settings that `HelixAIProviderSelector` manages. Use it when you need to read or update settings without the UI.

### useHelixAISettings

```typescript
function useHelixAISettings<T extends Table<HelixAISettings>>({
  table,
  key = "default",
}): {
  settings: HelixAISettings | undefined;
  isLoading: boolean;
  setProvider: (provider: HelixAIProvider) => Promise<void>;
  setModel: (model: string) => Promise<void>;
  setSettings: (settings: HelixAISettings) => Promise<void>;
  reset: () => Promise<void>;
}
```

**Example:**

```tsx
import { useHelixAISettings } from "@/modules/helix";
import { HELIX_PROVIDER_LABELS } from "@/modules/helix/src/HelixConfig";

function MyComponent() {
  const { settings, setProvider, isLoading } = useHelixAISettings({
    table: db.aiSettings,
    key: "default",
  });

  if (isLoading) return <Spinner />;
  if (!settings) return <div>No settings found</div>;

  return (
    <div>
      <p>Provider: {HELIX_PROVIDER_LABELS[settings.provider]}</p>
      <p>Model: {settings.model}</p>
      <button onClick={() => setProvider("openai")}>Switch to OpenAI</button>
    </div>
  );
}
```

### useHelixAIOption

A convenience hook that returns just `{ provider, model }` for use with `HelixAIService`.

```typescript
const option = useHelixAIOption({ table: db.aiSettings });
// Returns: { provider: HelixAIProvider, model: string } | undefined

// Use directly with HelixAIService
const response = await helixService.chat({
  ...option,
  messages: [{ role: "user", content: "Hello" }],
});
```

### Programmatic Updates

```tsx
// Set just the provider (automatically clears model)
const { setProvider } = useHelixAISettings({ table: db.aiSettings });
await setProvider("deepseek");

// Set just the model
const { setModel, settings } = useHelixAISettings({ table: db.aiSettings });
if (settings) {
  await setModel("deepseek-chat");
}

// Set both at once
const { setSettings } = useHelixAISettings({ table: db.aiSettings });
await setSettings({ provider: "openai", model: "gpt-4o-mini" });

// Reset to defaults
const { reset } = useHelixAISettings({ table: db.aiSettings });
await reset();
```

### Multiple Settings Keys

```tsx
function UserSettings({ userId }: { userId: string }) {
  const { settings, setSettings } = useHelixAISettings({
    table: db.aiSettings,
    key: `user-${userId}`,
  });

  // Each user has independent settings
  return <HelixAIProviderSelector table={db.aiSettings} settingsKey={`user-${userId}`} />;
}