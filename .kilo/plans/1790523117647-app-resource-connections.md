# Bunny Dev — Three Deep "Module" Layouts (Schema, App Builder, Architecture)

## Goal

Add a third layout tier for deep, sub-entity routes so three feature families get a focused, standalone-app feel while keeping the Bunny Developer branding: sidebar/drawer title **"Bunny Dev"** and header title **"Bunny Developer"** (unchanged from the Main layout).

Current tiers:
- **Main** — `src/app/modules/bunny-dev/layout.tsx` → `BDShell` (`title: "Bunny Developer"`, `brand: "Bunny Dev"`).
- **Project** — `src/app/modules/bunny-dev/projects/[projectId]/layout.tsx` → `BDShell` (`title: project.name`, `brand: project.key`).

New tier: a per-feature **Module layout** wrapping sub-entity routes.

## Locked decisions

1. **Three families** — `schema` (Schema Builder), `app` (App Builder), `architecture` (Architecture).
2. **Route shape** — `/modules/bunny-dev/projects/[projectId]/{feature}/{id}`, where `feature ∈ {schema, app, architecture}` and `id` is `groupId` / `appId` / `architectureId`.
3. **Page content** — each deep page renders the existing feature component (`BDSchemaBuilderComponent` / `BDAppBuilderComponent` / `BDArchitectureBuilderComponent`), scoped to the entity via a new optional prop.
4. **Module shell** — same project module nav (`buildProjectNavItems(projectId)`) plus a `"Back to <Feature>"` wizard linking to the module root; sidebar brand **"Bunny Dev"**, header title **"Bunny Developer"**.
5. **No double shell** — the Project layout returns a bare wrapper for the three deep prefixes so the Module layout owns the shell.
6. **Entry points** — add an "Open" action/link on each entity in the three module roots.
7. **Scope** — no new per-entity views; the existing feature component is reused. Main/Project titles unchanged.

## Shared shell component

New `src/modules/bunny-dev/modules/shell/BDModuleLayout.tsx` (client), exported from `modules/shell/index.ts`:

```tsx
export interface BDModuleLayoutProps {
  projectId: string;
  feature: "schema" | "app" | "architecture";
  children: ReactNode;
}
```

- Reads the live project via `useBDProject(projectId)` for the sidebar profile (name), same as the Project layout.
- Builds a `BDShellConfig`:
  - `title: "Bunny Developer"`
  - `brand: "Bunny Dev"`
  - `logoutHref: "/modules/bunny-dev"`
  - `profile: { initials: "BD", name: project?.name ?? "Project", subtitle: "Local-first workspace" }`
  - `wizard: { label: `Back to ${label}`, href: `/modules/bunny-dev/projects/${projectId}${mod.path}` }`, resolving `label`/`path` from `BD_PROJECT_MODULES` where `mod.path === \`/${feature}\`` (the import is type-only on the shell side, so there is no runtime cycle).
  - `navItems: buildProjectNavItems(projectId)`
- Renders `<BDShell config={config}>{children}</BDShell>`.

## Routes

For each feature `<f>` in `schema` / `app` / `architecture`, add under `src/app/modules/bunny-dev/projects/[projectId]/<f>/`:

- `[<id>]/layout.tsx` — `"use client"`; `const { projectId } = use(params)`; render `<BDModuleLayout projectId={projectId} feature="<f>">{children}</BDModuleLayout>` inside `Suspense`.
- `[<id>]/page.tsx` — `"use client"`; `const { <id> } = use(params)`; render the feature component with its initial prop:
  - `schema/[groupId]/page.tsx` → `<BDSchemaBuilderComponent initialGroupId={groupId} />`
  - `app/[appId]/page.tsx` → `<BDAppBuilderComponent initialAppId={appId} />`
  - `architecture/[architectureId]/page.tsx` → `<BDArchitectureBuilderComponent initialId={architectureId} />`

Segment folder names: `[groupId]`, `[appId]`, `[architectureId]` (distinct; no collisions). They coexist with the existing `<f>/page.tsx` module roots.

## Project layout change

In `src/app/modules/bunny-dev/projects/[projectId]/layout.tsx`, add a deep-route detector:

```ts
const isDeepModuleRoute =
  /^\/modules\/bunny-dev\/projects\/[^/]+\/(schema|app|architecture)\/[^/]+(\/|$)/.test(pathname);
```

When true, return the bare provider wrapper (still wrap children in `BDProjectProvider` so `useBDProjectContext()` works in the feature components), matching the existing outer-layout "yield" pattern. Otherwise keep the current `BDProjectShell`.

