# Bunny AI Studio — Chat Module

Multi-modal AI chat similar to Gemini / ChatGPT. Uses the Vercel AI SDK (v7)
with BYOK (Bring Your Own Key) streaming instead of server actions.

## Features

- **AI Chat** — conversation bubble chat with three UI parts:
  1. Upper: chat title + current AI provider/model.
  2. Middle: conversation bubbles.
  3. Lower: input chat.
- **AI Initial Chat** — when the chat page loads empty, the input is centered
  and offers three input modes:
  1. Standard input chat.
  2. Instruction field + text field.
  3. CodeMirror input field.
- **AI Chat Settings** — per-conversation override of AI provider/model.
  Falls back to Global AI Settings when not set.
- **AI Agent** — select an agent; its persona becomes part of the system
  instruction, and its provider/model is used when set.
- **Rendering Conversation** — pick a render type; assistant messages render
  through the `render` module with both a **render view** and a **raw view**,
  and either can be copied.

## Priority (least → most)

```
AISettings (Global) → Agent AI Settings → Conversation AI Settings → Input AI Settings
```

Empty fields inherit from the next lower level.

## Files

| File | Purpose |
|---|---|
| [`BSChat.Types.ts`](../BSChat.Types.ts) | `BSChat` + `BSConversation` schemas |
| [`BSChat.Repository.ts`](../BSChat.Repository.ts) | Chat/conversation repositories |
| [`BSChat.Hooks.ts`](../BSChat.Hooks.ts) | `useBSChat` streaming + persistence hook |
| [`BSChat.Component.tsx`](../BSChat.Component.tsx) | Main chat view |
| [`BSChat.ConversationView.tsx`](../BSChat.ConversationView.tsx) | Conversation bubble with render/raw toggle |
| [`BSChat.Input.tsx`](../BSChat.Input.tsx) | Input with standard/instruction/codemirror modes (UI orchestrator) |
| [`BSChat.Input.Hooks.ts`](../BSChat.Input.Hooks.ts) | `useBSChatInput` — input state + logic hook |
| [`BSChat.Input.SkillBubbles.tsx`](../BSChat.Input.SkillBubbles.tsx) | Agent skill bubble row (presentational) |
| [`BSChat.Input.InstructionPanel.tsx`](../BSChat.Input.InstructionPanel.tsx) | Instruction group + prefill panel (presentational) |
| [`BSChat.Input.Toolbar.tsx`](../BSChat.Input.Toolbar.tsx) | Mode selector + render type + open-in-modal toolbar (presentational) |
| [`BSChat.Input.EditorModal.tsx`](../BSChat.Input.EditorModal.tsx) | CodeMirror "open in modal" with cover/window view (presentational) |
| [`BSChat.SettingsPanel.tsx`](../BSChat.SettingsPanel.tsx) | Conversation settings + agent + render type |
| [`BSChat.List.tsx`](../BSChat.List.tsx) | Chat history list |

## Streaming

`useBSChat.sendMessage` POSTs to `/api/bunny-studio/chat/stream`, which uses
`streamText` from `ai` with an OpenAI-compatible provider created per request
(`createOpenAICompatible`). Tokens are streamed as a plain text response and
accumulated into the assistant bubble; the final message is persisted to
IndexedDB.
