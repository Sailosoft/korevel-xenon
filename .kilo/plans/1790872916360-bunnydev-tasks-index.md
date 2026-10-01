# BunnyDev tasks.yaml — Implementation Plan Index

Source of truth: `src/modules/bunny-dev/ai/tasks/tasks.yaml` and agent spec
`src/modules/bunny-dev/ai/agents/agent-bunny-dev.md`.

The plan is split by module (user decision). Each file below is
implementation-ready and self-contained. Execute in the order listed; all work is
inside `src/modules/bunny-dev` unless stated otherwise.

## Plan files

| # | Plan | Tasks | yaml lines |
|---|------|-------|-----------|
| 1 | `1790872916360-app-builder-plan.md` | render-as-app, select options, Filament relationships, separate app DB, app metadata | 2–34 |
| 2 | `1790872916360-api-design-plan.md` | icon delete, virtualized operation bar, faker selection | 36–43 |
| 3 | `1790872916360-diagram-builder-plan.md` | display styling, dynamic per-type editor + type lock + direction | 44–57 |
| 4 | `1790872916360-sidebar-actions-plan.md` | sidebar/row delete actions as icon buttons with tooltips (module: all) | 58–61 |
| 5 | `1790872916360-architecture-plan.md` | meaningful AI sections + WYSIWYG, View/Export HTML | 63–74 |
| 6 | `1790872916360-project-management-plan.md` | task modal improvements, board/global settings | 76–94 |
| 7 | `1790872916360-file-management-plan.md` | multimedia viewer, multi-select bulk ops, password protection | 96–102 |

## Global decisions (locked)

- **Plan scope:** one plan per module.
- **Render-as-app route:** new `src/app/modules/bunny-dev/render/[appId]/page.tsx`, outside the project module shell.
- **Separate rendered-app DB:** second Dexie database (`BunnyDevAppDB`) owns `appRecords`; app definitions stay in `BunnyDevDB`.
- **Relationship depth:** full Filament-style relation managers (1:many inline CRUD, m:n attach/detach/reorder, 1:1 inverse, searchable selects, infolist view).
- **Assignee/story points:** keep `storyPoints`; replace raw `assigneeId` text input with a real project-member select.
- **File password:** salted SHA-256 hash + `passwordProtected` flag; UI gate on view/edit/download (no at-rest encryption).

## Shared conventions / constraints

- Next.js in this repo differs from training data. Read `node_modules/next/dist/docs/` before adding routes/layouts (see `AGENTS.md`). Route params are Promises; unwrap with `use(params)`.
- Persistence: raw Dexie + generic `BDRepository<TRow>` (`BDRepository.ts`). Live queries via `dexie-react-hooks` `useLiveQuery`. IDs are UUIDv7 with timestamps.
- Dexie schema changes (new indexes) go in a new `db.version(n).stores({...})` in `BDMigration.ts`; fields not queried need no schema bump. Never edit an existing version block.
- AI generation flows through `BDGenerationPanel` → server `bdGenerateStructured` (Helix) → `BDBatchProposal` → `onApply` → `applyArtifact`.
- UI primitives: `BDButton`, `BDModal`, `BDConfirmDialog`, `BDContextMenu`, `BDList`, `BDForm`, `BDWysiwygEditor`, `BDCodeEditor`, `BDMarkdownView`, `BDBadge`, `BDPageHeader`, `useBDToast`.
- There is no tooltip primitive in bunny-dev; reuse HeroUI `Tooltip` + `Tooltip.Content` (pattern: `src/modules/bunny/src/table/BunnyReactiveTable.tsx`) or use `aria-label` + native `title`.

## Execution order (recommended)

1. Sidebar actions (cross-cutting `BDList` change lands first so later modules inherit it).
2. App-builder (largest; DB migration + new route).
3. API design.
4. Diagram builder.
5. Architecture.
6. Project management.
7. File management.

## Validation (all plans)

- `bun run build` must pass (per agent spec).
- `npm run lint` (eslint) clean.
- Manual smoke per module: create/edit/delete round-trips, AI generate + apply, and reload persistence.
- Dexie upgrades: verify existing local data survives (open app with pre-existing `BunnyDevDB`).

## Open questions

- Task 3 "exact Laravel Filament" is interpreted as full relation managers (fixed by user). Any Filament feature outside relation managers (policies, global search across resources, tenancy scoping) is out of scope for this pass.
- Task 12 "consider assignee/story points" resolved: keep points, add member picker; `assigneeId` stays indexed.