## Feature component scoping

- `BDSchemaBuilderComponent` (`modules/schema-builder/BDSchemaBuilder.Component.tsx`): add optional `initialGroupId?: string`; initialize `activeGroupId` from it. The existing `resolvedGroupId` guard already falls back to the first group for an unknown id.
- `BDAppBuilderComponent` (`modules/app-builder/BDAppBuilder.Component.tsx`): add optional `initialAppId?: string`; a one-time effect selects the matching app from `apps` and calls `loadApp(...)`. Guard so it runs once (ref keyed by `initialAppId`) and never overrides a later manual selection.
- `BDArchitectureBuilderComponent` (`modules/architecture/BDArchitectureBuilder.Component.tsx`): add optional `initialId?: string`; a one-time effect sets `draft` from `records` once loaded (same guard).

Invalid/absent id → existing fallback (first schema group, or no selection for app/architecture). Pages stay mounted on the module root's own component; no new UI is introduced.

## Module-root entry links

- **Schema** — in the group switcher/list inside `BDSchemaBuilderComponent`, add an "Open" `ExternalLink` link per group to `/modules/bunny-dev/projects/${projectId}/schema/${group.id}`.
- **App Builder** — in the `BDList` app rows in `BDAppBuilder.Component.tsx`, add an "Open" row action (`useRouter().push`) to `/modules/bunny-dev/projects/${projectId}/app/${app.id}`.
- **Architecture** — in the `BDList` record rows in `BDArchitectureBuilder.Component.tsx`, add an "Open" row action to `/modules/bunny-dev/projects/${projectId}/architecture/${record.id}`.

## Ordered tasks

1. Create `modules/shell/BDModuleLayout.tsx` and export it from `modules/shell/index.ts`.
2. Update `projects/[projectId]/layout.tsx` with the deep-route detector and bare-wrapper branch.
3. Add `schema/[groupId]/layout.tsx` + `page.tsx`.
4. Add `app/[appId]/layout.tsx` + `page.tsx`.
5. Add `architecture/[architectureId]/layout.tsx` + `page.tsx`.
6. Add `initialGroupId` to `BDSchemaBuilderComponent`.
7. Add `initialAppId` to `BDAppBuilderComponent`.
8. Add `initialId` to `BDArchitectureBuilderComponent`.
9. Add the three module-root "Open" entry links.
10. Validate (below).

## Risks / edge cases

- **Double shell** — if the Project layout does not yield for the deep prefixes, two `BDShell`s and two sidebars render. The detector must match exactly the three feature prefixes at the sub-entity level (not the module roots).
- **Context missing** — the bare branch must still render `BDProjectProvider`, or the feature components' `useBDProjectContext()` fails.
- **Effect loops / overriding selection** — the app/architecture "select by id" effects must be once-only (ref-gated) so a user's later selection is not reset by live-query updates.
- **Active nav highlighting** — `BDShellSidebar` marks the matching module nav item active when `pathname.startsWith(href + "/")` and the href has ≥3 segments; the deep path starts with `/projects/[id]/<feature>`, so the correct module highlights. Verify after wiring.
- **Unknown id** — schema falls back to the first group; app/architecture show no selection. Acceptable; no 404 required.
- **Params** — Next 16 async params: use `use(params)` in both the layout and page (matching `projects/[projectId]/layout.tsx`).
- **Suspense** — wrap `use(params)` usages in `Suspense` with a small fallback, like the other layouts.

## Validation

- `npx tsc --noEmit` (or `tsc.cmd --noEmit` on Windows PowerShell) and `npm run lint`.
- Manual (dev `npm run dev`, `/modules/bunny-dev/projects/<id>/...`):
  1. Visit `/schema`, `/app`, `/architecture` — still render under the project shell exactly as before.
  2. Open an entity via the new "Open" link → deep route loads with the Module shell: sidebar/drawer brand "Bunny Dev", header "Bunny Developer", project module nav, and a "Back to <Feature>" wizard returning to the module root.
  3. The correct module nav item is highlighted; other modules still navigate correctly.
  4. The feature component shows the selected entity (schema group preselected; app preselected; architecture doc preselected).
  5. Only one sidebar/header renders on deep routes (no double shell).
  6. Unknown id in the URL does not crash.

## Out of scope

- Feature-specific sub-navigation or additional deep sections per module.
- Converting module roots into pure lists (inline selection/drawers stay).
- Changing Main/Project layout titles or the shared `BDShell` component itself.
