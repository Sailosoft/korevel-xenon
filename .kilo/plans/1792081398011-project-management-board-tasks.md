# Project Management — Board UX & Data Enhancements

Scope: `src/modules/bunny-dev/modules/project-management` (plus shared `BDModal`).
Six independent tasks, ordered so shared primitives land before consumers.

## Confirmed decisions
- **T1**: Add `closeOnBackdrop` prop to `BDModal` (default `true`); set `false` only on the PM modals (task drawer, board settings, new board dialog). Escape still closes.
- **T2**: Templates = Kanban (To Do, In Progress, Done) / Scrum (Backlog, To Do, In Progress, In Review, Done) / Bug tracking (New, Triage, In Progress, Resolved, Closed) / Blank. Sections editable + reorderable + insert-in-between before saving.
- **T5**: Add `BDBoard.key`; auto-derived from name, editable, unique per project. Existing task keys are **not** rewritten; only new tasks use `{board-key}-{n}`.
- **T4**: `select` custom field type with `options: string[]`; single string value stored in existing `customFields[slug]`.
- **T6**: `BDBoard.cardChips?: string[]`; built-ins `key,type,priority,storyPoints,assignee,dueDate` + `custom:<slug>`. Default look preserved (`type,priority,storyPoints`) when unset. Custom-field chips render in the existing chip row.
- **T3**: Board/List toggle in the board area; list view grouped by Section/Priority/Type/Assignee/select-custom-field; collapsible groups; view + group-by in component state (not persisted).

---

## Task 1 — Modal: no close on outside click
Files: `components/BDModal.tsx`

1. Add `closeOnBackdrop?: boolean` (default `true`) to `BDModalProps`.
2. Backdrop `<div>` `onClick`: `closeOnBackdrop ? onClose : undefined`. Keep `aria-hidden`.
3. Set `closeOnBackdrop={false}` on:
   - `BDTaskDrawer.Component.tsx`
   - `BDBoardSettings.Component.tsx`
   - new `BDBoardDialog.Component.tsx`
4. Leave `closeOnEscape` unchanged (Escape + X still close). Do not change `BDConfirmDialog` or other modules.

## Task 5 — Board key drives task IDs
Files: `BDTask.Domain.ts`, `BDTask.Types.ts`, `BDTask.Repository.ts`, `BDProjectManagement.Component.tsx`, `BDBoardSettings.Component.tsx`, `BDMigration.ts`

1. Domain: add `key?: string` to `BDBoard` (keep optional; required in practice once created/migrated).
2. Types helpers:
   - `deriveBoardKey(name: string, existingKeys: string[]): string` — uppercase alphanumeric from name words (e.g. `My Board` → `MYB`), fallback `BOARD`; on collision append `2,3…`.
   - `nextBoardTaskNumber(boardTasks, boardKey): number` — max numeric suffix of tasks whose key starts `${boardKey}-`, else `tasks.length`; return max+1.
   - Update `nextTaskKey(key, number)` usage; keep signature.
3. Repository: new `createWithColumns(projectId, { name, key, type }, columns)` (see T2). Ensure `key` is unique per project (`listByProject` + `deriveBoardKey`).
4. `BDProjectManagement.Component.tsx`:
   - `createTask`: key = `nextTaskKey(activeBoard.key ?? "TASK", nextBoardTaskNumber(boardTasks, key))`.
   - `applyArtifact`/`addTasks`: build keys per board using that board's `key` and per-board counter (currently uses `project.key`).
5. Migration **v8**: `boards: "id, projectId, sprintId, position, key"`. Upgrade: for each project, backfill missing `key` deterministically via `deriveBoardKey` (dedupe in-project).
6. Board key editable in Board settings (new "Key" field, validated unique, uppercase) and in the New board dialog (T2).

## Task 2 — New board dialog + templates
Files: new `BDBoardDialog.Component.tsx`, `BDTask.Types.ts`, `BDTask.Repository.ts`, `BDProjectManagement.Component.tsx`, `index.ts`

1. Types: `BD_BOARD_TEMPLATES: { id; label; type: BDBoardType; sections: { name; category: BDBoardTaskStatusCategory; color }[] }[]` (4 templates above). Blank = `[]`.
2. Repository: `createWithColumns(projectId, boardInput, columns)`:
   - Create board row (name, key, type, position appended).
   - Create each column preserving name/category/color/position (extend `createBoardColumn` to accept `{ category?, color? }`; today it hardcodes `todo`/`gray`, which mislabels Done/In Review).
3. New `BDBoardDialog.Component.tsx` (shared dialog built on `BDModal`, `closeOnBackdrop={false}`):
   - Props: `open`, `projectId`, `onClose`, `onCreated(board: BDBoard)`.
   - Fields: Name (default "Board"), Key (auto-derived from name, editable), Template `<select>`.
   - Section editor: list of `{ name, category, color }` seeded by template; add / remove / reorder (reuse `BDSortableList` drag handle) and an explicit "insert after" control to add in between. Selecting a template re-seeds sections.
   - Footer: Cancel + "Create board"; disabled until name + key + ≥0 sections valid.
