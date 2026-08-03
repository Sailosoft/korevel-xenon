# Bunny AI Studio — AI Settings Module

Uses **AI Helix** for AI configuration and AI services:

- [`src/modules/helix`](../../../../../../helix)
- [`src/modules/helix/src/components/index.ts`](../../../../../../helix/src/components/index.ts)

## Global Settings

The singleton `aiSettings` record (key = `"global"`) stores the user's
preferred AI provider + model pair. `BSAISettingsProvider` loads it on mount
and exposes `saveSettings` / `reloadSettings` via `useBSAISettings()`.

`BSAISettingsComponent` renders the provider + model selection form.

## Priority (least → most)

```
AISettings (Global) → Agent AI Settings → AI Conversation Settings → AI Input Settings
```

Each level can override the one below it.
