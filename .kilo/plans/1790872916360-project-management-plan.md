# Project Management Plan (tasks 12–13)

Module: `src/modules/bunny-dev/modules/project-management`.
Source: `tasks.yaml` lines 76–94.

## Naming

There is no `BDTaskModal`; the task modal is `BDTaskDrawer.Component.tsx` (renders a `BDModal`). Drag-and-drop is native HTML5 (no dnd library).

## Key files

- Domain: `BDTask.Domain.ts` (board/column/task 92–155, custom fields 92–98, 106)
- Types: `BDTask.Types.ts` (`createBoardTask` 123–148, `createBoardColumn` 100–117, `nextTaskKey`)
- Repos: `BDTask.Repository.ts` (`moveToColumn` 67–76; column list 46–49)
- Hooks: `BDTask.Hooks.ts` (boards 14–19 unsorted; columns 21–29; tasks 31–43)
- UI: `BDTaskDrawer.Component.tsx`, `BDTaskComments.Component.tsx`, `BDBoard.Component.tsx`, `BDProjectManagement.Component.tsx`
- Settings hosts: `projects/[projectId]/settings/page.tsx` → `core/BDProjectSettings.Component.tsx`; global `settings/page.tsx` → `ai-settings/BDAISettings.Component.tsx`
- Migration: `../../BDMigration.ts` (add v3 for board `position` index)

---

# Task 12 — Improve Task Modal

## A1 — Description dirty label + Save button (update mode)

1. In `BDTaskDrawer.Component.tsx` description block (120–129), compute `isDescriptionDirty = draft.description !== task.description`.
2. Show an "Unsaved changes" label when dirty, and a Save button beneath the editor that persists only the description: `bdBoardTaskRepository.update(draft.id, { description: draft.description })`, then sync local `task` baseline (e.g. re-fetch or lift a `onPatched(task)` callback).
3. Only render the label/button in update mode.

## A2 — Remove the "Save task" button

1. Remove the footer Save button (`BDTaskDrawer.Component.tsx` 83–85) and the `onSave` prop usage (prop at 22, page wiring `BDProjectManagement.tsx` 73–77, 244).
2. Footer keeps Delete + Close (Delete only in update mode; see A5).
3. After removal, all edits persist via autosave (A3) + the description Save button (A1).

## A3 — Autosave select fields (update mode)

1. Add a `persist(patch: Partial<BDBoardTask>)` helper in the drawer that calls `bdBoardTaskRepository.update(draft.id, patch)` (not the page `onSave`, which closes the modal at `BDProjectManagement.tsx` 75) and updates local state.
2. Wire every select/date control to call `update(...)` **and** `persist(...)`:
   - Type (136–151), Priority (152–171), Status (172–192 — also resolves `columnId`), Story points (193–210), Assignee (211–223, see A6), Due date (224–236).
3. Guard: only autosave in update mode.

## A4 — Scroll to the newly added comment

1. In `BDTaskComments.Component.tsx`, add `const virtRef = useRef<VirtuosoHandle>(null)` and pass `ref={virtRef}` to `<Virtuoso>` (179–190).
2. After the successful `bdTaskCommentRepository.create(...)` in `post()` (124–142), call `virtRef.current?.scrollToIndex({ index: <new last index>, behavior: "smooth", align: "end" })`. Rows sort by `createdAt` ascending, so the new comment is last; alternatively set `followOutput` on Virtuoso.

## A5 — Create mode + "Create task"; scope autosave

Current `addTask` persists immediately (`BDProjectManagement.tsx` 60–67) then opens the drawer in update mode. Refactor:

1. Add `mode: "create" | "update"` to `BDTaskDrawerComponentProps` plus an `onCreate(draft)` callback. In create mode the drawer holds a `Partial<BDBoardTask>` (no `id`).
2. Change "Add task" to build a draft with `createBoardTask(...)` **without persisting** and open the drawer in create mode.
3. Footer in create mode: show a "Create task" primary button that computes `nextTaskKey` and calls `bdBoardTaskRepository.create(...)`, then switches to update mode (or closes).
4. Autosave (A3) and description Save (A1) render **only** in update mode; in create mode there is no autosave.
5. On create, assign `columnId`/`status` from the chosen column and a deterministic `rank`.

## A6 — Assignee + story points (decision: keep points, real member picker)

1. Keep `storyPoints` (used by AI, shown on cards at `BDBoard.Component.tsx` 108–110). No change.
2. Replace the raw "member id" text input (211–223) with a select populated from project members: add a `useBDProjectMembers(projectId)` live query (`bdDB.projectMembers.where("projectId")`) or reuse an existing core hook; render member names, persist `assigneeId`.
3. Keep `assigneeId` and `storyPoints` in the domain and the `boardTasks` index (`BDMigration.ts` 35–36).

