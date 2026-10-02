# BunnyDev Module — Implementation Plan

## Goal

Build the **Bunny Developer** module (`src/modules/bunny-dev`) from the spec in
`src/modules/bunny-dev/docs/BunnyDev.md` and the type blueprint
`src/modules/bunny-dev/docs/BunnyDev.ts`: a local-first (Dexie) developer
decision-making workspace with a two-level layout (project list → project
workspace) and these project-scoped sub-modules:

SchemaBuilder, AppBuilder (+ App Rendering), API Design, Architecture Design,
File Management, Diagram Builder, Project Management, Outline, Agent Manager,
plus global AI settings.

Currently `src/modules/bunny-dev/` contains only `docs/`, an empty `index.ts`,
and an empty `modules/` folder.

## Locked Decisions

| # | Decision | Choice |
|---|----------|--------|
| 1 | Scope | Full module, all sub-modules |
| 2 | Persistence | Hybrid — normalize core collaborative entities; inline deep UI/design config |
| 3 | UI + AI foundation | **Bespoke BD components; `helix` only.** No dependency on `src/modules/bunny` or `admin-panel` |
| 4 | DB access | **Dexie directly** (per spec "used dexieDB"). `BDDatabase extends Dexie`; no `PhazeDB` wrapper |
| 5 | File naming | Dot-role suffixes, `BD` prefix: `BD<Name>.Types.ts`, `.Repository.ts`, `.Component.tsx`, `.Module.ts`, `.Server.ts`, `.Hooks.ts`, `.Store.ts` |
| 6 | Domain types | Full `docs/BunnyDev.ts`, made serializable (no persisted function fields) |
| 7 | Routing | Project-scoped nested routes (below) |
| 8 | Agent execution | One-shot batch generation + review/apply (mode chosen before generation: create / append / replace) |
| 9 | Build order | Foundation → stub all routes → depth-first per sub-module |
| 10 | Branding | Bluish / MUI-inspired primary (`#1976d2` family), light + dark |

## Directory Layout

Everything lives under `src/modules/bunny-dev/` (spec: main dir + `modules/`).

```
src/modules/bunny-dev/
├── index.ts                     # barrel: re-export src entry points
├── README.md                    # module overview + conventions
├── BDStyle.css                  # module theme tokens (bluish)
├── BDDomain.Types.ts            # canonical BD enums/interfaces (from BunnyDev.ts, serializable)
├── BDDatabase.ts                # BDDatabase extends Dexie + `bdDB` singleton
├── BDMigration.ts               # versioned Dexie schema (version(n).stores)
├── BDRepository.ts              # generic BDBRepository<T> (CRUD + query, uuid v7)
├── components/                  # shared, config-first BD components (index.ts barrel)
├── modules/                     # one folder per feature (spec: bunny-dev/modules)
└── docs/                        # existing specs (unchanged)
```

App routes live in `src/app/modules/bunny-dev/**` and are thin wrappers that
import from `@/src/modules/bunny-dev/modules/...`.

## Domain Types (`BDDomain.Types.ts`)

- Port enums/unions/interfaces from `docs/BunnyDev.ts` verbatim where
  serializable: schema (`BDSchemaType`, `BDSchemaModel`, `BDSchemaProperty`,
  `BDSchemaRelation`, `BDSchemaIndex`, `BDSchemaGroup`), diagram
  (`BDDiagram*`, node/edge maps), architecture (`BDArchitecture*`, sections,
  milestones, risks, changelog), outline (`BDOutline*`), app (`BDApp*`,
  resources, pages, tables, columns, fields, layouts, widgets, actions),
  project/board/agent (`BDProject`, members, workflows, board tasks, agents,
  handoffs), files (`BDProjectFolder`, `BDProjectFile`, content, versions).
- **Make serializable**: replace function-typed fields with declarative
  descriptors so records survive Dexie structured clone:
  - `BDAppColumn.format` → `format?: { kind: "text" | "currency" | "date" | "since" | "number"; currency?: string }`.
  - `BDAppAction.action` → `handler?: string` (named handler id resolved by a runtime registry in the App Rendering engine).
  - `BDAppReactive.update` → `reactive?: { dependsOn: string[]; effect: string }` (declarative rule string).
  - `BDAppEntry.format`, `BDAppField.options` functions → descriptor / static map.
- Keep a small `BDAppRuntime.*` registry type for non-persisted behavior.

## Dexie Schema (Hybrid)

`BDDatabase extends Dexie`, DB name `"BunnyDevDB"`. Migration versions in
`BDMigration.ts` (`version(n).stores({...})`, sequential, with `.upgrade()`
backfills when needed). UUIDv7 primary keys (`uuid` dependency already present).

