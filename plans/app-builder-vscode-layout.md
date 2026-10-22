# App Builder — VSCode-Style Layout Redesign

## Goal

Redesign the app designer page ([`BDAppBuilder.Component.tsx`](src/modules/bunny-dev/modules/app-builder/BDAppBuilder.Component.tsx)) from a vertical stacked page into a **VSCode / Windows-app style shell** with a slim top menu bar, a left explorer sidebar, and a large workspace area with **inline resource tabs**. App settings open as a **modal from a sub-menu**, not as an always-visible card.

## Current Problems

1. Big `BDPageHeader` + always-visible metadata card consume ~40% of the screen before any real content.
2. Resource editor opens as a `BDModal` overlay — no app context while editing.
3. Resources are a plain stacked list with no persistent navigation.
4. Everything scrolls vertically; no fixed chrome.

## Target Layout

```
┌──────────────────────────────────────────────────────────────────┐
│ TITLE BAR (h-10, slim)                                           │
│ [icon] AppName ▾   File  Edit  View          [Save] [Open ↗] [AI] │
├────────────┬─────────────────────────────────────────────────────┤
│ SIDEBAR    │  TAB BAR (h-9)                                      │
│ (w-56,     │  [Product ×] [Order ×] [+ New]        [Design|Render]│
│ collapsible│─────────────────────────────────────────────────────│
│ to icons)  │  WORKSPACE (flex-1, scrollable)                     │
│            │                                                     │
│ EXPLORER   │   Active resource editor (inline, full height)      │
│ ▾ Resources│   or Render preview (when Render mode active)       │
│  • Product │                                                     │
│  • Order   │                                                     │
│  [+ New]   │                                                     │
│            │                                                     │
│ ▾ App      │                                                     │
│  Overview  │                                                     │
│  Settings  │  ← opens settings modal                             │
├────────────┴─────────────────────────────────────────────────────┤
│ STATUS BAR (h-6): 3 resources · Unsaved changes ● · v1.0         │
└──────────────────────────────────────────────────────────────────┘
```

### Decisions (confirmed with user)

- **Resource editor**: inline tabs in the workspace (VSCode editor tabs), NOT a modal.
- **App metadata**: opens as a **modal dialog** triggered from the sidebar "Settings" item and/or the top menu — not always visible.

## Implementation Steps

### 1. Create the shell component — `BDAppBuilderShell.Component.tsx` (new file)

A presentational layout wrapper in `src/modules/bunny-dev/modules/app-builder/`:

- Props: `title`, `menuItems`, `sidebar`, `tabs`, `activeTab`, `onTabChange`, `onCloseTab`, `statusBar`, `children`, `actions`.
- Structure:
  - **Title bar** (`h-10 border-b`): app icon + name, compact menu labels (File / Edit / View style — each opens a small dropdown), right-aligned action buttons (Save, Open as application, AI Generate).
  - **Body** (`flex flex-1 min-h-0`): sidebar slot + workspace slot.
  - **Status bar** (`h-6 border-t text-[11px]`): resource count, save state dot.
- The shell fills the viewport: `h-[calc(100vh-…)]` or `min-h-0` flex column inside the existing page container.

### 2. Create the sidebar — `BDAppBuilderSidebar.Component.tsx` (new file)

- **Resources section** (like VSCode explorer): list of resources with icon + label, click selects/opens the resource tab; hover shows edit/delete icon buttons; "+ New resource" row at the bottom of the section.
- **App section**: "Overview" (opens overview tab) and "Settings" (opens the settings modal).
- Collapsible: chevron toggles sections; sidebar itself can collapse to a narrow icon rail (`w-12`) with a toggle button in the title bar.

### 3. Create the tab bar — `BDAppBuilderTabs.Component.tsx` (new file)

- Horizontal tab strip: one tab per **open** resource (open tabs tracked in state, like VSCode open editors), each with a close `×`.
- `+` button opens the new-resource flow.
- Right side: Design/Render segmented toggle (compact, replaces the current pill buttons).
- Active tab styling: top border accent + bold label (VSCode style).

