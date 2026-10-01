# Diagram Builder Plan (tasks 7–8)

Module: `src/modules/bunny-dev/modules/diagram-builder`.
Source: `tasks.yaml` lines 44–57.

## Goal

1. Replace the purple Mermaid rendering with a good layout/background (bunny-dev only).
2. Make the editor dynamic per diagram type; lock type after creation; fix Direction.

## Key files

- Domain: `BDDiagram.Domain.ts` (node shapes lines 63–234, record 357–368)
- Types/serializer: `BDDiagram.Types.ts` (`createDiagramNode` 74–93, `toMermaid` 113–292)
- UI: `BDDiagramBuilder.Component.tsx` (`changeType` 97–106, create 65–76, node card 360–402, edge card 404–474, direction 299–314, preview 477–535)
- Render: `../components/BDDiagramView.tsx`
- Server: `BDDiagramBuilder.Server.ts` (`DIAGRAM_DSL` 27–81)
- Styling: `../../BDStyle.css`
- Reference pattern: `../schema-builder/BDSchemaModel.Component.tsx` + `../components/BDForm.tsx`

---

## T1 — Display styling (remove purple, add background)

Root cause: Mermaid's default theme. `BDDiagramView.tsx` initializes with `theme: "default"` (lines 21–28), whose palette is lavender/purple.

1. In `BDDiagramView.tsx` initialize Mermaid with a bunny-dev palette:
   - Use `theme: "base"` and explicit `themeVariables` (e.g. `primaryColor: "#e3f2fd"`, `primaryBorderColor: "#1976d2"`, `primaryTextColor: "#0f172a"`, `lineColor: "#64748b"`, `fontFamily: inherit`). Keep `securityLevel`/`suppressErrorRendering`.
   - This affects the schema ERD too (shared component) — acceptable and desirable (module scope, not global).
2. Add a bunny-dev-scoped surface class in `BDStyle.css`, e.g. `.bd-diagram-surface` with a soft gradient/dot-grid background, border, and padding; apply to the preview card (`BDDiagramBuilder.Component.tsx` lines 478–530) and/or the `BDDiagramView` frame (line 107).
3. Improve the builder page layout: root `flex flex-col gap-5` (line 178) gets a sectioned layout; keep existing cards but add consistent headers/spacing. No change to shell theme.
4. Note: exported SVG reads the raw `<svg>` (`BDDiagramExport.ts` 27–30) and will not include the CSS card background; optional follow-up is to inject a background `<rect>` into the exported SVG (out of scope for this pass).

Acceptance: flowcharts and ERDs render in blue/grey tones on a styled surface; no purple.

## T2 — Dynamic editor, type lock, direction

### T2a — Type chosen at creation, then locked

Problem: create persists immediately with `type: "flowchart"` (lines 65–76); the type `<select>` (lines 281–293) is always enabled, and `changeType` (97–106) rebuilds nodes through `createDiagramNode`, discarding type-specific data.

1. Add a create dialog (`BDModal`) that collects `name` + `type` before persisting. On submit, create via `bdDiagramRepository.create({... , type, nodes: [defaultNodeForType(type)], edges: []})`.
2. Track whether the draft has content (`draft.nodes.length > 1 || draft.edges.length > 0 || draft.meta?.mermaid`). Disable the type `<select>` when content exists and show a helper text: "Type is fixed after creation."
3. Remove the destructive remap in `changeType`; if type change is ever allowed on an empty draft, only reset the default node.
4. AI `applyArtifact` (144–167) already creates with `diagramDraft.type`; keep.

### T2b — Per-type editor fields

The editor currently always renders only `{id,label}` rows for nodes (360–402) and `{source,target,label}` for edges (404–474), regardless of type. Each `BDDiagramType` has its own node interface in `BDDiagram.Domain.ts` (63–234).

1. Add a declarative field map, e.g. `BD_DIAGRAM_NODE_FIELDS: Record<BDDiagramType, BDFormField[]>` in `BDDiagram.Types.ts`, describing type-specific fields per node (reuse `BDForm` field types: text/number/select/toggle/repeater/tags):
   - flowchart: `kind` (select), `shape`, `link`
   - sequence: `kind` (participant/actor/…), `alias`, `order`
   - class: `kind`, `generic`, `attributes` (repeater `{name,type,visibility}`), `methods` (repeater)
   - state: `kind`, nested `states`
   - er: `fields` (repeater `{name,type,nullable,primary}`)
   - gantt: `start`, `duration`, `end`, `status`, `dependsOn`, `section`
   - pie: `value` (number)
   - mindmap: `kind` (root/branch/leaf)
   - timeline: `period`, `events` (tags)
   - journey: `score`, `actors` (tags), `section`
   - gitgraph: `branch`, `tag`, `commitId`, `parent`
   - c4: `technology`, `description`, `external`, `boundary`
   - block: `columns`, `width`
   - requirement: `requirementId`, `text`, `risk`, `verifyMethod`
2. Render each node row using the per-type fields (base `id`/`label` always shown). Follow the `BDSchemaModel.Component.tsx` repeater/update-by-index pattern (updateProperty/Relation/Index at lines 116–137; add/remove rows).
3. Extend `createDiagramNode` (74–93) so factories seed the type's default kind **and** required fields; add small per-type node factory helpers. Preserve existing node data when editing.
4. Edges: keep `source`/`target`/`label`; optionally expose `edgeType` (19 values at `Domain.ts` 272–291) when the type supports it.

### T2c — Serializer uses real node data + direction

`toMermaid` (113–292) has two defects: `meta.mermaid` short-circuits everything (113–115), and non-flowchart branches are hardcoded placeholders (e.g. gantt fixed dates 235, journey fixed task 219, class body = label 142).

1. Rewrite each `case` branch to read the typed node fields so editor changes appear in preview/export.
2. Direction:
   - Map supported types: `flowchart`, `state`, `class`, `block` honor direction. For those, emit the correct syntax (`flowchart <dir>`, `stateDiagram-v2` `direction <dir>`, `classDiagram` `direction <dir>`, `block` layout). Hide/disable the Direction select for unsupported types (change the control at 299–314 based on type).
   - Fix the override: when the user changes `type`/`direction`, if `draft.meta?.mermaid` is set, clear it (or show a notice that the raw source overrides the preview) so the selector visibly works. Keep the "Clear source override" button (349–351).
3. Extend `DIAGRAM_DSL` (`Server.ts` 27–81) so AI can populate type-specific node fields (or, if intentionally keeping AI on raw `mermaid`, document that AI diagrams remain source-overridden).

Acceptance: choosing a type at creation yields its own editor fields; type cannot change once data exists; editing node fields updates the preview; Direction changes the rendered graph for supported types.

---

## Risks

- Rewriting `toMermaid` for 14 types is large; do it incrementally, type by type, verifying each against a live Mermaid render.
- `BDDiagramRecord` (flat, untyped) is what the editor uses; per-type field maps must tolerate legacy/partial node data.
- Direction semantics differ per Mermaid diagram type; only expose it where valid.

## Validation

- `bun run build` and `npm run lint` pass.
- Create each diagram type, edit its fields, confirm preview updates and export (`.mmd/.md/.svg`) matches.
- Confirm a diagram with existing data cannot change type; Direction works for flowchart/state/class/block.
- `BDSchemaErd` still renders correctly after the Mermaid theme change.