**Normalized core tables** (own table + FK indexes):
- `projects` — project root (`BDProject` minus nested collections).
- `projectMembers` — `projectId` FK.
- `labels`, `components`, `versions` — `projectId` FK.
- `sprints` — `projectId` FK.
- `workflows` — `projectId` FK (statuses/transitions inlined).
- `boards` — `projectId`, `sprintId`.
- `boardColumns` — `boardId`.
- `boardTasks` — `projectId`, `boardId`, `sprintId`, `assigneeId`, `parentId`, `status`.
- `taskComments` — `taskId`.
- `issueLinks` — `taskId`, `targetId`.
- `attachments` — `taskId`, `projectId`.
- `agents` — `projectId`.
- `agentTasks` / `agentRuns` / `agentHandoffs` — `projectId`, `taskId`, `agentId`.
- `aiSettings` — global singleton (`key = "global"`) using helix `HelixAISettings`.
- `generationRuns` — one row per AI batch generation (`projectId`, `subsystem`, `status`).
- `batchProposals` — pending/applied/rejected one-shot artifacts (`projectId`, `subsystem`, `status`).

**Aggregate-root tables with inline deep config**:
- `schemaGroups` — project groups; `schemaModels` normalized (`projectId`, `groupId`) with `properties`/`relations`/`indexes` inlined.
- `apps` — `projectId`; `resources`/`pages`/`widgets`/`theme`/`navigation`/`clusters`/`plugins` inlined (BDApp config tree).
- `apiSpecs` — `projectId`; endpoints/requests/responses/examples inlined (mock + document layout).
- `diagrams` — `projectId`; `nodes`/`edges` inlined.
- `outlines` — `projectId`; `topics`/`guides`/`content`/`sources`/`reviews` inlined.
- `architectures` — `projectId`; `sections`/`milestones`/`risks`/`links`/`changelog` inlined.
- `projectFolders` — `projectId`, `parentId` (tree).
- `projectFiles` — `projectId`, `folderId`; text content inlined, binary stored as `Blob` (cap ~5 MB, else reject with message).

Cascade hooks (`table.hook("deleting", ...)`) delete children by FK for
`projects` → all project-scoped tables.

## Shared Config-First Components (`components/`)

Bespoke, BD-prefixed, pluggable. Core primitives:
- `BDList.tsx` — config-first data table: column descriptors, sort, filter, pagination, row actions, bulk actions, empty state.
- `BDForm.tsx` + `BDSchemaForm.tsx` — config-first form renderer from field descriptors (text/textarea/select/toggle/date/relationSelect/repeater/keyValue/fileUpload).
- `BDModal.tsx`, `BDDrawer.tsx`, `BDConfirmDialog.tsx`, `BDToast.tsx`, `BDEmptyState.tsx`, `BDBadge.tsx`, `BDStatusDot.tsx`, `BDAsyncBoundary.tsx`.
- `BDMarkdownView.tsx` (`react-markdown` + `remark-gfm`), `BDCodeEditor.tsx` (CodeMirror), `BDWysiwygEditor.tsx` (`@mdxeditor/editor`), `BDDiagramView.tsx` (Mermaid).
- `BDShell` in `modules/shell/` (`BDShell.tsx`, `BDShell.config.ts`, `BDShell.sidebar.tsx`, `BDShell.header.tsx`) — one shell component with a config object, reused by both layouts.

All components are client components (`"use client"`), SSR-unsafe editors
loaded via `dynamic(..., { ssr: false })`, and exported through `components/index.ts`.

## Routes

```
src/app/modules/bunny-dev/
├── layout.tsx                        # Main layout: BDShell + BD list nav + BDAISettingsProvider
├── page.tsx                          # /modules/bunny-dev — project list (CRUD)
├── settings/page.tsx                 # global AI settings (HelixAIProviderSelector)
└── projects/[projectId]/
    ├── layout.tsx                    # Project layout (2nd shell); BDProjectProvider; project nav
    ├── page.tsx                      # project overview/dashboard
    ├── schema/page.tsx               # SchemaBuilder
    ├── app/page.tsx                  # AppBuilder + App Rendering
    ├── api/page.tsx                  # API Design (mock + document)
    ├── outline/page.tsx              # Outline
    ├── diagram/page.tsx              # Diagram Builder
    ├── files/page.tsx                # File Management
    ├── architecture/page.tsx         # Architecture Design
    ├── board/page.tsx                # Project Management (kanban)
    ├── agents/page.tsx               # Agent Manager
    └── settings/page.tsx             # project AI/agent settings
```

- `src/app/modules/bunny-dev/layout.tsx` mirrors the `bunny-flow` outer/inner
  pattern: skip the main shell when the path matches
  `/modules/bunny-dev/projects/[^/]+(/|$)` so the project layout owns the shell.
- `projects/[projectId]/layout.tsx` builds nav hrefs from the resolved `projectId`
  (use `use(params)` as in `bunny-flow/flow/[id]/layout.tsx`).
