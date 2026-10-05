# Grouped List → Detail Pages (BunnyDev)

## Goal

Replace the combined "list + editor" (master-detail / three-section) pages in the BunnyDev
project workspace with a two-step navigation pattern:

- **Page 1 (feature root)** lists the top-level container with an **Open / View** button.
- **Page 2 (deep route)** shows only that container's content.

Applies to Schema, App Builder, API Design, Diagram, Architecture.
Diagram additionally gets a new **Diagram Group** level and a dedicated editor (3 levels).
Architecture gets a new **Architecture Group** level (2 levels).

## Decisions (confirmed with user)

1. **Diagram = 3 levels**: groups → diagrams list → diagram editor.
2. **Architecture = 2 levels**: add Architecture Groups; page 2 lists documents in the group and
   hosts the existing document editor + variants inline.
3. **Detail pages render in the normal project shell** (left module sidebar + full header), not the
   focused `BDModuleLayout`. Remove the deep-route shell special-casing.

## Target route map

| Feature | Page 1 (root) | Page 2 (deep) | Page 3 |
|---|---|---|---|
| Schema | `/schema` — schema groups + **Open** | `/schema/[groupId]` — models + editor drawer | — |
| App Builder | `/app` — apps + **View** | `/app/[appId]` — app editor | — |
| API Design | `/api` — API groups + **Open** | `/api/[groupId]` — operations + editor + Design/Mock/Document tabs | — |
| Diagram | `/diagram` — diagram groups + **Open** | `/diagram/[groupId]` — diagrams list + **Open** | `/diagram/[groupId]/[diagramId]` — editor |
| Architecture | `/architecture` — architecture groups + **Open** | `/architecture/[groupId]` — documents + editor + variants | — |

Container root paths (`/schema`, `/app`, `/api`, `/diagram`, `/architecture`) in
`BD_PROJECT_MODULES` are unchanged.

## Data model changes

### New groups

- `BDDiagramGroup` in `modules/diagram-builder/BDDiagram.Domain.ts`
  (`{ projectId, name, description?, position } extends BDEntity`).
- `BDArchitectureGroup` in `modules/architecture/BDArchitecture.Domain.ts` (same shape).
- Add `groupId?: string` to `BDDiagramRecord` and `BDArchitectureRecord`.

### Database (`BDDatabase.ts`)

- Add tables `diagramGroups`, `architectureGroups` (typed `Table<..., string>`) and repos
  `diagramGroupsRepo`, `architectureGroupsRepo`.
- Add cascade hooks: deleting a `diagramGroups` row deletes its `diagrams`; deleting an
  `architectureGroups` row deletes its `architectures`.
- Add `diagramGroups`, `architectureGroups` to `PROJECT_SCOPED_TABLES`.

### Migrations (`BDMigration.ts`) — current latest is v3

- **v4 — diagram groups**
  - `diagramGroups: "id, projectId, position"`
  - `diagrams: "id, projectId, type, groupId"`
  - `.upgrade`: for each project having diagrams without `groupId`, create one `Default` group and
    assign those diagrams (mirror the v2 API-group backfill using `uuidv7()`).
- **v5 — architecture groups**
  - `architectureGroups: "id, projectId, position"`
  - `architectures: "id, projectId, slug, type, status, groupId"`
  - `.upgrade`: same `Default` backfill for architectures lacking `groupId`.

### Repositories / hooks

- `BDDiagram.Repository.ts`: add `BDDiagramGroupRepository` (`listByProject` sorted by `position`,
  `createGroup`), export `bdDiagramGroupRepository`.
- `BDDiagram.Hooks.ts`: add `useBDDiagramGroups(projectId)` and
  `useBDDiagramsByGroup(groupId)` (filter by `groupId`, index it).
- `BDArchitecture.Repository.ts` / `.Hooks.ts`: add the equivalent group repository and
  `useBDArchitectureGroups`, `useBDArchitecturesByGroup`.
- Group form types (mirror schema/API): `BDDriveDiagramGroupForm`/`BDArchitectureGroupForm` +
  `_EMPTY` + `toGroupForm` in the module `*.Types.ts`; group modal components
  `BDDiagramGroup.Component.tsx` and `BDArchitectureGroup.Component.tsx` (copy the shape of
  `BDSchemaGroup.Component.tsx` / `BDApiGroup.Component.tsx`).
- Update each module `index.ts` to export the new group repo/hooks/components.

## Page 1 components (new list pages)

Each lists its container via the existing `BDList` component with a "New group/app" toolbar action,
an **Open/View** row action (links to the deep route), and rename/delete where applicable. After
creating a container, navigate to its detail route (`router.push`).

- `schema-builder/BDSchemaGroups.Component.tsx` → `BDSchemaGroupListComponent`
  (groups + New group + Open/Rename/Delete; row count = models in group).
- `app-builder/BDAppList.Component.tsx` → `BDAppListComponent`
  (apps + New app + AI Generate (create only) + View/Delete).
- `api-design/BDApiGroups.Component.tsx` → `BDApiGroupListComponent`
  (groups + New group + Open/Rename/Delete).
- `diagram-builder/BDDiagramGroups.Component.tsx` → `BDDiagramGroupListComponent`
  (groups + New group + Open/Rename/Delete).
- `diagram-builder/BDDiagrams.Component.tsx` → `BDDiagramListComponent`
  (diagrams for `[groupId]` + New diagram + AI Generate (create into group) + Open/Delete).
