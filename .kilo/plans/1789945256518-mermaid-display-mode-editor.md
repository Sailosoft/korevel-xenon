# Mermaid Display Mode: View/Edit Toggle + Visual Mermaid Editor

## Goal

When a `.mermaid` / `.mmd` file is shown in "Diagram" (file) display mode in Lemon Coder, add a **View | Edit** segmented control at the **top-right of the view area**. Edit opens a new component `LCFileView.DisplayMode.Mermaid.tsx`, modeled on `LCFileView.DisplayMode.Csv.tsx`, providing:

- A **diagram-type template picker** (Flowchart, Sequence, Class, State, ER, Gantt, Pie, Journey, Mindmap, Timeline)
- An **editor mode switch**: Text | Split (text + live preview) | Visual (overlay node editing) | Layout (free-position canvas)
- Visual/Layout modes are flowchart-only; other diagram types fall back to Text/Split
- When layout metadata exists in the file, **View mode also uses the custom positioned canvas** (WYSIWYG)

## Confirmed decisions

| Decision | Choice |
|---|---|
| Visual editing depth | Overlay editing on rendered diagram + optional free-layout mode |
| "Choose type of editor" | Both: diagram-type template picker AND Text/Split/Visual mode switch |
| Layout persistence / WYSIWYG | Positions stored as a `%% lc-layout:{json}` comment in the file; custom canvas renderer used in the editor AND in View mode when metadata is present |

## Context (verified in codebase)

- `src/modules/lemon-coder/src/LCFileView.DisplayMode.tsx:355-373` — "file" mode branch; CSV already routes to its editor component; mermaid currently falls through to read-only `RenderView`.
- `src/modules/lemon-coder/src/LCFileView.tsx:207-244` — existing Source | Diagram header toggle (stays unchanged).
- `src/modules/lemon-coder/src/LCFileView.DisplayMode.Csv.tsx` — pattern to copy: props `{ content, onContentChange, onSave, fileName }`, toolbar + status bar, undo/redo snapshot stacks (`MAX_HISTORY = 50`), re-parse on external `content` change via `lastEmittedRef`, dark palette `COLORS` constants.
- `MermaidRenderer` is exported from `@/src/modules/render` (`src/modules/render/src/components/index.ts:6`) — pan/zoom, error UI, `suppressErrorRendering`. Reuse it for previews; wrap it in a `ref` div and query the injected `<svg>` for overlay hit regions.
- `mermaid@11` in package.json; **no** graph-canvas dependency exists. Do NOT add new dependencies — build the canvas custom.
- `isMermaidFile()` already exists in `LCFileView.DisplayMode.tsx:79-82` (ext `mermaid` | `mmd`).
- Auto-save already handled by `LCFileView.tsx` debounce; the editor just calls `onContentChange` + `onSave` on each commit (same as CSV).

## Tasks

### 1. Create `src/modules/lemon-coder/src/LCFileView.DisplayMode.Mermaid.tsx`

Component `LCFileViewDisplayModeMermaid`, props identical to the CSV component. Internal state:

- `mode: "view" | "edit"` (default `"view"`), persisted per-file in `lcDB.appSettings` key `mermaid.lastMode` (optional; default view if absent)
- `editPane: "text" | "split" | "visual" | "layout"` (default `"split"`)
- `diagramType: string` — derived from content header; editable via dropdown

**Toolbar** (h-9, `#252526`, mirroring CSV toolbar):
- Left: `FileCode`/diagram icon + fileName + diagram-type `<select>` (dark-styled)
- Right: **View | Edit** segmented control (same visual style as the Source|Diagram toggle in `LCFileView.tsx:209-243`)

**View mode**:
- Parse content for `%% lc-layout:` metadata. If present and diagram is a flowchart → render `LayoutCanvas` (read-only, pan/zoom). Otherwise → `<MermaidRenderer chart={content} />`.

**Edit mode**:
- Pane switch buttons: Text | Split | Visual | Layout. Visual/Layout disabled (tooltip "Visual editing supports flowcharts only") when header is not `graph`/`flowchart`.
- Text/Split: reuse the existing editor choice — read `editor.useCodeMirror` from `lcDB.appSettings` (pattern at `LCFileView.DisplayMode.tsx:336-340`) and render `LCCodeMonacoEditor` (default) or `LCCodeMirrorEditor` with `language="mermaid"` (falls back to plaintext). Split shows the editor left, live `MermaidRenderer` preview right (50/50, `flex-row`).
- Visual: see task 3. Layout: see task 4.
- Status bar like CSV: "Saved HH:MM:SS" / hint text.

**Emit pattern**: every commit does `lastEmittedRef.current = next; onContentChange(next); onSave(); setLastSavedAt(new Date())`. Re-sync from external `content` changes exactly like CSV (`useEffect` comparing `lastEmittedRef`). Undo/redo: text-snapshot stacks (`MAX_HISTORY = 50`), Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y, shared across all edit panes; skip when focus is inside INPUT/TEXTAREA (copy CSV handler at `LCFileView.DisplayMode.Csv.tsx:259-285`).

### 2. Flowchart text model (same file or `LCFileView.DisplayMode.Mermaid.Flow.ts`)

Line-oriented parser/serializer that preserves unknown statements:

