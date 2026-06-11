# Prompt Viewer

A read-only viewer that displays all AI prompt constants used across the
`bunny-ai` module in a unified, searchable interface.

## Purpose

Instead of having to open individual prompt files to check what prompts are
defined, the Prompt Viewer collects every prompt variant from every module
into a single page where you can:

- Browse prompts grouped by module (Author Skills, Authors, Books, Book Chapters)
- Search across all prompt types, system prompts, and user prompts
- Expand individual variants to read the full system and user prompts
- Copy any prompt text to the clipboard with one click
- See at a glance how many prompt variants exist per module

## How to add a new prompt source

1. Open [`bui.prompt-viewer.data.ts`](bui.prompt-viewer.data.ts).
2. Import your prompt constant from its module file.
3. Push a new [`PromptViewerEntry`](bui.prompt-viewer.data.ts) object into the
   `promptViewerRegistry` array.

**Example:**

```ts
import { myNewPrompt } from "../my-module/bui.my-module.prompt";

// In promptViewerRegistry:
{
  module: "My Module",
  label: "myNewPrompt.someGroup",
  description: "Brief description of what these prompts do.",
  prompts: Object.entries(myNewPrompt.someGroup).map(([type, value]) => ({
    type,
    systemPrompt: value.systemPrompt,
    userPrompt: value.userPrompt,
  })),
}
```

The page will automatically pick up the new entry — no routing or component
changes needed.

## File Structure

| File                                                                 | Purpose                                                         |
| -------------------------------------------------------------------- | --------------------------------------------------------------- |
| [`docs/bui.prompt-viewer.yaml`](docs/bui.prompt-viewer.yaml)         | Feature definition form                                         |
| [`bui.prompt-viewer.data.ts`](bui.prompt-viewer.data.ts)             | Prompt registry — import & normalise all prompt sources here    |
| [`bui.prompt-viewer.component.tsx`](bui.prompt-viewer.component.tsx) | "use client" React component with search, expand/collapse, copy |
| [`README.md`](README.md)                                             | This file                                                       |
