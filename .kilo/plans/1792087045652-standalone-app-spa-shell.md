# Standalone App: New-Tab Open + SPA Shell (Header / Sidebar / Table)

## Goal

1. **"Open as application" opens in a new browser tab** from all 3 entry points in the app designer.
2. **The standalone render route (`/modules/bunny-dev/render/[appId]`) looks like a real SPA**: fixed header, collapsible + responsive sidebar, and a visually improved data table. The designer's embedded Render preview keeps its current chrome (no header/sidebar shell).

## Decisions (confirmed with user)

- All 3 call sites (title-bar **Open** button, **File → Open as application**, Overview **Open as application**) open a new tab via `window.open(url, "_blank", "noopener")`.
- Table: **hand-rolled, visual polish only** — no sorting, no pagination (user rejected `BDList`).
- SPA shell applies to **standalone only**; embedded preview layout untouched.
- Header: brand logo/name + breadcrumb (`App / Resource`) + sidebar toggle + **Designer** button (navigates current tab back to the builder).
- Sidebar: `w-56` expanded, collapses to `w-12` icon rail; below `md` it becomes an overlay drawer toggled from the header; footer shows record count + app path.
- **No URL deep-linking** of the selected resource — stays in component state.
- Dark mode keeps the existing mechanism: `standaloneStyle` CSS vars + `data-bd-theme` attribute (already handled by `[data-bd-theme="dark"]` rules in `BDStyle.css`).
- The improved table markup lives in the shared resource-page render path, so the embedded preview also gets the nicer table (the *shell* remains standalone-only).
- Create/edit/view/relation/AI modals stay as-is (`BDModal`, `fixed inset-0 z-50`).

## Implementation Steps

### 1. Open in a new tab — `BDAppBuilder.Component.tsx`

Add a local helper near the top of `BDAppBuilderComponent`:

```ts
const openAppInNewTab = (appId: string) =>
  window.open(`/modules/bunny-dev/render/${appId}`, "_blank", "noopener");
```

Replace `router.push(\`/modules/bunny-dev/render/${draft.id}\`)` with `openAppInNewTab(draft.id)` at:

- File menu item `"Open as application"` (~line 489)
- Title-bar `Open` action button (~line 583)
- Overview `onOpenApp` prop (~line 677)

Do **not** touch the other `router.push` calls (Back to App Builder / onBack).

### 2. Full-bleed SPA layout — `src/app/modules/bunny-dev/render/[appId]/layout.tsx`

Change the wrapper from `min-h-screen bg-[#f4f7fb] p-4 md:p-6` to a viewport-filling, non-scrolling container:

```tsx
<div className="h-dvh overflow-hidden bg-[#f4f7fb]">{children}</div>
```

(The page itself becomes a `h-full` flex column; only the content pane scrolls.)

### 3. New component — `BDAppStandaloneShell.Component.tsx`

Presentational shell in `src/modules/bunny-dev/modules/app-builder/`, modeled on `BDAppBuilderShell` / `BDAppBuilderSidebar` conventions (`cn` from `@heroui/react`, lucide icons, slate tokens, `bd-scroll`).

Props:

- `brand: { name: string; logo?: string }`
- `breadcrumb: string[]` (e.g. `[appName, resourceLabel]`)
- `resources: { slug: string; label: string }[]`, `activeSlug?: string`, `onSelect(slug)`
- `sidebarCollapsed: boolean`, `onToggleCollapse()`
- `drawerOpen: boolean`, `onToggleDrawer()` (mobile)
- `stats: ReactNode` (sidebar footer: record count · path)
- `actions?: ReactNode` (right side of header — Designer button passed by caller)
- `style?: CSSProperties`, `data-bd-theme?: string` (theme vars passed through to root)
- `children` (resource page)

Structure:

- **Root**: `flex h-full flex-col` with theme style/data attributes.
- **Header** `h-12 shrink-0 border-b bg-white px-3 flex items-center gap-2`:
  - Hamburger button (`Menu` icon) visible only below `md` — toggles drawer.
  - Logo `<img>` (or `LayoutGrid` fallback) + brand name (`font-semibold text-sm`), `max-w truncate`.
  - Divider + breadcrumb: current resource label in `text-slate-500` (`App / Resource`).
  - Right: `PanelLeft` sidebar toggle (`md+` only) + caller-provided `actions`.
- **Body** `flex min-h-0 flex-1`:
  - Sidebar:
    - `md+`: `w-56` expanded (`border-r bg-slate-50`, "Resources" section header, items with `LayoutGrid` icon + label, active = `bg-[#e3f2fd] text-[#1565c0]`, hover states) or `w-12` icon rail (2-letter initials per resource, `title` tooltips) when collapsed.
    - Below `md`: hidden by default; when `drawerOpen` render as fixed overlay (`fixed inset-y-0 left-0 z-40 w-64`) with a backdrop div that closes it. Selecting a resource closes the drawer.
    - Footer (expanded only): `border-t px-3 py-2 text-[11px] text-slate-500` with `stats`.
  - Content: `flex min-w-0 flex-1 flex-col` → `bd-scroll min-h-0 flex-1 overflow-y-auto` wrapping `children`.
- Export named + default; add to `index.ts` alongside the other shell exports.