- Add a `catalogApps` entry in `src/modules/catalogs/src/CatalogList.ts`
  (id 13, url `/modules/bunny-dev`, category `"code-editor"`, MUI-blue gradient).

## AI Integration

- Per-sub-module server actions `BD<Feature>.Server.ts` with `"use server"`,
  following the `resolveHelixService()` pattern in
  `src/modules/bunny-helix/src/BunnyHelixGenerate.Server.ts`:
  `new HelixAIService({ config: { ai: { activeProvider, providers } }, aiSchema: new HelixAISchemaService() })`,
  then `ai.doChatStructuredFallback({ system, user, schema, temperature })`.
- Resolve provider/model from the `aiSettings` singleton (`useHelixAISettings` /
  `useHelixAIOption` from `@/src/modules/helix`), with optional per-project
  override in `projects.agentSettings`.
- One-shot batch generation contract per sub-module: request includes
  `mode: "create" | "append" | "replace"` and `subsystem`; the action returns a
  full serializable artifact set written to `batchProposals` as `pending`. UI
  shows a review diff; **Apply** commits to the target tables and marks
  `applied`; **Reject** marks `rejected`. No partial writes.
- Each sub-module exposes a `<BD...GeneratePanel>` (uses `generationRuns` +
  `batchProposals`) for AI generation.

## Phased Task List

### Phase 1 — Foundation
1. Create `BDDomain.Types.ts` (full `BunnyDev.ts`, serializable; see above).
2. Create `BDDatabase.ts`, `BDMigration.ts` (v1 tables + indexes + cascade hooks), `BDRepository.ts`.
3. Build shared `components/` (list, form, schema-form, modal, drawer, confirm, toast, empty, badge, markdown, code, wysiwyg, mermaid) + `components/index.ts`.
4. Build `modules/shell/` (`BDShell` + config + sidebar + header) with bluish theme; add `BDStyle.css`.
5. Build `modules/core/` project core: `BDProject.Types.ts`, `BDProject.Repository.ts`, `BDProject.Component.tsx`, `BDProject.Module.ts`, `BDProjectList.Component.tsx`, `BDProject.Hooks.ts`.
6. Build `modules/ai-settings/` (`BDAISettings.Types.ts`, `.Context.tsx` provider, `.Component.tsx`).
7. Wire `src/app/modules/bunny-dev/layout.tsx`, `page.tsx`, `settings/page.tsx`.
8. Add `catalogApps` entry; populate `src/modules/bunny-dev/index.ts` barrel.
9. **Validate**: project CRUD works end-to-end; `npm run lint` + `npm run build` pass.

### Phase 2 — Stub all project routes
10. Create `projects/[projectId]/layout.tsx` (2nd shell + `BDProjectProvider`) and `page.tsx`.
11. Create stub pages for `schema`, `app`, `api`, `outline`, `diagram`, `files`, `architecture`, `board`, `agents`, `settings` — each renders a `BDEmptyState` "coming soon" through the shell. Nav fully navigable.
12. **Validate**: all routes resolve and navigation highlights correctly.

### Phase 3 — SchemaBuilder
13. `modules/schema-builder/`: `BDSchemaBuilder.Types.ts` (group/model/property/relation/index), `.Repository.ts`, `.Component.tsx` (ERD-style model editor), `BDSchemaModel.Component.tsx`, `BDSchemaGroup.Component.tsx`, `.Hooks.ts`, `.Server.ts` (AI generate schema), `BDPrismaExport.ts` (export Prisma schema + model file), `BDPrismaExport.Server.ts`.
14. Replace `schema/page.tsx` stub. **Validate** CRUD + export.

### Phase 4 — Diagram Builder
15. `modules/diagram-builder/`: types, repository, `.Component.tsx` (Mermaid render + node/edge editor: add/remove node, label add/remove, position adjust), `.Server.ts` (AI generate diagram/mermaid), `BDDiagramExport.ts`.
16. Replace `diagram/page.tsx` stub. **Validate** create/edit/render/export.

### Phase 5 — AppBuilder + App Rendering
17. `modules/app-builder/`: `BDApp.Types.ts` (serializable `BDApp*`), `.Repository.ts`, `.Component.tsx` (resource/page/form/table designers), `BDAppResource.*`, `BDAppForm.*`, `BDAppTable.*`, `.Server.ts` (AI generate app config).
18. `BDAppRendering.Component.tsx` — renders generated app from config: list/create/edit/view pages, CRUD, relation selection (one-to-one, one-to-many, many-to-many, many-to-one) over project schema models; generated app state stored in Dexie.
19. Replace `app/page.tsx` stub. **Validate** design → render → CRUD/relations.