## A7 — Drag-and-drop reorder (position/swap indicator)

Current DnD is column-level only and `moveToColumn` always appends (`BDTask.Repository.ts` 74, `rank: Date.now()`).

1. Extend the move signature to `onMoveTask(task, targetColumn, beforeTaskId?)` in `BDBoard.Component.tsx` (prop 15) and `BDProjectManagement.tsx` (69–71).
2. Card-level drop targets: add `onDragOver`/`onDrop` on each task card (86–92) computing an insertion index; on drop, call `onMoveTask(task, column, targetTask?.id)`.
3. Insertion indicator: highlight the hovered card/edge (a top/bottom border) so the user sees which task it will swap/insert before.
4. Deterministic ordering: add `reorder(taskId, column, beforeTaskId?)` to `BDBoardTaskRepository` that recomputes `rank` for all tasks in the column (e.g. sequential or midpoint-with-rebalance, not `Date.now()`), updating `columnId`/`status`. Sort hook already uses `rank` (`Hooks.ts` 41).
5. Avoid rank ties: reindex the affected column after each drop.

---

# Task 13 — Project Management Settings

## B1 — Settings entry points

1. Add a per-board **Settings** icon button in the board header actions (`BDProjectManagement.tsx` 131–149, near "New board" 144–146 / "AI Generate" 137–143). Opens a Board Settings modal.
2. Add a project-level **Project Management settings** section on the project settings page (`projects/[projectId]/settings/page.tsx` → `core/BDProjectSettings.Component.tsx`), for global (project-wide) board ordering/renaming. (Boards are project-scoped; "global" = project scope.)

## B2 — Board settings (attach to board)

Modal sections:
1. **Rename board**: input → `bdBoardRepository.update(boardId, { name })`.
2. **Sections (columns)**: list with add (name + status name), rename, reorder up/down, delete. Persist `position` via `bdBoardColumnRepository` (`BDRepository.update`); `createBoardColumn` factory exists; `listByBoard` sorts by `position` (`Repository.ts` 46–49). Guard deleting a column that has tasks (reassign or block).
3. **Custom fields**: manage `board.customFields` (`BDBoardCustomField`, `BDTask.Domain.ts` 92–98, 106) — add/remove, `name`, `slug`, `type` (`text|textarea|number|date`), order. Persist with `bdBoardRepository.update`.
   - To make custom fields usable, add `customFields?: Record<string, string>` to `BDBoardTask` (`BDTask.Domain.ts` 125) and render dynamic inputs for them in the task drawer (no index needed). This is the minimal end-to-end addition.

## B3 — Global settings (move/reorder + rename boards)

Boards currently have no order: `BDBoard` has no `position` (`BDTask.Domain.ts` 100–108) and `useBDBoards` is unsorted (`BDTask.Hooks.ts` 14–19).

1. Add `position?: number` to `BDBoard`.
2. Add `db.version(3).stores({ boards: "id, projectId, sprintId, position" })` in `BDMigration.ts` (partial store spec is supported; no upgrade backfill needed — sort with a fallback).
3. Sort boards by `position ?? 0` then name in `useBDBoards` and/or the board tab render (`BDProjectManagement.tsx` 201–226), and backfill positions on first load if missing.
4. In project settings, list boards with drag or up/down reorder + rename; persist `bdBoardRepository.update({ position })` / `{ name }`.
5. Keep board creation (`BDProjectManagement.tsx` 51–58) assigning `position = max + 1`.

---

## Risks

- Removing `onSave` touches the page wiring; ensure no other caller depends on it.
- Create-mode refactor changes task-key generation timing; compute the key at create time from the current max.
- Dexie v3 adds a new version; verify upgrade from existing v2 data preserves tasks.
- Native DnD reorder needs careful rank rebalancing to stay deterministic across reloads.
- Custom fields at task level are new data; keep them optional so existing tasks render unchanged.

## Validation

- `bun run build` and `npm run lint` pass.
- Update mode: edit description → dirty label + Save persists; change each select → auto-persists; comment scrolls into view; no Save Task button.
- Create mode: Create task persists with correct column/key; no autosave/desc-save shown.
- DnD: reorder within and across columns; indicator shows target; order persists after reload.
- Board settings: rename board, add/rename/reorder/delete sections, add custom fields and fill them on a task.
- Global settings: reorder/rename boards; order persists; upgrade from v2 works.
