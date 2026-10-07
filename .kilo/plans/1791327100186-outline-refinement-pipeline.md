# Outline Refinement Pipeline — `iterative_refine` / `critique` / `consolidate`

## Goal

Turn the three second-pass Generation Modes into a real refinement pipeline: `critique`
produces a structured, actionable plan; the user approves it in a guided wizard; applying
the plan creates/merges/reorders/deletes rows transactionally; then `iterative_refine`
polishes the affected items in a bounded loop with a diff-based stop.

Today all three modes only write text into the current row's `content` and never touch
siblings (`bui.outline.action.content.ts:472-488`), and `critique` / `consolidate` only
see `number. title — description` via `formatMapItem` (`bui.outline-chapter.generate-mode.ts:65`).

## Confirmed decisions

1. **Scope**: full apply pipeline (create / merge+delete+renumber / reorder / refine).
2. **UX**: new guided **Refine wizard**, launched from a header action on the outline items table.
3. **Consolidate apply**: merge into anchor, delete absorbed rows, renormalize numbers to
   contiguous ascending, remap `referenceIds` (drop deleted ids), always with a dry-run preview.
4. **Critique output**: a unified, typed, actionable plan (`insert` / `merge` / `reorder` / `refine`).
5. **Iterative refine**: bounded loop (default 2, max 3), targeted at `refine` findings +
   merged anchors, diff-based early stop (`diff` package, already a dependency).
6. **Map content**: critique/consolidate receive capped sibling content (per-item ~1500 chars,
   global ~16000 chars), items without content marked `(no content)`.
7. **Persistence**: store the structured plan on the outline (non-indexed JSON field + timestamp).
8. **Transport**: one route/transport; modes declare `output: "markdown" | "json"`; tolerant
   JSON parse in the client action. `critique`/`consolidate` are repurposed as structured
   modes and no longer overwrite item `content` with a report.
9. **Apply atomicity**: AI output computed first, then all row mutations in one Dexie
   `transaction("rw", books, chapters)`; rollback on any failure. Refine loop runs after,
   as a separate step.

## Boundaries & affected files

- `bui.outline-chapter.generate-mode.ts` — mode contract (`output`, `planOnly`), JSON schemas in
  instructions, map content, `refineDirective` support.
- `bui.outline.entity.ts` — `BUIOutlineEntity.refinementPlan` + `refinementPlanUpdatedAt`;
  `BUIOutlineParams` map items gain `id` and optional `content`; add `refineDirective`.
- `bui.outline.action.content.ts` — new actions: critique plan, consolidate merge, refine loop,
  apply plan; parse helpers; renumber/remap helpers; context for plan modes.
- `bui.outline-chapter.component.refine.tsx` (new) — the wizard.
- `bui.outline-chapter.module.ts` — register the header action.
- `bui.outline-chapter.component.pipeline.tsx` and `bui.outline-chapter.component.generate.tsx` —
  route `planOnly` modes to the wizard / plan viewer instead of writing content.
- `bui.outline-chapter.prompt.content.ts` — expose `output` / `planOnly` to the UI.
- `README.md` — update the Generation Modes + item content sections.
- No Dexie schema version bump: all new fields are non-indexed (`bui.database.ts`).

## Data model changes (`bui.outline.entity.ts`)

```ts
// BUIOutlineEntity additions (non-indexed, no Dexie bump)
refinementPlan?: BUIOutlineRefinementPlan;
refinementPlanUpdatedAt?: number;

export interface BUIOutlineRefinementPlan {
  scope: number[];                 // item ids in scope at critique time
  findings: BUIOutlineRefinementFinding[];
  approvedIds: string[];           // finding ids the user ticked
  refinePasses?: number;           // requested refine loop count
  generatedAt: number;
  appliedAt?: number;
}

export type BUIOutlineRefinementFinding =
  | { id: string; type: "insert"; title: string; description?: string; rationale?: string }
  | { id: string; type: "merge"; anchorId: number; sourceIds: number[]; rationale?: string }
  | { id: string; type: "reorder"; order: number[]; rationale?: string }
  | { id: string; type: "refine"; itemId: number; directive: string; rationale?: string };
```

```ts
// BUIOutlineParams additions
items?: { id?: number; number: number; title: string; description?: string; content?: string }[];
refineDirective?: string;          // iterative_refine extra directive (from a `refine` finding)
mergeGroup?: { anchorId: number; sourceIds: number[] }; // consolidate scoping
```

## Mode contract changes (`bui.outline-chapter.generate-mode.ts`)

- Add to `BUIOutlineGenerateMode`: `output: "markdown" | "json"` and `planOnly?: boolean`.
- `critique`: `output: "json"`, `planOnly: true`. Instructions must emit exactly:
  ```json
  { "findings": [
    { "id": "f1", "type": "insert", "title": "…", "description": "…", "rationale": "…" },
    { "id": "f2", "type": "merge", "anchorId": 3, "sourceIds": [4,5], "rationale": "…" },
    { "id": "f3", "type": "reorder", "order": [1,3,2], "rationale": "…" },
    { "id": "f4", "type": "refine", "itemId": 2, "directive": "…", "rationale": "…" }
  ] }
  ```
  Keep the "audit, do not rewrite" system instruction; ids are row `id`s from the map.
