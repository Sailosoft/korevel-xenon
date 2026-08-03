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

## Repository

`BSAgentRepository` exposes:

| Method | Purpose |
|---|---|
| `getWithoutAgentPoolId()` | Get global/ungrouped agents |
| `getByAgentPoolId(poolId)` | Get agents for a specific pool |
