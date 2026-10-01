# App Builder Plan (tasks 1–5)

Module: `src/modules/bunny-dev/modules/app-builder`.
Source: `tasks.yaml` lines 2–34.

## Goal

1. "Render as application" opens a standalone app layout outside the builder with a back-to-metadata control.
2. AI-generated `select` fields include options.
3. View/relationship rendering matches Laravel Filament relation-manager semantics.
4. Rendered-app records persist in a separate database.
5. Add standalone-app metadata (title, brand, theme) that configures rendering.

## Decisions (locked)

- Standalone route: `src/app/modules/bunny-dev/render/[appId]/page.tsx`, outside the project shell.
- Separate DB: second Dexie database `BunnyDevAppDB` owns `appRecords`; app definitions stay in `BunnyDevDB`.
- Relationship depth: full relation managers (1:many inline CRUD, m:n attach/detach/reorder, 1:1 inverse, searchable selects, infolist view).
- Record writes always go to the app DB; legacy rows are copied once (non-destructive).

## Key files

- Domain/types: `BDApp.Domain.ts`, `BDApp.Types.ts`
- Engine: `BDAppRendering.Component.tsx`, `BDAppBuilder.Component.tsx`, `BDAppBuilder.Server.ts`
- Data: `../../BDDatabase.ts`, `../../BDMigration.ts`, `BDApp.Repository.ts`, `BDApp.Hooks.ts`
- Route shell: `src/app/modules/bunny-dev/layout.tsx` (outer), `BDModuleLayout.tsx`
- Reuse: `components/BDSchemaForm.tsx`, `BDForm.tsx`, `BDModal.tsx`, `BDButton.tsx`

---

## T1 — Render as application (standalone route)

Steps:
1. Add `src/app/modules/bunny-dev/render/[appId]/page.tsx` (`"use client"`): unwrap `appId` via `use(params)`; render `<BDAppRenderingComponent appId={appId} embedded={false} standalone />`.
2. Add `src/app/modules/bunny-dev/render/[appId]/layout.tsx` (optional) and update `src/app/modules/bunny-dev/layout.tsx` `isInnerRoute` test (lines 51–53) to also treat `/modules/bunny-dev/render/...` as a bare route (no `BDShell`). This is what makes it truly standalone while keeping `BDAISettingsProvider` + `BDToastProvider`.
3. In `BDAppRendering.Component.tsx`:
   - Add `standalone?: boolean` prop. When true, expand the header (lines 445–455) into an app chrome bar showing `app.name`/brand title and a "Back to metadata" `BDButton` (icon `ArrowLeft`) that `router.push(\`/modules/bunny-dev/projects/${app.projectId}/app/${appId}\`)`.
   - Keep resource nav visible; when `standalone`, remove the designer-specific footer (lines 682–686).
4. In `BDAppBuilder.Component.tsx` "Render" button (lines 357–367): keep preview, but add an "Open as application" action (icon `ExternalLink`) that routes to `/modules/bunny-dev/render/${draft.id}`. Keep the existing row "Open" action.
5. Document title: in the standalone page set `document.title = brand title` via `useEffect`.

Acceptance: standalone route renders the CRUD engine with no bunny-dev sidebar; back button returns to the builder metadata; preview still works inside the designer.

## T2 — AI generates select field options

Steps:
1. `BDAppBuilder.Server.ts` `APP_DSL` field schema (lines 63–76): add
   ```
   options: { type: "array", description: "Allowed options; required when type is select, multiSelect, radio, checkboxList or toggleButtons.", items: { type: "object", properties: { value: {type:"string"}, label: {type:"string"} } } }
   ```
2. `normalizeField` (lines 141–152): parse `options` into `{ value, label }[]` (default label = value), keep array only when non-empty.
3. `BDApp.Types.ts` `BDAppFieldDraft` (lines 347–352): add `options?: { value: string; label: string }[]`.
4. `BDAppBuilder.Component.tsx` `toAppField` (lines 49–62): convert draft options to `Record<string,string>` on the produced `BDAppField` (the domain stores `options?: Record<string,string>` at `BDApp.Domain.ts` line 234).
5. Mirror the schema-builder precedent (`fieldFromProperty` in `BDApp.Types.ts` lines 142–155 already maps enum `values` → options). Also update the AI prompt/system text to say option-bearing types must supply options.
6. Confirm consumers: `BDSchemaForm.toOptions` (lines 57–62) and `BDForm` select/multiSelect (lines 189–243). Verify `tags` (checkboxList) reads options — if not, extend `BDSchemaForm` mapping.

Acceptance: generating an app whose resource has a `select` yields populated options in render/create/edit forms.

## T3 — Filament-style relationship rendering (view mode)

Domain/type additions (`BDApp.Domain.ts`, `BDApp.Types.ts`):
1. Extend `BDAppConnection` (lines 192–210) with: `inverseName?: string`, `pivotAttributes?: string[]`, `relationManager?: { searchable?: boolean; perPage?: number }`, and allow `type` for 1:1 inverse sections (existing union already covers `oneToOne`).
2. Add `derived` helpers for inverse sections: given a connection on the owner, find the target's matching field/connection and render a section.

