# Outlines

An **Outline** is a `books` row discriminated by `kind: "outline"`. It carries an
outline-level AI instruction (`additionalPrompt`), a selectable Generation Type
and Generation Mode, an optional selected Topic (`topicId`), optional
`minItems` / `maxItems` bounds for structure generation, and an
AI-generated markdown `summary` (not user-editable — the **description** is the
user-authored field). Its **items** are ordinary `chapters` rows scoped to
the outline's book id (flat, like chapters).

## Files

| File | Role |
|---|---|
| `bui.outline.entity.ts` | `BUIOutlineEntity`, `BUIOutlineParams` |
| `bui.outline.repository.ts` | Admin-panel CRUD over `books`, filtered to `kind === "outline"` |
| `bui.outline-chapter.repository.ts` | Item access (`getItemsByOutline`, `getNextItemNumber`) |
| `bui.outline.prompt.ts` | 11 Generation Type framings + shared JSON structure prompt; also the outline-draft prompt for AI create |
| `bui.outline-chapter.generate-mode.ts` | One self-contained definition per Generation Mode: instructions + context algorithm (markdown only) |
| `bui.outline-chapter.prompt.content.ts` | Thin facade exposing types/modes/build to the UI and Prompt Viewer |
| `bui.outline.server.ts` | `buiOutlineServerGenerate` → raw JSON structure; `buiOutlineServerGenerateDraft` → outline record |
| `bui.outline-chapter.ai.server.ts` | `runItemContent` — shared server-side AI call |
| `bui.outline-chapter.server.content.ts` | `buiOutlineChapterServerContent` Server Action → markdown |
| `src/app/api/bunny-ai/outlines/item-content/route.ts` | Route Handler powering the 3-wide parallel pool (not serialized) |
| `bui.outline.action.content.ts` | Structure generation + item content orchestration |
| `bui.outline.module.ts` / `bui.outline.component.tsx` | Outlines list |
| `bui.outline.component.card.tsx` | Detail header (type/mode badges, topic, author, summary) |
| `bui.outline.component.generate.tsx` | Structure-generation dialog |
| `bui.outline-chapter.*` | Item table, pipeline, per-row dialog, read modal |

## Generation Types (11)

`guide`, `architecture`, `discussion`, `lecture_lesson`, `study`, `exam_helper`,
`tutorial`, `reference`, `roadmap`, `research`, `workshop`.

## Generation Modes (7)

`sequential`, `chain_of_thought`, `control`, `parallel`, `iterative_refine`,
`critique`, `consolidate`.

## Data flow

1. Create an outline (title, optional author, optional Topic, Type, Mode,
   instruction, optional min/max items). Or generate one with the
   **Generate Outline with AI** header action on the Outlines list
   (`buiOutlineServerGenerateDraft`).
2. Open it at `/modules/bunny-ai/outlines/{id}`.
3. Generate the structure (Include-Topic opt-out toggle, conflict mode, summary
   replace/append, insert Topic). The selected Topic is included by default;
   uncheck the toggle to exclude it. The outline's `generationType` frames the
   prompt by default; an **Override** toggle swaps it for one run. `minItems`
   / `maxItems` bound how many items are produced → item rows
   + `summary`.
4. Write item content per row or in a batch with the 7 modes. Both default
   to the outline's `generationType` / `generationMode`; an **Override** toggle
   (per row) or **Use the outline's Generation Mode** toggle (batch) changes the
   framing for that run only. Both also include the outline's selected Topic by
   default, with an **Include the selected Topic** opt-out toggle.

---

## Structure generation (mode-agnostic)

Triggered by `generateOutlineStructureAction(outlineId, options, aiConfig)` from
the **Generate Structure** dialog. This is a single AI call that returns JSON —
the Generation *Mode* is not used here.

```
outline (+ topics/author/skills) ──► buiOutlineServerGenerate ──► raw JSON
                                                                     │
                          parseOutlineStructure ◄────────────────────┘
                                     │
      conflict mode ────────────────►│ delete / skip / offset existing rows
                                     ▼
             panelCreate item rows (status: "pending")
                                     │
     summary replace/append + insert-topic ──► panelUpdate outline.summary
```

Steps:

1. Load the outline, all existing items, the optional selected Topic
   (`outline.topicId`), the optional author, and optional author skills.
