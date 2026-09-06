# bunny-helix — AI-Assisted Record Creation Bridge

`bunny-helix` connects **bunny** (UI logic) and **helix** (AI configuration)
without any direct bunny↔helix dependency. It provides a bunny **header action**
that opens a popup modal with configurable input fields; the AI generates the
remaining record fields (guided by per-field prompts) and then either **prefills
the module's create form** or **creates the record directly** (configurable per
action).

Neither `bunny` nor `helix` is modified — `bunny-helix` is the only module
importing both.

## Wiring example

`createBunnyHelixAction` is a **plain factory** (not a hook), so it can be called
directly in a module file and handed to `configureHeader` — no wrapper
component, state lifting, or `useMemo` required. All React state lives inside
the modal host rendered by the action's `render` prop.

```tsx
import { createBunnyHelixAction } from "@/src/modules/bunny-helix";
import { Sparkles } from "lucide-react";

// Inside your module (e.g. inside BunnyFeature.create configureHeader):
const aiCreate = createBunnyHelixAction<Book, BookForm>({
  id: "ai-create",
  label: "AI Create",
  icon: <Sparkles size={16} />,
  variant: "accent",
  ai: { provider: "openai", model: "gpt-4o-mini" }, // or () => option / async getter
  inputFields: [
    { name: "brief", label: "Describe the record", type: "textarea", required: true },
  ],
  targets: [
    { field: "title", prompt: "A catchy title, max 60 chars" }, // module form field
    { field: "genre", prompt: "Pick the dominant genre" },
    { name: "tone", type: "string", prompt: "A friendly, warm tone" }, // self-contained
  ],
  onCreate: "prefill", // or "direct"
});

feature.configureHeader((h) => h.addAction(aiCreate));
```

For hook-style call sites, `useBunnyHelixAction(config)` is exported as an
alias that delegates to `createBunnyHelixAction`.

## Configuration

| Option | Type | Description |
|---|---|---|
| `id` / `label` / `icon` / `variant` | — | Standard bunny header-action props. |
| `ai` | `HelixAIOption \| (() => HelixAIOption \| Promise<HelixAIOption>)` | Provider + model. Resolved at submit time (supports `useHelixAIOption`, Dexie getter, or props). |
| `inputFields` | `BunnyFormField[]` | Modal fields the user fills before generation. |
| `targets` | `({ field; prompt? } \| BunnyHelixTargetField)[]` | AI-generated record fields. `field` refs derive type/label/options from the module's form config; self-contained entries declare `{ name; type; label?; options?; prompt? }`. |
| `systemPrompt?` | `(ctx) => string` | Optional override. Default is built from module title + field prompts. |
| `temperature?` / `type?` | `number` / `HelixTemperaturePreset` | Generation temperature overrides. |
| `onCreate` | `"prefill" \| "direct"` | `prefill` opens the module create modal pre-filled; `direct` creates the record and refreshes the table. |
| `generate?` | `BunnyHelixGenerateFn` | Escape-hatch to swap in a custom server action. Defaults to `bunnyHelixGenerate`. |
| `modes?` | `BunnyHelixModesConfig` | Optional generation modes: a mode selector is rendered as the first modal input and its `prompt` is injected into the generation instructions. |

## Generation modes

`modes` adds an optional/selectable mode to the modal, steering how the AI
builds the record. Example:

```tsx
modes: {
  required: false, // optional (default); select "None" to skip
  label: "Mode",   // selector label (default "Mode")
  field: "mode",   // value property name when required (default "mode")
  modes: [
    { label: "Simple Instruction", mode: "simple-instruction",
      prompt: "Generate a simple, short instruction." },
    { label: "Detailed Instruction", mode: "detailed-instruction", default: true,
      prompt: "Generate a detailed, step-by-step instruction." },
  ],
},
```

Behavior:

- **Optional** (`required: false`) — the selector includes a "None" option.
  Picking a mode appends its `prompt` to the generation instructions; choosing
  "None" excludes any mode prompt and no mode value is added to the record.
- **Required** (`required: true`) — a mode must be present. The mode value is
  declared as the **first** schema property, is forced into the generated data
  under `field`, and when nothing is selected defaults to the mode marked
  `default: true` (or the first mode).

## Supported field types

| Bunny field type | Helix type | Notes |
|---|---|---|
| `text`, `textarea`, `editor`, `code-editor`, `slug`, `email`, `password` | `string` | `slug` adds a URL-safe format note |
| `number` | `number` | |
| `switch` | `boolean` | |
| `select` | `string` | choices embedded in description; post-validated client-side |
| `custom`, `render`, `display` | unsupported | throws unless provided via a self-contained target |

## Failure handling

- **No / invalid API key** → Helix throws; the modal shows "AI generation failed: …"; the record is untouched.
- **Value outside a select's options or wrong type** → client-side validation error; user retries, no partial create.
- **Double submit** → guarded by bunny's `isProcessing` in the underlying form.

## Server action

`bunnyHelixGenerate` (in `src/BunnyHelixGenerate.Server.ts`) is a generic
`"use server"` action mirroring the `resolveHelixService` pattern from
`bunny-studio`'s `BSAgentGenerate.Server.ts`. It drives
`HelixAIService.doChatStructuredFallback` and wraps failures in a clean error.
Import Helix via deep paths (`@/src/modules/helix/src/...`) so no client
components/hooks are pulled into the server bundle.
