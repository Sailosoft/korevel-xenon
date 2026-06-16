I would separate **Agent Definitions** from **Agent Usage**.

## Recommended architecture

```text
Flow
├── Agent Pool          ← Shared across the Flow
├── Variables (Global)
├── Workspace A
│   ├── Jobs
│   ├── Steps
│   └── Uses:
│       • Research Agent
│       • Writer Agent
│
├── Workspace B
│   ├── Jobs
│   └── Uses:
│       • Reviewer Agent
│
└── Workspace C
    └── Uses:
        • Writer Agent
```

## Why Flow-level Agent Pool?

Agents are typically reusable assets.

Imagine you have:

- GPT-5 Coding Agent
- DeepSeek Research Agent
- Qwen Translator Agent
- Image Generation Agent

You probably don't want to recreate them in every Workspace.

Instead:

```text
Flow
└── Agent Pool
    ├── Research Agent
    ├── Writer Agent
    ├── Reviewer Agent
    └── Publisher Agent
```

Each Workspace simply references them.

---

## Workspace only references Agents

Example:

```text
Writing Workspace

Jobs
├── Draft Article
│   └── Writer Agent
│
└── Review Article
    └── Reviewer Agent
```

The Workspace doesn't own the agents—it uses them.

---

## Similar to GitHub

```text
Repository
├── Secrets
├── Variables
├── Workflows
└── Actions
```

A workflow references secrets; it doesn't own them.

---

## Similar to Azure DevOps

```text
Project
├── Agent Pools
├── Pipelines
└── Repositories
```

Pipelines choose which agent to run on.

---

## Future-proof design

```text
Flow
├── Agent Pool
│   ├── Agent A
│   ├── Agent B
│   └── Agent C
│
├── Prompt Library
├── Variable Library
├── Tool Library
├── Knowledge Bases
├── MCP Servers
├── Connections
│
└── Workspaces
    ├── Workspace 1
    │   ├── Jobs
    │   └── References Agent A
    │
    ├── Workspace 2
    │   └── References Agent A + Agent C
    │
    └── Workspace 3
        └── References Agent B
```

Everything becomes reusable.

---

## When would Workspace-level Agents make sense?

Only if you want **private agents** that cannot be used elsewhere.

For example:

```text
Flow
├── Shared Agent Pool
│   ├── Writer
│   └── Reviewer
│
└── Workspace
    └── Local Agents
        └── Temporary Testing Agent
```

This is a nice optional enhancement later, but I wouldn't make it the default.

---

## My recommendation for BunnyFlow

I would organize the domain like this:

```text
Flow
├── Agent Pool          ⭐ Shared AI agents
├── Prompt Library      ⭐ Shared prompts
├── Variable Library    ⭐ Global variables
├── Tool Library        ⭐ MCPs, APIs, Functions
├── Knowledge Bases     ⭐ RAG/Vector Stores
├── Assets              ⭐ Files/Templates
└── Workspaces
    ├── Jobs
    ├── Steps
    └── References Flow resources
```

This keeps your **Workspaces focused on orchestration**, while the **Flow acts as the shared resource container**. It also scales well as BunnyFlow grows, avoiding duplicated agents and making updates much easier.