2. `buiOutlineServerGenerate` frames the prompt by the outline's
   `generationType` (11 Types) and includes the selected Topic by default
   (`{{#if topic}}`), omitting it only when the Include-Topic opt-out toggle is
   off. The dialog's **Override**
   toggle (default off) can supply a different Type for one run via
   `options.generationType` without mutating the outline record. When
   `minItems` / `maxItems` are set they are injected into the prompt,
   and the result is clamped to `maxItems` defensively.
3. The AI must return
   `{ summary, items: [{ number, title, description, additionalPrompt? }] }`.
   `parseOutlineStructure` strips code fences, extracts the first `{...}`, and
   coerces every field (missing `number` becomes its 1-based index).
4. Conflict handling against existing rows:
   - `overwrite` → delete every existing item first.
   - `skip` → keep everything and return early.
   - `extend` → `numberOffset = max(existing.number)`; new numbers are shifted.
5. Then:
   - `insertTopic && includeTopic && topic` → prefix the summary with a
     `## Topic: …` block (`applyTopicToSummary`).
   - `summaryMode === "append"` and a non-empty existing summary → prepend the
     old summary (blank-line separated); otherwise replace.
6. Persist item rows and the updated `summary`.

---

## Item content pipeline

Triggered per-row (row action / modal header) or in the batch **AI Content
Writing** pipeline. Both call
`generateItemContentAction(itemId, generationMode, aiConfig, options)`,
which differs only in how many items it loops over.

```
itemId, mode, options
        │
        ▼
1. panelGetOne(item)  ──► status = "being_generated"
        │
2. load outline + ALL items (+ topic, author, skills)
        │
3. resolveItemModeContext(mode, all, currentId, referencing, referencedIds)
        │        └─► { priorResponses } | { siblingContext } | {}
        ▼
4. BUIOutlineParams = { outline, topic, items (full map),
                        currentItem, author, skills, ...modeContext }
        │
5. buildItemContext(params, generationType, mode)
        │        └─► messages[]: system instruction + discrete context
        │            messages (artifact / full map / references) + prior
        │            user/assistant turns (Chain-of-Thought) + final task turn
        ▼
6. POST /api/bunny-ai/outlines/item-content  (Route Handler)
        │   runItemContent → ai.doChatWithHistory({ messages, temperature: 0.7 })
        ▼
7. persist { content, wordCount, status: "done" }
        │   on error: reset { status: "empty" } and rethrow
        ▼
   context.adminPanel.table.refresh()
```

Key properties:

- **Type framing × mode**: the 11 Generation Types supply the artifact framing
  and label injected into the mode instructions. The outline's `generationType`
  decides the framing; the caller's `generationMode` selects the context
  algorithm.
- **No prompt stuffing**: `bui.outline-chapter.generate-mode.ts` holds each
  mode's instructions and its `context` algorithm. `defineMode` turns that into
  a structured messages array — a system message, the artifact frame, the
  mode's own context messages and a final task turn — sent verbatim via
  `ai.doChatWithHistory`.
- **Artifact context** (always) carries the outline title/description/instruction/
  summary, the selected Topic (title + content), and the Author profile + skills.
  The Topic is resolved unless `options.includeTopic` is `false` (the per-row and
  batch **Include the selected Topic** opt-out).
- **Full map** lives in `params.items` (number, title, description — no
  content). Modes decide whether to emit it as a context message.
- **Context budget** (`capPriorResponses`): only Chain-of-Thought uses it —
  nearest-first, at most 25 items and ~16,000 characters of assistant content.
- **Status lifecycle**: `empty` → `being_generated` → `done` (or back to
  `empty` on failure). `wordCount` = `content.split(/\s+/).filter(Boolean).length`.
