# Outline Module — Implementation Plan

Add an **Outline** capability to `bunny-ai` that reuses the existing Book / BookChapter
data model and UI patterns, with outline-specific generation (types + modes) and nested
topics. Existing Book / BookChapter logic stays intact.

## Goal / Acceptance

- New sidebar section **Outline** with an **Outlines** link.
- Outlines are stored in the existing Dexie `books` table; outline topics in `chapters`.
- Create an outline (like Book), open it (like the Book Chapter workspace), and generate
  topics (sub-outlines) using 11 **Generation Types** × 8 **Generation Modes**.
- Generated topics can be inserted into the outline **summary**, and each topic carries an
  **AI additional instruction** field (`additionalPrompt`).
- Legacy books and new books continue to appear in the Books list; outlines never appear there
  (list or dashboard).

## Locked Decisions

1. **Persistence**: reuse `books` / `chapters` with an additive discriminator
   `kind?: "book" | "outline"` on the book entity. Legacy and new books leave `kind`
   **undefined** (no write path change). Outlines store `kind: "outline"`.
2. **No Dexie schema bump**: `kind`, `generationType`, `generationMode`, `summary`, and
   `parentTopicId` are plain stored properties (Dexie persists full objects). All filtering is
   done in JS via `toArray().filter(...)`, consistent with the existing `BUIRepository.getList`.
   No new indexes, no version bump, no migration.
3. **Outline-only properties**: `generationType`, `generationMode`, `summary` (user-editable markdown).
4. **Nested topics**: add `parentTopicId?: number` to the chapter entity. Undefined = root.
5. **Generation Types (11)**: Guide, Architecture, Discussion, Lecture and Lesson, Study,
   Examination Helper, Tutorial/Walkthrough, Reference/Cheat Sheet, Project Roadmap,
   Research/Literature Review, Workshop/Lab. The stored `generationType` frames **both**
   structure generation and per-topic content prompts.
6. **Generation Modes (8)**: Sequential/Full-map, Chain-of-Thought, Control (standalone vs
   referencing), Parallel/Independent batch, Iterative Refine, Critique/Gap review,
   Recursive Tree expansion, Consolidate/Merge.
7. **Module strategy**: clone into a new `outlines/` folder. `bui.book-chapter.*` logic is
   untouched. The **only** change to existing book code is a JS `getList` filter override in
   `BUIBookRepository` (exclude outlines). The dashboard is also adjusted (see below).
8. **Sidebar**: new `section: "Outline"` containing the `Outlines` nav item.
9. **Author**: optional on an outline; generation offers opt-in "align with author profile" and
   "include skills" toggles only when an author is set.
10. **Generation UI**: modal/batch dialogs only (no separate chat/console route). Chain-of-Thought
    runs server-side turns with **no transcript stored or shown**.
11. **Summary**: user-editable markdown. Structure generation offers "Replace summary" or
    "Append topics to summary"; a separate action inserts a single topic into the summary
    without destroying existing text.

## Data Model Changes (additive only, no version bump)

### `src/modules/bunny-ai/src/modules/books/bui.book.entity.ts`
```ts
// BUIBookEntity
kind?: "book" | "outline";
generationType?: string;   // one of the 11 type keys
generationMode?: string;   // one of the 8 mode keys
summary?: string;          // markdown outline summary that topics are inserted into

// BUIBookChapterEntity
parentTopicId?: number;    // undefined = root topic; enables nesting / recursive tree
```
No logic changes; every field is optional, so existing consumers keep working.

### `src/modules/bunny-ai/src/modules/outlines/bui.outline.entity.ts` (new)
```ts
import { BUIBookEntity, BUIBookChapterEntity } from "../books/bui.book.entity";

export interface BUIOutlineEntity extends BUIBookEntity {
  kind: "outline";
  generationType: string;
  generationMode: string;
  summary?: string;
}
export interface BUIOutlineTopicEntity extends BUIBookChapterEntity {
  parentTopicId?: number;
  depth?: number; // TRANSIENT view-only (never persisted); set by getTopicsByOutline
}
export interface BUIOutlineParams {
  outline: BUIOutlineEntity;
  currentTopic?: BUIOutlineTopicEntity;
  topics?: { number: number; title: string; description?: string }[];
  siblingContext?: { number: number; title: string; description?: string; content?: string }[];
  priorResponses?: { title: string; content: string }[];
  author?: { name: string; description: string };
  skills?: { name: string; description?: string }[];
}
```

