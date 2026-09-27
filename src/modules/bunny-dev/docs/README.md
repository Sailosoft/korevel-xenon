# Bunny Developer (BunnyDev)

A local-first developer decision workspace. Design schemas, apps, APIs,
diagrams, docs, and files; manage a kanban board; and drive every designer with
one-shot AI batch generation reviewed before it is applied.

Everything persists to IndexedDB via Dexie — there is no server database and no
tenant. Solves "decide and document, then hand off to AI agents".

## Navigation

- `src/app/modules/bunny-dev/` — thin Next.js route pages
  - `/modules/bunny-dev` — project list (outer shell)
  - `/modules/bunny-dev/settings` — global AI settings
  - `/modules/bunny-dev/projects/[projectId]` — project workspace (inner shell)
    - `/schema` · `/app` · `/api` · `/outline` · `/diagram` · `/files` ·
      `/architecture` · `/board` · `/agents` · `/settings`
- `src/modules/bunny-dev/` — module source
  - `BDDomain.Types.ts` — canonical serializable domain model
  - `BDDatabase.ts` / `BDMigration.ts` / `BDRepository.ts` — Dexie layer
  - `components/` — shared config-first BD component kit
  - `modules/shell/` — `BDShell` (bluish theme) used by both layouts
  - `modules/core/` — project core (CRUD, context, hooks, settings)
  - `modules/ai-settings/` — global AI provider/model
  - `modules/agent-manager/` — agents, handoffs, and the shared generation pipeline
  - `modules/schema-builder/` · `diagram-builder/` · `app-builder/` ·
    `api-design/` · `outline/` · `architecture/` · `file-management/` ·
    `project-management/`

## Conventions

- **Bespoke components, raw Dexie.** No `PhazeDB` / `BunnyFeature` inheritance.
  Repositories are `new BDRepository<TRow>(table)` wrappers.
- **Serializable domain.** The blueprint's function fields (formatters, actions,
  reactive updates) became declarative descriptors; circular back-references
  became foreign-key ids. Aggregate roots keep their deep config inline.
- **Two-tier layout.** The outer layout returns children bare for project routes
  so the inner project shell is not nested inside a second shell.
- **React 19 params.** `projects/[projectId]` uses `use(params)` to unwrap the
  async route params and bake the id into nav hrefs.
- **Server actions** live inside the module (`*.Server.ts`), marked
  `"use server"`. They only call Helix; all Dexie writes happen client-side.
- **One-shot batch contract.** Every `BD*.Server.ts` returns a full serializable
  artifact set. The shared `BDGenerationPanel` records a `generationRun`, stores
  a pending `batchProposal`, and applies or rejects the whole set at once.

## AI

`BDGeneration.Server.ts` resolves Helix providers from `HELIX_AI_PROVIDERS` and
calls `doChatStructuredFallback` with a JSON schema (with repair). Provider and
model come from the `aiSettings` singleton (`global`) or a per-project override
(`project-{id}`), configured on the AI settings / project settings pages.
