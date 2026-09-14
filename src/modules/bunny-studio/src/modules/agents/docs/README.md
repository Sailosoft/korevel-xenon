# Bunny AI Studio — Agents Module

CRUD for AI Agents. An agent is a reusable persona:

- `name` — display name
- `persona` — system instruction
- `skills` — array of skills separated by comma `","`
- `provider?` / `model?` — optional AI provider/model override
- `agentPoolId?` — optional owning agent pool

## Rules

- Agents **without** an `agentPoolId` are global agents (displayed by default).
- An agent can override the global AI priority with its own provider/model.

## Header filter — by Agent Pool

The Agents page exposes a header **"Filter by Agent Pool"** button (see
[`BSAgent.Picker.tsx`](../BSAgent.Picker.tsx)). Selecting an option writes
to the module-level filter store ([`BSAgent.Filter.ts`](../BSAgent.Filter.ts))
and the table is refreshed via `adminPanel.table.fetchData()`.

Filter options:

| Value | Behavior |
|---|---|
| `"all"` (default) | Show every agent regardless of pool |
| `"none"` | Show only global / ungrouped agents (`agentPoolId === undefined`) |
| `<poolId>` | Show only agents in that pool |

The data layer override in [`BSAgent.Module.tsx`](../BSAgent.Module.tsx)
applies the active filter to every `getAll` call before returning rows.

## Repository

`BSAgentRepository` exposes:

| Method | Purpose |
|---|---|
| `getWithoutAgentPoolId()` | Get global/ungrouped agents |
| `getByAgentPoolId(poolId)` | Get agents for a specific pool |