### `src/modules/bunny-ai/src/modules/books/bui.book.repository.ts` (only book change)
Override `getList` to exclude outlines while keeping legacy/new books:
```ts
async getList(_options: AdminPanelQueryOptions) {
  const data = (await this.set.toArray()).filter((b) => b.kind !== "outline");
  return this.result.successList(data.reverse());
}
```
Only the Books list calls `getList`/`panelGetAll`; other book consumers (`panelGetOne`) are
unaffected.

## Dashboard Adjustment

`src/app/modules/bunny-ai/dashboard/bui.dashboard.tsx` reads `buiDatabase.books.toArray()`
directly, so outlines would inflate Books. Update it to:
- derive `books` as `allBooks.filter(b => b.kind !== "outline")` and use it for the Books stat,
  "Recent Books", and the workspace summary;
- add an "Outlines" stat card (`allBooks.filter(b => b.kind === "outline")`) linking to
  `/modules/bunny-ai/outlines` (e.g. `ListTree` icon, distinct accent).

## File Inventory (exact paths)

New module files live under `src/modules/bunny-ai/src/modules/outlines/`, following the
`bui.<name>.<role>.<ext>` convention used by `books/`.

### Repositories
- `bui.outline.repository.ts` — extends `BUIBookRepository`; override `getList` to keep only
  `kind === "outline"`.
- `bui.outline-topic.repository.ts` — extends `BUIBookChapterRepository`; **override `getList`**
  so the table refresh path (`panelGetAll` → `getList`) returns the tree in DFS order:
  - read the `bookId` filter from options (as the parent does), `toArray().filter(bookId)`;
  - build the parent/child tree by `parentTopicId`, sort siblings by `number`, flatten depth-first;
  - attach a transient `depth` to each returned row;
  - add helpers `getChildTopics(outlineId, parentTopicId)` and `getNextTopicNumber(outlineId)`.

### Prompts
- `bui.outline.prompt.ts` — 11 generation-type entries (`{ key, name, systemPrompt, userPrompt }`)
  whose framing never says "book creation", plus a shared `generateOutlineExtraPrompt` requiring a
  JSON object:
  `{ summary: string, topics: [{ number, title, description, additionalPrompt, parentNumber? }] }`.
  Includes `authorProfileUserPrompt` / `noAuthorUserPrompt` variants (opt-in author).
- `bui.outline-topic.prompt.content.ts` — 11 type × shared mode-aware content prompt builder that
  writes ONLY markdown topic content, framed by generation type; each of the 8 modes declares how
  context is injected (see Generation Modes).
- Register both in `src/modules/bunny-ai/src/modules/prompt-viewer/bui.prompt-viewer.data.ts`
  (new "Outlines" module group).

### Server / actions
- `bui.outline.server.ts` — `buiOutlineServerGenerate(params, generationType, aiConfig)`: resolve
  type prompt → Handlebars compile → `buiContainer` `ai.doChat` → return raw JSON string.
- `bui.outline-topic.server.content.ts` — `buiOutlineTopicServerContent(params, generationType,
  generationMode, aiConfig)`: assemble mode-specific context → `ai.doChat` → return markdown.
- `bui.outline.action.content.ts` — orchestration:
  - `generateOutlineStructureAction(outlineId, { conflictMode, replaceSummary, ... })`: call
    `buiOutlineServerGenerate`, parse JSON, create topic rows (`parentTopicId` resolved from
    `parentNumber`), then replace or append `summary`.
  - `generateTopicContentAction(topicId, generationMode, aiConfig, opts)`: load outline + topics,
    build context per mode, call content server action, persist `content`, `wordCount`,
    `status: "done"`.
  - Mode handlers: standalone/referencing toggles, recursive-tree depth guard (default max depth 3),
    critique (append proposed topics only), consolidate (merge + remap `parentTopicId` of children).

### Modules
- `bui.outline.module.ts` — `BunnyConfig<BUIOutlineEntity, BUIOutlineEntity>` list module:
  columns (title, generationType, generationMode, description); form fields (title, optional author
  select, description editor, generationType select, generationMode select, summary editor). Row
  action opens `/modules/bunny-ai/outlines/{id}`. Mirror header/row action shape from
  `bui.book.module.ts`. Mutation `create` forces `kind: "outline"`, `status`-free.