- `architecture/BDArchitectureGroups.Component.tsx` → `BDArchitectureGroupListComponent`
  (groups + New group + Open/Rename/Delete).

AI generation placement (keeps generation on the page that owns the generated entity):

- Schema → Page 1 (generates groups + models).
- App Builder → Page 1 (create-only; drop target selection).
- API → Page 2 (target = fixed group).
- Diagram → Page 2 (list of diagrams in group; create into group).
- Architecture → Page 2 (create documents into group).

## Page 2/3 component changes (existing builders become detail-only)

Remove the container list column from each; use the route param as the fixed container. If the
param id does not resolve, render `BDEmptyState` ("not found") with a back link to the list.

- `BDSchemaBuilder.Component.tsx` (`initialGroupId`): drop the groups sidebar; keep models table,
  Add model, model drawer, Export, ER Diagram, AI Generate (now page 1 → remove here), group
  header/description. Remove group create/rename/delete modals (moved to page 1).
- `BDAppBuilder.Component.tsx` (`initialAppId`): drop the apps list and AI panel; keep app metadata
  editor, resources, Design/Render toggle, Save, "Open as application". Remove create/delete app
  (moved to page 1).
- `BDApiDesign.Component.tsx` (`initialGroupId`): drop the API-groups column; keep tabs
  (Design/Mock/Document), operations list, editor, New API, AI Generate (target = fixed group).
  Remove group create/rename/delete (moved to page 1).
- `BDArchitectureBuilder.Component.tsx` (`initialGroupId`): filter `records` by `groupId`, add group
  header; keep documents list + inline editor + variants + AI Generate + New document. Set
  `groupId` when creating documents and variants; remove the per-row `/architecture/{id}` deep link.
- `BDDiagramBuilder.Component.tsx` (`initialDiagramId`): becomes the editor only — settings,
  nodes/edges, raw Mermaid source, preview/export, Save/Delete. Remove diagrams list, create modal,
  AI panel (moved to page 2 list). After delete, navigate to `/diagram/[groupId]`.

Add a "Back to <Module>" link at the top of every detail page (project shell has no wizard link).

## Routes

- Update page components to render the new Page 1 components:
  - `schema/page.tsx`, `app/page.tsx`, `api/page.tsx`, `diagram/page.tsx`,
    `architecture/page.tsx`.
- Add/rename detail routes:
  - `schema/[groupId]/page.tsx`, `app/[appId]/page.tsx`, `api/[groupId]/page.tsx` (exist; keep,
    they already pass the id).
  - Rename `architecture/[architectureId]` → `architecture/[groupId]/page.tsx`
    (pass `initialGroupId` to `BDArchitectureBuilderComponent`).
  - Add `diagram/[groupId]/page.tsx` → `BDDiagramListComponent`.
  - Add `diagram/[groupId]/[diagramId]/page.tsx` → `BDDiagramBuilderComponent initialDiagramId`.
- **Delete** the deep-route focused layouts (no longer needed):
  `schema/[groupId]/layout.tsx`, `app/[appId]/layout.tsx`, `api/[groupId]/layout.tsx`,
  `architecture/[architectureId]/layout.tsx`.
- Dynamic route params are Promises in this Next version — keep the existing `use(params)` pattern.
  Do not add new `layout.tsx` files for the new diagram routes.

## Shell changes

- `projects/[projectId]/layout.tsx`: always render `BDProjectShell`; remove `isDeepModuleRoute`,
  the `usePathname` import/logic, and the regex comment. `BDProjectProvider` wrapping stays.
- Since no route uses `BDModuleLayout` anymore, delete
  `modules/shell/BDModuleLayout.tsx` and its exports in `modules/shell/index.ts`
  (remove `BDModuleLayout`, `BDModuleLayoutProps`, `BDModuleFeature`).
- `/render/[appId]` is unaffected.

## Edge cases / failure modes

- Legacy rows without `groupId` are backfilled to a per-project `Default` group (v4/v5 upgrade).
- A detail route with an unknown/empty id shows a not-found empty state, not the list.
- Deleting a group cascades to its children (Dexie hook); deleting all groups leaves page 1 empty.
- Architecture variant creation must carry the base document's `groupId`; variant list stays scoped
  to the current draft.
- Diagram editor "Delete" must navigate back to the group's list page.
- Schema AI `applyArtifact`: on page 1 `activeGroup` is undefined, so append/create create groups and
  replace deletes all groups then recreates — preserve current logic; drop the trailing
  `setActiveGroupId(undefined)`.

## Validation

1. `npx tsc --noEmit` (no typecheck script exists; `tsc` is pre-approved).
2. `npm run lint`.
3. Manual (run `npm run dev`, port 3050), for each feature:
   - Page 1 shows only the container list with Open/View; New + (where applicable) AI Generate work.
   - Open navigates to the deep route under the **normal project shell** (sidebar visible, no
     "Back to X" wizard).
   - Page 2 shows only that container's content; invalid id shows not-found.
   - Reload a deep URL directly (deep-link) — page 2 renders standalone, page 1 has no detail panes.
   - Diagram: group → diagram list → editor; save/export/delete and back navigation work; AI
     generation lands in the correct group.
   - Architecture: group → documents; migration backfills existing documents into `Default`.
   - Deleting a group removes its children.

## Out of scope

- Changes to `/render/[appId]` standalone renderer.
- Board, Outline, Files, Agents, Settings modules.
- Any cloud/API persistence changes (remains local-first Dexie).
