# Bunny AI Studio

Bunny AI Studio is a multi-modal AI chat feature (similar to Gemini and
ChatGPT). It uses the Vercel AI SDK (v7) with BYOK streaming and a local-first
Dexie.js database.

> Full specification: [`docs/PLAN.md`](docs/PLAN.md)

## Architecture

```
src/modules/bunny-studio/
  index.ts                    module entry point
  README.md
  docs/PLAN.md                specification
  src/
    BSDatabase.ts             Dexie (Phaze) database
    BSMigration.ts            schema migrations
    index.ts                  source barrel
    modules/
      chat/                   AI Chat + conversation + streaming
      agents/                 Agent CRUD
      agent-pools/            Agent Pool CRUD
      ai-settings/            Global AI settings
      studio/                 Header + Sidebar shell
      configurations/         Configurations page
```

## Naming Convention

- Files: `BS{FileName}.ts` / `BS{FileName}.tsx`
- Classes/Components: `BSChat`, `BSChatComponent`, `BSAgentComponent`
- Hooks: `useBSChat`, `useBSAISettings`
- Objects: `bsDB`, `bsChat`

## Database (Dexie.js)

| Table | Purpose |
|---|---|
| `chats` | Chat threads |
| `conversations` | Messages within a chat |
| `agents` | Reusable AI personas |
| `agentPools` | Groups of agents |
| `aiSettings` | Global AI provider/model (singleton) |

## Streaming

The chat uses the Vercel AI SDK with **BYOK** (Bring Your Own Key):

- `POST /api/bunny-studio/chat/stream` — `streamText` with a per-request
  OpenAI-compatible provider built from the resolved Helix provider config.
- Tokens are streamed to the client as plain text and accumulated into the
  assistant bubble; the final message is persisted to IndexedDB.

## AI Settings Priority (least → most)

```
AISettings (Global) → Agent AI Settings → Conversation AI Settings → Input AI Settings
```

## Routes

- `/modules/bunny-studio` — chat
- `/modules/bunny-studio/chat/[id]` — specific chat
- `/modules/bunny-studio/agents` — agent CRUD
- `/modules/bunny-studio/agent-pools` — agent pool CRUD
- `/modules/bunny-studio/ai-settings` — global AI settings
- `/modules/bunny-studio/configurations` — configurations