### Phase 6 — API Design
20. `modules/api-design/`: types, repository, `BDApiMock.Component.tsx` (Postman-like layout), `BDApiDocument.Component.tsx` (document layout + export to HTML), `.Server.ts` (AI generate API doc/mocks).
21. Replace `api/page.tsx` stub. **Validate** both layouts + HTML export.

### Phase 7 — Outline
22. `modules/outline/`: types, repository, `BDOutline.Component.tsx` (topic tree), `BDOutlineEditor.Component.tsx` (WYSIWYG + markdown preview), `BDOutlineExport.ts` (markdown/html/pdf/json), `.Server.ts` (AI generate outline/expand).
23. Replace `outline/page.tsx` stub. **Validate** authoring + export.

### Phase 8 — Architecture Design
24. `modules/architecture/`: types, repository, `BDArchitecture.Component.tsx` (section editor + variant/compare), `BDArchitectureExport.ts` (markdown), `.Server.ts` (AI generate architecture variants).
25. Replace `architecture/page.tsx` stub. **Validate** variants + markdown export.

### Phase 9 — File Management
26. `modules/file-management/`: types, repository, `BDProjectFile.Repository.ts`, `BDFileTree.Component.tsx` (virtual FS tree), `BDFileEditor.Component.tsx` (CodeMirror / WYSIWYG toggle), `BDFileUpload.ts` (Blob, size cap), `BDFileDownload.ts`.
27. Replace `files/page.tsx` stub. **Validate** create/upload/open/edit/download.

### Phase 10 — Project Management board
28. `modules/project-management/`: board/task types, repositories (`boards`, `boardColumns`, `boardTasks`, `taskComments`, `issueLinks`), `BDBoard.Component.tsx` (JIRA-style kanban with drag/reorder), `BDBoardTask.Drawer.tsx` (WYSIWYG comment/description), filters/sprints hooks.
29. Replace `board/page.tsx` stub. **Validate** kanban + task CRUD + comments.

### Phase 11 — Agent Manager (+ hands-off generation)
30. `modules/agent-manager/`: agent/agentTask/handoff/run types, repositories, `BDAgent.Component.tsx`, `BDAgentTask.Component.tsx`, `BDGenerationPanel.tsx` (mode create/append/replace, subsystem target), `BDBatchProposal.Review.tsx` (review + apply/reject), `BDAgent.Server.ts` (one-shot batch generation via helix).
31. Wire `agents/page.tsx` + `board` hands-off entry. **Validate** generate → review → apply.

### Phase 12 — Polish
32. Theming pass (bluish primary, light/dark), loading/error states, empty states, keyboard shortcuts.
33. `src/modules/bunny-dev/README.md`; finalize `index.ts` barrel.
34. **Validate**: `npm run lint`, `npm run build`, manual smoke of every route.

## Data Flow

`page.tsx` (thin) → feature `.Component.tsx` → `.Hooks.ts` (Dexie live queries
via `dexie-react-hooks`) → `.Repository.ts` → `bdDB`. AI requests go
`.Component` → feature `.Server.ts` (`"use server"`) → `HelixAIService` →
`batchProposals` (pending) → review UI → apply → target tables. All writes are
local-first; no server persistence.

## Risks & Mitigations

- **Non-serializable blueprint fields** → normalized to descriptors (Phase 1).
- **Huge scope** → stub-all-routes pass guarantees a navigable skeleton; each phase is independently shippable.
- **App Rendering complexity** (CRUD + relations like Filament) is the highest-risk item → isolate the rendering engine in its own module and validate against schema models before wiring AI.
- **Editor SSR** (CodeMirror/MDXEditor/Mermaid) → `"use client"` + `dynamic(ssr:false)`.
- **Large one-shot batch payloads** could exceed model output limits → use helix `doChatStructuredFallback` JSON repair; allow per-subsystem batching if needed.
- **Dexie Blob storage** for binary uploads → 5 MB cap with clear error, download restores the file.

## Validation Plan

- `npm run lint` and `npm run build` must pass after each phase.
- Per-phase manual acceptance listed above (CRUD, export, render, generation).
- Confirm all routes under `/modules/bunny-dev/**` render through the correct
  shell (main vs project) and that project nav highlights the active sub-module.
- Confirm cascade deletes leave no orphaned rows.

## Out of Scope (for this plan)

- Real backend/server persistence, auth, tenancy, or multi-user sync.
- Executing generated applications as standalone deployed apps.
- Streaming chat (only one-shot structured generation is planned here).
- Any refactor of existing modules or of `src/modules/bunny`/`admin-panel`.

## Open Questions

1. Exact bluish palette values (proposed: primary `#1976d2`, secondary `#0288d1`, dark surface `#0f172a`) — confirm or defer to Phase 12.
2. Whether App Rendering should generate a *separate* Dexie DB per generated app or reuse `BunnyDevDB` tables — proposed: reuse tables namespaced by `appId`; confirm in Phase 5.