4. `BDProjectManagement.Component.tsx`: replace direct `createWithDefaultColumns` call; `createBoard()` opens dialog; `onCreated` sets active board + toast. Wire both header and empty-state buttons.
5. Export `BDBoardDialogComponent` from `index.ts`.

## Task 4 — Select custom field
Files: `BDTask.Domain.ts`, `BDBoardSettings.Component.tsx`, `BDTaskDrawer.Component.tsx`

1. Domain: add `select: "select"` to `BDCustomFieldType`; add `options?: string[]` to `BDBoardCustomField`.
2. Board settings: add `{ label: "Select", value: "select" }` to `CUSTOM_FIELD_TYPES`. When a field's type is `select`, render an options editor (chips/textarea, one option per line), persisted in `saveFields` (dedupe + trim; drop empty). `slugify` unchanged.
3. Task drawer: when `field.type === "select"`, render native `<select>` with an empty option + `field.options`, writing via existing `setCustomField`. Handle legacy/absent options gracefully.

## Task 6 — Configurable card chips
Files: `BDTask.Domain.ts`, `BDTask.Types.ts`, `BDBoardSettings.Component.tsx`, `BDBoard.Component.tsx`, `BDProjectManagement.Component.tsx`

1. Domain: add `cardChips?: string[]` to `BDBoard`. Types: `BD_BOARD_CARD_CHIPS` (built-in defs with label + id) and `BD_DEFAULT_CARD_CHIPS = ["type","priority","storyPoints"]`.
2. Board settings: "Card chips" section with toggles for each built-in id and each custom field (`custom:<slug>`). Save to `board.cardChips` (persist immediately or batch with a Save button; follow existing custom-fields Save pattern).
3. `BDBoard.Component.tsx`: accept `board` (or `cardChips` + `customFields`) and `members` map. Render chips for enabled ids via a shared `renderChips(task, config)` helper:
   - `priority`/`type`/`storyPoints` unchanged; `assignee` = member name; `dueDate` = formatted date; `key` = task key.
   - `custom:<slug>`: select value rendered with a deterministic color badge; other types plain text/`BDBadge`.
   - Fall back to `BD_DEFAULT_CARD_CHIPS` when unset.
4. Factor the chip renderer into a small helper (e.g. `BDTaskChips.ts`) reused by the list view (T3).
5. `BDProjectManagement.Component.tsx`: pass `activeBoard` + `members` into the board/list components.

## Task 3 — List view with grouping
Files: new `BDBoardList.Component.tsx`, `BDProjectManagement.Component.tsx`, `index.ts`

1. `BDProjectManagement.Component.tsx`: add `view: "board" | "list"` and `groupBy` state; render a toggle (Board/List) + group-by `<select>` (list view only) in the board toolbar area.
2. New `BDBoardList.Component.tsx`:
   - Props: `columns`, `tasks`, `board`, `members`, `groupBy`, `onSelectTask`, `onAddTask`.
   - Group-by options: `status` (column order), `priority`, `type`, `assignee` (member name / Unassigned), and `custom:<slug>` for select fields. For `status`, respect column positions.
   - Render collapsible group sections with a count header; rows show key, title, chip row (reuse T6 helper), and open the task drawer on click.
   - Reuse `BDBoardComponent`'s bar values for ids; keep it dependency-free (no table library required).
3. Export `BDBoardListComponent` from `index.ts`.

---

## Migration (Dexie)
`BDMigration.ts` — add `db.version(8)`:
```ts
db.version(8).stores({
  boards: "id, projectId, sprintId, position, key",
}).upgrade(async (tx) => { /* backfill BDBoard.key per project, unique */ });
```
- Must be appended after v7; never edit prior versions.
- Backfill uses the same `deriveBoardKey` logic to stay deterministic.

## Validation
- `npm run lint` (eslint) must pass.
- Type check: `npx tsc --noEmit` (no dedicated script; tsconfig present).
- Manual: create board from each template (sections correct, insert-in-between works, key unique); reload to confirm migration backfills keys; create task → key shows `{board-key}-{n}`; add select custom field + options → drawer renders select, chip shows value; toggle each card chip; list view groups by each condition and groups collapse; outside-click does not close PM modals but Escape/X do.

## Risks / notes
- `createBoardColumn` currently hardcodes category `todo`/`start`; templates must set category/color or Done columns will be miscategorized — fix as part of T2.
- Per-board task numbering is derived from existing keys; deletion may reuse a number unless max-suffix logic is used (implemented in T5 helper).
- `BDBoardComponent` prop signature changes; only `BDProjectManagement.Component.tsx` consumes it.
- `cardChips` undefined must fall back to the default chip set to preserve current appearance.

## Out of scope
- Rewriting existing task keys (T5 decision).
- Persisting view/group-by per board (kept in component state).
- Multi-select custom fields, chip colors theming beyond deterministic select badge, board-level WIP enforcement.