### 4. Refactor `BDAppBuilder.Component.tsx`

- Remove: `BDBackLink`, `BDPageHeader`, the always-visible metadata card (lines ~303–449), the stacked resource list (lines ~451–517).
- Add state:
  - `openTabs: string[]` (resource slugs currently open) and `activeTab: string | null` (slug, or `"overview"` / `"render"`).
  - `settingsOpen: boolean` for the settings modal.
  - `sidebarCollapsed: boolean`.
- Behavior:
  - Clicking a resource in the sidebar opens its tab (adds to `openTabs` if not open) and activates it.
  - Closing a tab activates the neighbor tab.
  - Render mode shows `BDAppRenderingComponent` embedded in the workspace (full height, no tab strip or with a single "Preview" tab).
- Keep all existing logic unchanged: `handleSaveApp`, `saveResource`, `deleteResource`, `applyDesignAI`, `applyAppMetaFiller`, deep-link loading (`initialAppId`), dialogs (`BDAppResourceAIComponent`, `BDAppFillerComponent`, `BDConfirmDialog`).

### 5. Convert the resource editor to inline — `BDAppResource.Component.tsx`

- Add a `variant?: "modal" | "inline"` prop (default `"modal"` to avoid breaking other usages).
- In `inline` mode: render the editor body directly (no `BDModal` wrapper) — identity section, form fields, table columns, connections — with a compact sticky footer (Save / Delete) inside the workspace panel.
- The builder passes `variant="inline"` and renders it inside the active tab panel.

### 6. Settings modal — reuse existing pieces

- New small component `BDAppSettingsModal.Component.tsx` (or reuse `BDModal` directly in the builder): contains the metadata fields currently in the always-visible card (Name, Slug, Path, Description, Brand name, Logo URL, Theme mode, Primary color) plus the "Fill details" (`BDAppFillerComponent`) shortcut.
- Opened from: sidebar "Settings" item and the title-bar menu (e.g. File → App settings…).
- Changes apply live via the existing `updateMeta` handler; Save app persists.

### 7. Status bar

- Left: `{n} resources · {m} open tabs`.
- Right: save state (`Saved ✓` / `Unsaved changes ●` — compare `draft` against last-saved snapshot or track a `dirty` flag on `update()`), and app slug/path.

### 8. Styling conventions

- Match existing BD design tokens: `border-slate-200`, `bg-white`, `text-slate-*`, rounded-lg; slim bars use `text-xs`/`text-[11px]`.
- Icons from `lucide-react` (already used): `PanelLeft`, `Save`, `ExternalLink`, `Plus`, `X`, `Settings`, `Sparkles`, `Eye`, `Pencil`.
- No new dependencies.

## Files Touched

| File | Change |
|---|---|
| `BDAppBuilderShell.Component.tsx` | NEW — shell layout (title bar, body, status bar) |
| `BDAppBuilderSidebar.Component.tsx` | NEW — explorer sidebar |
| `BDAppBuilderTabs.Component.tsx` | NEW — workspace tab strip |
| `BDAppSettingsModal.Component.tsx` | NEW — settings modal (metadata fields) |
| `BDAppBuilder.Component.tsx` | REFACTOR — remove stacked layout, wire shell + tabs + inline editor |
| `BDAppResource.Component.tsx` | EDIT — add `variant="inline"` mode |
| `index.ts` | EDIT — export new components |

## Risks / Notes

- Deep-link route `projects/[projectId]/app/[appId]` keeps working — `initialAppId` loading logic is untouched.
- `BDAppResourceComponent` modal variant stays for any other callers; only the builder switches to inline.
- Render preview keeps using `BDAppRenderingComponent embedded` — just placed in the workspace area instead of below the metadata card.
- Unsaved-changes detection: simplest approach is a `dirty` boolean set in `update()`/`updateMeta()` and cleared in `handleSaveApp`.