- Detect header line: `flowchart|graph <DIR>` (DIR: TB/TD/BT/LR/RL). Template picker: on selecting a type — if content is empty, insert starter template; if non-empty, confirm-replace all content with the template (small inline confirm, no window.confirm).
- Recognize (regex-based, per line):
  - Node defs: `A[label]`, `A(label)`, `A{label}`, `A([label])`, `A[[label]]`, `A[(label)]`, `A((label))`, `A>label]` — capture id, shape token, label
  - Edges: `A --> B`, `A -->|label| B`, `A -- text --> B`, `A --- B`, `A -.-> B`, `A ==> B`, chained `A --> B --> C`
  - `subgraph X ... end` blocks (treat contained lines as preserved; nodes inside still parseable)
  - Everything else (`classDef`, `style`, `click`, `linkStyle`, `direction`, comments) → preserved verbatim
- Mutations edit **source lines in place** (label edit rewrites the node token; node delete removes its def line + all edges referencing it; edge add appends `A --> B`; edge delete removes that edge segment; edge label edit rewrites `-->|...|`). Never regenerate the whole file from the model — this keeps fidelity for anything the parser doesn't understand.
- Layout metadata: single line `%% lc-layout:{"v":1,"positions":{"A":[x,y],...}}`. Parser strips it from content before mermaid rendering and preserves it on serialization (updated when positions change; removed entirely if empty).

### 3. Visual overlay editing (flowcharts)

- Render `MermaidRenderer` inside a wrapper div; on SVG mount, query `g.node[data-id]` (mermaid v11 sets `data-id` to the node id) to compute each node's screen rect via `getBoundingClientRect()`.
- Overlay absolutely-positioned transparent hit-rects per node:
  - Double-click → inline `<input>` to edit label (Enter commit, Esc cancel) → apply via task-2 mutation
  - Single-click → select node (accent `#e5c07b` outline)
  - Drag from a selected node's edge handle onto another node → create edge `A --> B`
  - Toolbar buttons: Add Node (appends `N<label>` with auto-generated id), Delete Selected (node or edge), Edit Selected Edge Label
  - Click an edge path (`path[data-id^="L_"]` or `.edgePath`) → select → delete/relabel
- Recompute hit-rects whenever the SVG re-renders (content change), pan/zoom changes, or container resizes (ResizeObserver).

### 4. Layout canvas (free positions)

- Custom renderer (no mermaid): nodes from the task-2 model as absolutely-positioned elements; shapes approximated (rect, rounded, diamond via rotated square, circle, stadium, subroutine, cylinder as SVG); edges as SVG bezier/straight paths with arrow markers and optional labels; default positions from a simple layered auto-arrange (BFS depth by direction) when metadata is absent.
- Drag node → update positions in `lc-layout` metadata → emit. Wheel/drag pan + zoom buttons (reuse MIN/MAX/ZOOM constants idea from `RenderView.Mermaid.tsx:45-47`).
- Same node/edge operations as overlay mode (add/delete/connect/relabel) since it operates directly on the model.
- Used by View mode read-only when metadata exists (task 1).

### 5. Wire into `LCFileView.DisplayMode.tsx`

- Import `LCFileViewDisplayModeMermaid`; in the `displayMode === "file"` branch (`:355`), add a case before the generic RenderView:

```tsx
) : isMermaidFile(selectedFile.name) ? (
  <LCFileViewDisplayModeMermaid
    content={content}
    onContentChange={onContentChange}
    onSave={onSave}
    fileName={selectedFile.name}
  />
) : (
```

- Keep the existing RenderView path for mindmap/markdown/html. No changes to `LCFileView.tsx` header toggle.

### 6. Styling & empty/error states

- Reuse the exact Lemon Coder dark palette from the CSV component (`COLORS` object) and Tailwind classes used there.
- Empty file → centered empty state with "Add first node" button (inserts `flowchart TD` + one node), mirroring CSV's empty state.
- Invalid syntax in preview → `MermaidRenderer` already shows the clean error card; keep it.

## Edge cases / risks

- **Round-trip fidelity**: mitigated by in-place line mutation (task 2). Multi-line node labels (`A["line1\nline2"]`) and quoted labels with brackets must be handled by the regexes — test explicitly.
- **Chained edges** (`A --> B --> C`): node-delete must unlink from chains without corrupting remaining segments.
- **CRLF files**: detect dominant EOL on parse and preserve on serialize.
- **Mermaid v11 DOM contract**: `g.node[data-id]` / `path[data-id]` selectors must be verified against the installed mermaid version during implementation (inspect a rendered SVG in devtools); add a fallback that hides overlay editing (text/split still work) if selectors don't resolve.
- **Subgraphs**: v1 renders them as boxes; overlay node hit-testing still works (nodes carry data-id), but adding/removing subgraphs visually is out of scope — text edits only.
- **Out of scope**: mindmap `.mm.md` editing, sequence/class visual editing, SVG/PNG export.

## Validation

1. `npx tsc --noEmit` and `npm run lint` — clean.
2. Manual scenarios (create a `.mmd` file in a Lemon Coder project):
   - Open file → header "Diagram" → View|Edit toggle visible top-right; View shows current mermaid preview unchanged (zoom/pan works).
   - Edit → Split: type in text pane, preview updates, file auto-saves; switch to Source and back — content consistent.
   - Visual: double-click node label → edit → file content updated; add node; drag-connect two nodes → `A --> B` appended; delete edge; Ctrl+Z undoes each.
   - Template picker: empty file → choose Sequence → `sequenceDiagram` starter inserted; Visual/Layout tabs disabled.
   - Layout: drag nodes, reload file (or toggle to Source and back) → positions persist via `%% lc-layout` line; mermaid's own renderer ignores the comment (no parse error); View mode shows positioned canvas.
   - Non-flowchart file with stray `%% lc-layout` line → falls back to MermaidRenderer in View.
   - External edit in Source mode → re-open Diagram mode re-parses cleanly (CSV `lastEmittedRef` pattern).
