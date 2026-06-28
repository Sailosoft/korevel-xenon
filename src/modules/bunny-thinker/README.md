# BunnyAI Thinker

**Chain-of-Thought Application** for preplanned structured thinking using AI.

BunnyAI Thinker is a modular application that enables structured, preplanned chain-of-thought conversations with AI. It provides a framework for defining thinker personas, thought patterns, and train-of-thought workflows that produce formatted, exportable outputs.

---

## Architecture Overview

```
src/modules/bunny-thinker/
├── docs/
│   └── INSTRUCTION.md              # Application specification
├── src/
│   ├── thinker/                    # Thinker domain (personas)
│   │   ├── BKThinker.Types.ts      # Zod schemas & interfaces
│   │   ├── BKThinker.Repository.ts # Database repository
│   │   └── BKThinker.Prompt.ts     # Generative AI prompts
│   ├── thought-pattern/            # Thought Pattern domain (variables)
│   │   ├── BKThoughtPattern.Types.ts
│   │   ├── BKThoughtPattern.Repository.ts
│   │   └── BKThoughtPattern.Prompt.ts
│   ├── thought-association/        # Thought Association domain (variable filling)
│   │   ├── BKThoughtAssociation.Types.ts
│   │   ├── BKThoughtAssociation.Repository.ts
│   │   └── BKThoughtAssociation.Prompt.ts
│   ├── ideas/                      # Ideas domain (reusable prompts)
│   │   ├── BKIdeas.Types.ts
│   │   ├── BKIdeas.Repository.ts
│   │   └── BKIdeas.Prompt.ts
│   ├── craft/                      # Craft domain (output formatting)
│   │   ├── BKCraft.Types.ts
│   │   ├── BKCraft.Engine.ts       # Craft processing engine
│   │   └── BKCraft.Prompt.ts       # Craft formatting prompts
│   ├── thoughts/                   # Thoughts domain (main prompts)
│   │   ├── BKThoughts.Types.ts
│   │   ├── BKThoughts.Repository.ts
│   │   └── BKThoughts.Prompt.ts
│   ├── memory/                     # Memory domain (persistence)
│   │   ├── BKMemory.Types.ts
│   │   └── BKMemory.Repository.ts
│   ├── think/                      # Think domain (workspace execution)
│   │   ├── BKThink.Types.ts
│   │   ├── BKThink.Repository.ts
│   │   └── BKThink.Actions.ts      # Server actions for AI
│   ├── think-studio/
│   │   └── BKThinkStudio.tsx        # Main workspace component
│   ├── components/
│   │   └── BKThinkerDashboard.tsx   # Dashboard component
│   └── database/
│       ├── BKThinkerDatabase.ts     # Dexie/PhazeDB database
│       └── BKThinkerMigration.ts    # Schema migrations
└── README.md
```

---

## Domains

### Thinker
A **persona** for the thought process. Thinkers define who is "thinking" — their role, specialization, and guard rails.

- **Properties**: name, description, rules, role, specialization
- **Generative AI**: `ThinkerSwarm` (generate multiple thinkers), `GenerateThinker` (single)

### ThoughtPattern
Acts as **variable templates** for thoughts. Patterns define what input types are expected for each variable.

- **Slots**: Named variables with types (text, textarea, editor, code-editor)

### ThoughtAssociation
**Variable swapping** for thought patterns — fills pattern slots with actual values so patterns can be reused.

- **Action**: Generate association based on thought pattern
- **Generative AI**: `GenerateThought` — creates all patterns and prefills associations from a request

### Ideas
**Reusable prompts** that can be attached to high-level thoughts or thought associations.

- **Generative AI**: `GenerateIdeaForThought`

### Craft
**Output formatting** that enforces strict formatting rules (no commentary, no wrapping, no questions).

- **Formats**: markdown, html, tailwind, csv, json, imageList, mermaid, plain
- **Engine**: Processes AI output before saving to memory

### Thoughts
The **main prompt/idea** with OpenAI chat conversation support.

- Uses system, assistant, and user messages
- Supports **Train of Thoughts** — preplanned conversation steps
- Each train of thought can toggle inclusion in memory/exports

### Memory
**CRUD persistence** for thinking session outputs.

- Review published output via memory
- Export memory to HTML format
- Memory Neurons store individual thought outputs

### Think
The **workspace module** that connects all domains together.

- Connects thoughts, thought associations, and memory
- Computes thought patterns via thought associations
- Runs AI conversation
- Supports rethink from specific train of thought
- Consolidates conversation on interruption
- Generates memory on completion

---

## Code Conventions

| Rule | Convention |
|------|-----------|
| **Prefix** | All exportable classes, interfaces, and files use `BK` prefix |
| **Functions** | Use `bk` after the verb: `useBKCase()`, `doBKJob()` |
| **File Separation** | Clear separation of Component, Logic, Constant/Prompt, ServerAction, Engine, Modules |
| **Prompts** | Prompt text in separate `{Filename}.Prompt.ts` files |
| **AI Prompts** | Not included in server action files |
| **Database** | Dexie with PhazeDB abstraction; no `useLiveQuery` hooks |
| **Repository** | Repository pattern for all database operations |
| **Server Actions** | `"use client"` only for wrapper; `"use server"` for AI calls |
| **Branding** | Use `Bunny` / `BK` branding consistently |

---

## Getting Started

1. **Navigate** to the Bunny Thinker module at `/modules/bunny-thinker`
2. **Create Thinkers** — define personas for structured thinking
3. **Define Thought Patterns** — create variable templates
4. **Build Thoughts** — create main prompts with Train of Thoughts
5. **Run Thinking Sessions** — use the Think Studio to execute chain-of-thought
6. **Review Memory** — persisted outputs can be reviewed and exported

---

## Dependencies

- **Helix** (`src/modules/helix`) — AI service layer for chat and structured output
- **Bunny Framework** (`src/modules/bunny`) — UI components and feature management
- **BunnyFlow** (`src/modules/bunny-flow`) — Workflow patterns and architecture reference
- **PhazeDB** (`src/modules/phaze`) — Dexie abstraction for IndexedDB
- **Dexie** — Client-side persistence database