Engine (`BDAppRendering.Component.tsx`):
3. Extract the existing `renderConnectionSection` (lines 315–440) into `BDAppRelationManager.Component.tsx` so it is reusable and testable.
4. `oneToMany`: keep inline create/edit/delete; add client pagination + a "Search" input (Filament RelationManager parity) using `relationManager.perPage`.
5. `manyToMany`: add Attach/Detach — Attach opens a searchable record picker (multi-select) that appends target ids to `viewing.data[key]`; Detach removes ids; add Reorder (up/down) persisting array order.
6. `oneToOne`: render an inverse section (read-only summary + "Open"/"Edit" link) instead of returning `null` (current line 333–335).
7. View modal (lines 616–643): if `activeResource.infolist` exists, render infolist entries; otherwise fall back to derived fields. Render all connection managers (remove the filter that drops `oneToOne`, lines 635–641).
8. Searchable relation selects: add `searchable?: boolean` to `BDAppRelation`/field relation and support filtering in `BDForm` `relationSelect` (async/large option safety).

Acceptance: view modal shows relation managers for all three connection types; m:n supports attach/detach/reorder; 1:1 shows inverse; relation selects are searchable.

## T4 — Separate database for rendered application

Steps:
1. Add `src/modules/bunny-dev/BDAppDatabase.ts`:
   - `class BDAppDatabase extends Dexie { appRecords!: Table<BDAppRecord,string>; appRecordsRepo }`, `super("BunnyDevAppDB")`.
   - Register its own version 1 store `appRecords: "id, appId, projectId, resourceSlug"` (local `configureBDAppMigrations`).
   - Export singleton `bdAppDB`.
2. Add `BDApp.Repository.ts` `BDAppRecordRepository` to take `bdAppDB.appRecords` instead of `bdDB.appRecords`.
3. Switch every record read/write to the app DB:
   - `BDApp.Hooks.ts` `useBDAppRecords` (line 28) and `BDAppRendering.Component.tsx` live query (line 65).
   - `BDAppRendering.Component.tsx` writes (lines 209, 216, 250, 257, 269) via `bdAppRecordRepository` (already abstracted).
4. Non-destructive legacy copy: add `migrateLegacyAppRecords()` in `BDAppDatabase.ts` that, when `bdAppDB.appRecords.count() === 0` and `bdDB.table("appRecords")` exists, copies all rows into `bdAppDB`; call it (guarded once) from the render page and builder mount. Keep the legacy store in `BDDatabase.ts`/`BDMigration.ts` dormant (no destructive schema change).
5. Cascades across DBs:
   - App delete (`BDAppBuilder.Component.tsx` lines 131–145) must also `bdAppDB.appRecords.where("appId").equals(id).delete()`.
   - Resource delete (`BDAppBuilder.Component.tsx` lines 164–174) must delete records for that `resourceSlug`.
   - Project delete: add an app-DB cleanup for the project (e.g. in `BDProjectList` delete handler or a shared helper) since Dexie hooks cannot span databases.
6. Update the stale comment at `BDAppRendering.Component.tsx` lines 6–8 ("no per-app database").

Acceptance: rendered records live only in `BunnyDevAppDB`; deleting app/resource/project removes them; existing local records survive the switch via the one-time copy.

## T5 — Standalone app metadata configuration

Steps:
1. `BDApp.Domain.ts` `BDApp` (lines 597–618): add `description?: string`; reuse existing `brand` (`BDAppBrand`), `theme` (`BDAppTheme`), `colors`.
2. `BDApp.Types.ts` `BDAppForm` (lines 22–32) and `BD_APP_EMPTY_FORM`: add `description`, `brandName`, `logoUrl`, `themeMode`, `primaryColor`. Update `createApp` (331–339) and `toAppForm` (341–343).
3. `BDAppBuilder.Component.tsx` metadata panel (lines 374–415): add inputs for the new fields; `handleSaveApp` (120–129) persists them. AI `applyArtifact` (176–235) may set defaults.
4. Consume in the standalone render (T1): app chrome title = `brand.name || app.name`, description, logo, and apply `theme`/`colors` as scoped CSS variables or Tailwind classes on the standalone root only (do not restyle the designer).

Acceptance: editing metadata changes the standalone app title/brand; designer preview unchanged.

---

## Risks

- `BDAppRendering.Component.tsx` is monolithic; extract relation manager carefully to avoid breaking embedded preview.
- Cross-DB cascades are manual; missing one leaves orphaned records. Centralize cleanup in a helper on `bdAppDB`.
- Filament parity is broad; `infolist` and `pages`/`widgets` are partially inert today — this plan wires `infolist` in view mode only.
- Next.js route/layout behavior differs in this repo; read `node_modules/next/dist/docs/` before adding the render layout.

## Validation

- `bun run build` and `npm run lint` pass.
- Create app, add resources/connections, render as application; verify back navigation and standalone chrome.
- Generate via AI and confirm select options; view modal relation managers for 1:1/1:n/m:n; m:n attach/detach/reorder.
- Inspect IndexedDB: `BunnyDevAppDB.appRecords` populated; `BunnyDevDB.appRecords` no longer written.
- Reload page and confirm persistence; delete app/resource/project and confirm cleanup.
