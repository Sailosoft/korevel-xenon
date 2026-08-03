# Bunny AI Studio — Agent Pools Module

Agent pools are agent groups that group agents. Ungrouped agents (no
`agentPoolId`) are global agents.

The purpose of agent pools: when starting a new chat, a user can set an agent
pool and inherit the list of agents they can choose from.

## CRUD

`BSAgentPoolComponent` provides create / read / update / delete for pools.

Deleting a pool ungroups its agents (sets their `agentPoolId` to undefined)
before removing the pool, preserving the agents.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | string (uuidv7) | primary key |
| `name` | string | display name |
| `description` | string? | optional description |
| `createdDate` | string | ISO datetime |