> Note: keep `transform`/`filter`/`backdrop-filter` off shell ancestors so `BDModal`'s `fixed inset-0` overlay stays viewport-anchored.

### 4. Refactor `BDAppRendering.Component.tsx`

- Keep all state/CRUD logic in this component.
- **Standalone branch** (`standalone === true`): render `<BDAppStandaloneShell>` with:
  - `brand` from `app.brand?.name || app.name` / `app.brand?.logo`
  - `breadcrumb={[brandName, activeResource label]}`
  - resources + `resolvedSlug` + `onSelect` (existing `setActiveSlug` + `setQuery("")`)
  - `sidebarCollapsed` / `drawerOpen` state (new `useState`s, standalone-only)
  - `stats` = `${allRecords.length} records · ${app.path}`
  - `actions` = Designer `BDButton` (`icon={ExternalLink}`, `router.push(\`/modules/bunny-dev/projects/${app.projectId}/app/${appId}\`)`) — replaces the current "Back to metadata" card
  - theme passthrough (`standaloneStyle`, `data-bd-theme`) on the shell root
  - `style={standaloneStyle}` moves off the inner div onto the shell.
- Remove the current standalone white header card (lines ~452–487) and the `!embedded && !standalone` card stays for non-standalone routes only.
- **Embedded branch**: unchanged markup (`grid lg:grid-cols-[14rem_1fr]` nav + resource page).
- Loading / not-found states: when `standalone`, center them in the viewport (`flex h-full items-center justify-center`) instead of top-left `<p>Loading app…</p>`.

### 5. Improved table (shared resource-page markup)

In the table rendered by `BDAppRenderingComponent` (used by both standalone and preview):

- **Sticky header**: scroll container keeps `bd-scroll overflow-x-auto`; `<thead className="sticky top-0 z-10">` with `bg-slate-50` on `<tr>` (bg must be on the row, not `<thead>`, for sticky correctness), subtle `shadow-[0_1px_0_0_#e2e8f0]`.
- **Rows**: `border-t border-slate-100 transition-colors hover:bg-blue-50/40`, optional `even:bg-slate-50/40` banding.
- **Cells**: `px-3 py-2.5 text-slate-700 align-middle`; for plain-text values render in a `<span className="block max-w-[18rem] truncate" title={raw}>` so long text never blows out the row width (badges/badges arrays keep wrapping behavior).
- **Header cells**: `text-[11px] font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap`.
- **Actions column**: `w-28`, right-aligned; keep Eye/Pencil/Trash2 buttons but add `title` + `aria-label` tooltips and `hover:bg-slate-100 rounded p-1.5` hit areas (`text-slate-400 hover:text-blue-600`, delete `hover:text-red-500`).
- **Footer strip** under the table: `border-t border-slate-100 px-3 py-2 text-[11px] text-slate-500` → `{rows.length} of {allRecordsForSlug.length} records` (reflects active search filter).
- Keep the existing toolbar (resource label, record count, search input, Create button) — it now sits directly under the header/breadcrumb.
- Keep `BDEmptyState` for zero rows.

### 6. Exports — `index.ts`

Add `export { BDAppStandaloneShell } from "./BDAppStandaloneShell.Component";`.

## Files Touched

| File | Change |
|---|---|
| `BDAppBuilder.Component.tsx` | EDIT — 3 `router.push(render)` call sites → new tab |
| `src/app/modules/bunny-dev/render/[appId]/layout.tsx` | EDIT — `h-dvh overflow-hidden` full-bleed |
| `BDAppStandaloneShell.Component.tsx` | NEW — SPA header + responsive/collapsible sidebar shell |
| `BDAppRendering.Component.tsx` | EDIT — use shell in standalone branch, improved table, centered loading states |
| `index.ts` | EDIT — export new shell |

## Validation

1. `npx tsc --noEmit` then `npm run lint`.
2. `npm run dev` (port 3050), open a designed app:
   - All 3 "Open as application" entry points open `/modules/bunny-dev/render/{id}` in a **new tab**; designer stays put.
   - Standalone route: header + sidebar fill the viewport, only the content pane scrolls; sidebar collapses to icon rail (`PanelLeft`) and becomes a hamburger drawer below `md`.
   - Breadcrumb shows `App / Resource`; **Designer** button returns to the builder in the same tab.
   - Table: sticky header while scrolling, hover rows, truncated long values with tooltip, footer row count updates when searching.
   - Create / Edit / View / Delete / relation child editor / AI fill all still work (modals anchored to viewport, not the shell).
   - App with `theme.mode = "dark"` still renders dark (`data-bd-theme`), including new header/sidebar surfaces.
   - Designer → Render preview tab is visually unchanged (no header/sidebar shell) but gets the improved table.
3. Responsive check at 375px, 768px, 1440px widths.

## Risks / Notes

- No route changes: `/render/[appId]` only, resource selection stays in state (per user decision).
- `window.open` may be blocked by popup blockers only if triggered outside a user gesture — all 3 call sites are click handlers, so it is safe.
- `overflow-hidden` on the new render layout does not clip `fixed` modals (no transformed ancestors allowed in the shell).
- Large record sets: table stays unpaginated by design; sticky header + truncation is the mitigation.