- **Batch pipeline**: `writeMode: "empty"` targets `status !== "done" || no
  content`, `"all"` rewrites everything. Execution strategy follows the mode:
  every non-parallel mode processes rows **in ascending `number` order**
  (required for Chain-of-Thought) via `generateItemContentAction`. The table
  refreshes after each row. The batch defaults to the outline's `generationMode`
  (toggle **Use the outline's Generation Mode**); unchecking it enables the mode
  selector for a one-run override.
- **Parallel pool (3-wide)**: Next.js dispatches Server Actions **one at a time
  per client**, so N single-content Server Actions run sequentially. To get real
  concurrency, `generateItemContentAction` calls the Route Handler
  `POST /api/bunny-ai/outlines/item-content` — Route Handlers are **not**
  serialized. `parallel` then runs a sliding pool of `PARALLEL_CONCURRENCY` (3):
  three items are `writing` at once and everything else stays `pending`; as a
  slot frees up the next pending item starts. The **Parallel Writing In Progress**
  modal shows each item's live status (writing / pending / failed).
- **Control references**: the per-row dialog lets you pick which items to
  reference (`options.referencedIds`); with `referencing` on and no explicit
  pick, all other items are referenced.

---

## Generation Mode algorithms (7)

Each mode is defined once in `bui.outline-chapter.generate-mode.ts` as an object
holding its instructions and a `context` algorithm. `defineMode` turns that into
a messages array: a system message, the shared artifact context, the mode's own
context messages, and a final task turn. No `{{#each}}` stuffing and no
Handlebars — the server sends the array via `ai.doChatWithHistory`.

Every mode always includes the artifact context (outline title/description/
instruction/summary + selected Topic + Author profile/skills) — the Topic unless
the caller opts out. What differs is the
mode-specific `context` between the artifact and the task turn.

### 1. `sequential` — Sequential / Full-map

- **Context**: the full map — every item as `number. title — description`.
  No prior content.
- **Algorithm**: write the current item while holding the whole plan in
  context; keep continuity with earlier items and set up later ones
  without repeating them.
- **Best for**: the first content pass over empty items in one run.
- **Ordering**: ascending `number` order (the batch default).

### 2. `chain_of_thought` — Chain-of-Thought (multi-turn)

- **Context**: `priorResponses` — every item with `number <
  current.number`, non-empty `content`, sorted ascending, capped by
  `capPriorResponses` (nearest-first, ≤25 items / ≤16k chars).
- **Algorithm**: each prior item is pushed as a real **user** request
  followed by its stored **assistant** response, then the current item is
  the final **user** turn. The model reasons over actual conversation turns and
  extends the chain without restating it.
- **Constraint**: prior content must already exist, so run in ascending order.
  The transcript is reconstructed from stored content — never persisted as a
  separate chat log or shown in the UI.

### 3. `control` — Control (standalone vs referencing)

- **Context**: `siblingContext` — ONLY the items chosen as references for
  this row (via the dialog's `referencedIds`), rendered with any existing draft
  content. When none are chosen (or `referencing` is off) the mode emits a
  standalone message instead.
- **Algorithm**: reference the selected context explicitly, or write a
  self-contained unit when nothing is referenced.
- **Best for**: A/B testing how much sibling context improves coherence.

### 4. `parallel` — Parallel / Independent batch

- **Context**: artifact only — no full map, no siblings.
- **Algorithm**: write the current item as a fully self-contained unit.
- **Pipeline execution**: the **only** mode that runs the batch concurrently
  (bounded pool of 4) and reports each in-flight row; every other mode is
  strictly sequential.

### 5. `iterative_refine` — Iterative Refine

- **Context**: the current item's **existing content**. Siblings are never
  loaded.
- **Algorithm**: regenerate and expand ONLY the current item so it better
  matches the outline summary; explicitly do not reference or modify siblings.
- **Best for**: polishing a single row after a summary change; idempotent to
  re-run since it only reads/writes the same row.

### 6. `critique` — Critique / Gap review (propose only)

- **Context**: the full map.
- **Algorithm**: an audit, not a rewrite. Produces a markdown report listing
  Gaps, Overlaps, Ordering suggestions, and Proposed insertions (title +
  description) — explicitly without rewriting existing content.
- **Output handling**: the report is persisted as the current item's
  `content` (read it via the read-content modal). Applying proposed insertions
  is a manual follow-up; this mode never creates rows.

### 7. `consolidate` — Consolidate / Merge

- **Context**: the full map.
- **Algorithm**: detect overlapping/duplicate items from the current one
  onward and merge them into a single coherent markdown unit, removing
  redundancy while preserving all unique coverage.
- **Output handling**: the merged markdown is persisted to the current
  item. Automatic deletion/merging of the duplicate sibling rows is a
  manual follow-up; this mode only produces the merged content.

### Quick reference

| Mode | Mode context | Output | Alters siblings? |
|---|---|---|---|
| `sequential` | full map (no sibling content) | current content | no |
| `chain_of_thought` | prior turns as user/assistant messages (ordered, capped) | current content | no |
| `control` | chosen reference rows, or standalone | current content | no |
| `parallel` | none (artifact only) | current content | no |
| `iterative_refine` | current existing content | refined current content | no |
| `critique` | full map | audit report (stored as content) | no |
| `consolidate` | full map | merged content | no |