- `bui.outline-topic.module.ts` — `BunnyConfig<BUIOutlineTopicEntity, BUIOutlineTopicEntity>` for
  the detail page (mirrors `bui.book-chapter.module.ts`): `tableMode: "mobile"`, fields (number,
  title, description, content, additionalPrompt, parentTopicId, status), header actions (Generate
  topics, Batch content pipeline), per-topic actions (generate content, read content). `query.getAll`
  delegates to `getTopicsByOutline(outlineId)`.

### Components
- `bui.outline.component.tsx` — list wrapper (`Bunny` + `BunnyForm`).
- `bui.outline.component.card.tsx` — outline detail header: title, generationType/Mode badges,
  summary markdown, optional author block (mirrors `bui.book.component.card.tsx`), plus an
  "Insert topic into summary" affordance.
- `bui.outline-topic.component.tsx` — workspace wrapper mirroring `bui.book-chapter.component.tsx`.
- `bui.outline-topic.component.mobile-view.tsx` — row view; indent via `row.depth`
  (padding + branch glyph) to visualize nesting.
- `bui.outline-topic.read-content.tsx` — read-content modal (clone of chapter read-content).
- `bui.outline-topic.component.generate.tsx` — generate dialog: Generation Type + Mode selects
  (defaulting to the outline's stored values), conflict mode (overwrite/skip/extend), summary
  replace/append toggle, opt-in author/skills toggles, per-topic AI additional instruction, and a
  "Insert topics into summary" option.
- `bui.outline-topic.component.pipeline.tsx` — batch dialog (clone of
  `bui.book-chapter.component.pipeline.tsx`) with Generation Mode selector driving
  sequential/batch/other modes.

### Routes
- `src/app/modules/bunny-ai/outlines/page.tsx` — renders `BUIOutlineComponent`.
- `src/app/modules/bunny-ai/outlines/[id]/page.tsx` — await `params`, render
  `BUIOutlineTopicComponent` with `outlineId`.
- `src/app/modules/bunny-ai/layout.tsx` — add nav item `{ href: "/modules/bunny-ai/outlines",
  label: "Outlines", icon: ListTree, section: "Outline" }`.

### Docs
- `src/modules/bunny-ai/src/modules/outlines/README.md` and
  `docs/tasks/task-outline-generation.md` (follow the `books/docs/tasks/` style).

## Generation Types — prompt framing (11)

The AI is told what artifact it is producing (never "a book"). Shared topic JSON schema.

| key | label | Framing |
|---|---|---|
| `guide` | Guide | Practical how-to; ordered steps, prerequisites, outcomes. |
| `architecture` | Architecture | Components, boundaries, data flow, decisions, trade-offs. |
| `discussion` | Discussion | Open questions, perspectives, arguments, counterpoints. |
| `lecture_lesson` | Lecture and Lesson | Teaching sequence: objectives → concepts → examples → review. |
| `study` | Study | Learning path: key ideas, drills, spaced-repetition prompts. |
| `exam_helper` | Examination Helper | Coverage map: likely question areas, checks, pitfalls. |
| `tutorial` | Tutorial/Walkthrough | Hands-on, incremental, runnable milestones. |
| `reference` | Reference/Cheat Sheet | Compact lookup: definitions, syntax, quick rules. |
| `roadmap` | Project Roadmap | Phased deliverables, milestones, dependencies. |
| `research` | Research/Literature Review | Themes, sources, hypotheses, evidence gaps. |
| `workshop` | Workshop/Lab | Exercises, materials, facilitator flow, expected results. |

## Generation Modes — behavior (8)

Context is assembled server-side per run; all modes use the same dialog/batch UI.

1. **Sequential / Full-map** — include every topic (number/title/description); write the current
   topic with continuity and no overlap.
2. **Chain-of-Thought** — include the outline plus prior topics' AI responses as ordered turns;
   each topic builds on earlier answers. Turns are internal only (no transcript persisted).
3. **Control (standalone vs referencing)** — per-run toggle. Standalone: no sibling context.
   Referencing: include configured sibling/prior context. For structure generation it also decides
   whether generated sub-topics reference each other.
4. **Parallel / Independent batch** — every topic generated independently in one pass, no sibling
   context.
5. **Iterative Refine** — regenerate/expand one existing topic against the outline summary;
   siblings untouched.
6. **Critique / Gap review** — audit topics for gaps, overlaps, ordering; propose topic insertions
   into the summary without rewriting content.
7. **Recursive Tree expansion** — expand a chosen topic into child topics via `parentTopicId`;
   guarded by a max-depth constant (default 3).
8. **Consolidate / Merge** — detect overlapping/duplicate topics, merge into one, remap any
   children's `parentTopicId`.

Shared constraints: content modes return only markdown content; structure generation returns the
JSON object; respect each topic's `additionalPrompt`; surface JSON/AI errors through the existing
error-modal pattern rather than throwing raw.

## Data Flow

1. **Create outline** — Outlines list → create form → persist with `kind: "outline"`.
2. **Open outline** — row action → `/modules/bunny-ai/outlines/{id}` → outline card (summary) +
   flattened, indented topics table.
3. **Generate structure** — Generate dialog (Type + Mode + conflict + summary replace/append) →
   `buiOutlineServerGenerate` → create topic rows (with `parentTopicId`) → write `summary`.
4. **Generate topic content** — per-topic action or batch pipeline → `buiOutlineTopicServerContent`
   with mode-specific context → persist content/wordCount/status.
5. **Insert/manage** — "Insert topic into summary" appends a topic entry to `summary`; recursive and
   consolidate modes mutate the topic tree. Refresh via `context.adminPanel.table.refresh()`.

## Backward Compatibility

- Legacy books (no `kind`) and new books (no `kind`) show in Books; outlines are excluded by the
  one `BUIBookRepository.getList` filter.
- Dashboard books stats/recent-year list exclude outlines.
- No chapter generation code touched; outline topics are ordinary chapter rows scoped to the
  outline's book id.
- No DB migration: fields are additive and unindexed.

## Out of Scope

- Export/download/print for outlines (no clone of `bui.book.export.*`).
- Wizard integration for outline creation.
- Persisting or displaying Chain-of-Thought transcripts.
- Skills-market integration changes.
- Editing any `bui.book-chapter.*` behavior beyond reusing its model/repository base.

## Validation Plan

1. `bun run lint` (script `eslint`).
2. `npx tsc --noEmit` (no typecheck script exists).
3. Manual:
   - Existing books list unchanged; a pre-existing book still opens its chapter workspace.
   - Dashboard Books count/recent list exclude outlines; Outlines stat links correctly.
   - Create an outline; it appears only under Outlines.
   - Generate structure with at least Guide, Architecture, Study; verify topics, `summary`,
     `kind`, and `generationType` persist; verify replace vs append summary behavior.
   - Generate content for a topic in each Mode (spot-check Sequential, Chain-of-Thought, Control
     standalone vs referencing, Recursive Tree depth guard, Consolidate remap).
   - Verify nested topics render indented and `parentTopicId` is set.
   - Prompt viewer lists the new Outlines prompt groups.

## Risks / Notes

- **Flat table**: HeroUI/Bunny table has no tree support, so nesting is simulated via DFS flatten +
  `depth` indent in the mobile view; ordering must be computed in the repository.
- **Context size**: Chain-of-Thought / Full-map can grow large; cap included context by topic count
  and/or character budget.
- **Shared tables**: outline ids and book ids share the `books` autoincrement; keep routes separate
  and always scope topics by `bookId`.
- **Next.js version**: this repo warns its Next.js differs from training data; read
  `node_modules/next/dist/docs/` before writing route/server-action code.

## Task Order (for the implementation agent)

1. Add the additive entity fields (`bui.book.entity.ts`) and the `BUIBookRepository.getList` filter.
2. Create `outlines/` repositories + `bui.outline.entity.ts`.
3. Author `bui.outline.prompt.ts` (11 types) and `bui.outline-topic.prompt.content.ts` (8 modes ×
   11 types); register in the prompt viewer.
4. Implement server actions and `bui.outline.action.content.ts` mode handlers.
5. Implement `bui.outline.module.ts` + list components + `/outlines` route.
6. Implement `bui.outline-topic.module.ts` + detail components (card, mobile view, generate,
   pipeline, read-content) + `[id]` route.
7. Add the sidebar nav item (`section: "Outline"`).
8. Adjust the dashboard (exclude outlines + Outlines stat).
9. Add README / task doc.
10. Run lint + `tsc --noEmit`; complete the manual smoke test.
