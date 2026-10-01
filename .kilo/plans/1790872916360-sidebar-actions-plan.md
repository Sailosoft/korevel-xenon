# Sidebar Actions Plan (task 9 — module: all)

Source: `tasks.yaml` lines 58–61.
"Improve sidebar actions. The delete action button make it icon button of delete with tooltip."

This is the cross-cutting plan. It owns the shared changes that other module plans
(notably API Design T1) consume. Do this first.

## Scope clarification

The shell nav (`BDShell.sidebar.tsx`) renders only `<Link>` items and has **no**
delete actions. "Sidebar actions" refers to the action controls in each module's
left-hand list/panel — primarily `BDList` row actions (shared) and hand-rolled
hover icon buttons (group/tree/topic/board lists).

## Key files

- Shared: `../components/BDList.tsx` (`BDListAction` 32–38; row render 314–334; bulk 173–184), `BDButton.tsx`, `components/index.ts`
- No tooltip primitive exists in bunny-dev; HeroUI `@heroui/react` is already a dependency.
- Existing icon-button + `aria-label` patterns: schema group (`BDSchemaBuilder.Component.tsx` 350–377), api group (`BDApiDesign.Component.tsx` 702–729), board delete (`BDProjectManagement.Component.tsx` 217–224), outline topic (`BDOutline.Component.tsx` 48–65), app resource (`BDAppBuilder.Component.tsx` 466–483), architecture section (`BDArchitecture.Component.tsx` 233–245).

---

## T1 — Add a shared icon-button with tooltip

1. Create `src/modules/bunny-dev/components/BDIconButton.tsx`:
   - Props: `icon: LucideIcon`, `label: string` (used as tooltip + `aria-label`), `variant?`, `size?`, `isLoading?`, `onClick`, `disabled?`, optional `href`.
   - Renders `BDButton` with **no children** (icon only) and wraps it in a tooltip. Use HeroUI `Tooltip` + `Tooltip.Content` following `src/modules/bunny/src/table/BunnyReactiveTable.tsx` (which uses controlled `isOpen` + explicit `onMouseEnter/onMouseLeave` because react-aria drops hover after programmatic focus). Fallback acceptable if HeroUI proves awkward: native `title` + `aria-label`.
   - Icon-only buttons need explicit padding/`size` (BDButton `SIZE_CLASSES` still add `px-2.5`).
2. Export it from `components/index.ts` (and ensure it is reachable via the bunny-dev barrel).

## T2 — `BDList` row actions support icon-only + tooltip

1. Extend `BDListAction<T>` (`BDList.tsx` 32–38) with `iconOnly?: boolean` and `tooltip?: string`.
2. Update the row-action render (314–334) and bulk-action render (173–184): when `iconOnly`, render `BDIconButton` (icon only, tooltip = `tooltip ?? label`); otherwise keep the current labeled `BDButton`.
3. Default unchanged (opt-in), so no regressions in the 8 modules using `BDList`.
4. Convert every Delete row action to `iconOnly: true, tooltip: "Delete …"`:
   - `core/BDProjectList.Component.tsx` (212–217, sibling Open/Edit stay labeled or also become icon-only with tooltips — recommend all row actions icon-only for consistency)
   - `architecture/BDArchitectureBuilder.Component.tsx` (322–327)
   - `diagram-builder/BDDiagramBuilder.Component.tsx` (252–259)
   - `agent-manager/BDAgentManager.Component.tsx` (302–307)
   - `app-builder/BDAppBuilder.Component.tsx` (331–336)
   - `api-design/BDApiDesign.Component.tsx` (782–789) — also covered by API Design T1
   - `outline/BDOutlineBuilder.Component.tsx` (272–279)
   - `schema-builder/BDSchemaBuilder.Component.tsx` (446–451)
   - Consistency: apply `iconOnly` to sibling Open/Edit actions too so a row is a uniform icon group.

## T3 — Hand-rolled sidebar icon buttons get tooltips

Replace the inline `<button>`/`<Link>` icon controls with `BDIconButton` (or add a tooltip wrapper) so every sidebar/group/tree delete has a tooltip:
- Schema group actions (`BDSchemaBuilder.Component.tsx` 350–377)
- API group actions (`BDApiDesign.Component.tsx` 702–729)
- Board delete (`BDProjectManagement.Component.tsx` 217–224)
- Outline topic add/delete (`BDOutline.Component.tsx` 48–65)
- App resource edit/delete (`BDAppBuilder.Component.tsx` 466–483)
- Architecture section remove (`BDArchitecture.Component.tsx` 233–245)
- File manager context-menu delete already has label; no change.
- Rendering engine record actions (`BDAppRendering.Component.tsx` 549–572, 413–428): these are in the main content area, not the sidebar; leave as-is or optionally tooltip for consistency (out of scope unless desired).

Do **not** convert modal footer danger buttons (e.g. `BDArchitecture.Component.tsx` 109, `BDTaskDrawer` 76, file editor 90) — those are primary modal actions where text labels aid clarity.

## T4 — Style

No tooltip CSS exists in `BDStyle.css`; keep this component-level (Tailwind + HeroUI). No shell/theme changes.

---

## Risks

- `BDList` is shared by 8 modules — keep the change strictly opt-in.
- HeroUI tooltip hover behavior needs the explicit mouse handlers pattern; test keyboard focus.
- Consistency sweep touches many files; run lint/build after.

## Validation

- `bun run build` and `npm run lint` pass.
- Every sidebar/list Delete is an icon button with a visible tooltip on hover and focus, with `aria-label` for a11y.
- No labeled actions regress in modules not updated.