- `consolidate`: `output: "json"`, `planOnly: true`, scoped to `params.mergeGroup`. Emit:
  ```json
  { "anchorId": 3, "sourceIds": [4,5], "mergedContent": "…markdown…" }
  ```
- `iterative_refine`: stays `output: "markdown"`. Its context appends
  `params.refineDirective` (if present) after the existing content block.
- Map for critique/consolidate: extend `fullMapContext` to optionally include
  `id` and truncated `content` under the cap above; keep descriptions. `artifactContext`
  unchanged.
- `buildItemContext` unchanged in shape (still `mode.build(params, type)`).

## Client actions (`bui.outline.action.content.ts`)

- `runCritiquePlanAction(outlineId, scopeIds, options, aiConfig)` → parse mode result,
  return `BUIOutlineRefinementFinding[]`, persist `refinementPlan` (+ `refinementPlanUpdatedAt`)
  on the outline.
- `runConsolidateMergeAction(outlineId, group, options, aiConfig)` → return
  `{ anchorId, sourceIds, mergedContent }`.
- `runIterativeRefineAction(itemId, directive, passes, options, aiConfig)` → bounded loop,
  returns final content + pass log.
- `applyRefinementPlanAction(outlineId, approvedFindings, precomputed)` → transactional apply
  (see algorithm).
- Helpers: extend `extractJsonObject` reuse for parse; `renumberItems(rows)`; `remapReferenceIds(rows, deletedIds)`.
- Extend `resolveItemModeContext` so `critique` / `consolidate` receive the content-bearing map
  (currently returns `{}` for them at `:353`).

## Wizard UX (`bui.outline-chapter.component.refine.tsx`)

Steps in one modal:
1. **Scope** — whole outline (default) or selected item ids; choose refine passes (default 2).
2. **Critique** — run `runCritiquePlanAction`; show a loading state; render the plan as
   readable markdown (findings grouped by type with rationale) plus per-finding approve toggles.
3. **Review & Apply** — dry-run preview of insertions, merge groups (which rows merge/delete),
   reorder, renumber, and reference remaps. On confirm: precompute merged content for each
   approved merge group via `runConsolidateMergeAction`, then call `applyRefinementPlanAction`.
4. **Refine** — for approved `refine` findings + merged anchors, run `runIterativeRefineAction`
   with progress per item and pass count; stop early on convergence.

Plan is loaded from `outline.refinementPlan` on open so a session can resume; approval toggles
persist back to the same field.

## Apply algorithm

Precompute (outside transaction): merged content per approved `merge` group; any needed
AI output. Then, inside `buiDatabase.transaction("rw", books, chapters)`:

1. **insert** — create rows (`bookId = outlineId`, next numbers, `status: "pending"`).
2. **merge** — set anchor `content` = mergedContent, `wordCount`, `status: "done"`; delete every
   source row except the anchor; collect deleted ids.
3. **reorder** — compute the final item order from the approved `reorder.order` (ids not listed
   keep relative order after); apply to numbering.
4. **renumber** — assign contiguous `1..N` by final order (numbers are not uniquely indexed;
   simple sequential `panelUpdate` is safe).
5. **remap references** — remove deleted ids from every remaining row's `referenceIds`.
6. Persist outline `refinementPlan.appliedAt` + approved ids.

Post-transaction: **refine loop** per targeted item (separate, re-runnable AI step).

## Iterative refine loop

For each target: `passes` iterations; each pass sends artifact + current content + directive;
after each pass compute `diffWords(prev, next)` change ratio; stop when `< 0.05` or when the
model returns unchanged content. Persist `content`, `wordCount`, `status: "done"` per pass.
Never run inside the apply transaction.

## Failure modes

- Invalid/partial JSON from critique/consolidate → tolerant extract of first `{...}`; on parse
  failure, surface an error and leave `refinementPlan` unchanged.
- Missing/invalid ids in findings (row deleted since critique) → drop that finding during
  validation and warn in the preview.
- Mid-apply failure → Dexie transaction rolls back; plan stays intact for retry.
- Refine model error → reset that item to `empty` (existing behavior at `bui.outline.action.content.ts:493`) and continue the loop; report per-item.

## Validation

- `npm run lint` (eslint).
- `npx tsc --noEmit` or `npx tsgo --noEmit` for types.
- Manual: seed an outline with duplicate/overlapping items → run wizard → verify
  insert/merge/delete/renumber/reference remap; verify refine loop early-stop; reload mid-plan
  and confirm resume; confirm `critique`/`consolidate` no longer overwrite item content.

## Out of scope

- No Dexie schema version bump or review-history table.
- No tests (no test framework in repo).
- No changes to structure generation or the `chain_of_thought` / `control` / `parallel` modes.

## Open questions

None blocking. Assumed: merge `anchorId` is always a surviving row; findings not approved are
retained in the persisted plan but not applied.
