# Task: Outline Module (Topics, Outlines, Items)

## Intent

Add an **Outline** capability to `bunny-ai` alongside the existing Book /
BookChapter features:

- **Topic** — a reusable `{ id, title, description }` record (new `topics`
  table, Dexie v8). Manual + AI creation.
- **Outline** — a `books` row with `kind: "outline"`, an optional seed Topic,
  an outline-level AI instruction, a summary, and a chosen Generation Type +
  Mode.
- **Item** — an existing `chapters` row (flat) scoped to the outline's
  book id.

Existing Book / BookChapter behaviour is unchanged.

## Key decisions

- Outlines share the `books` table and are discriminated by `kind`. The Books
  list excludes them via a single `BUIBookRepository.getList` JS filter; the
  dashboard uses `allBooks.filter(b => b.kind !== "outline")` for book stats.
- Structure generation is mode-agnostic and returns JSON
  `{ summary, items: [{ number, title, description, additionalPrompt? }] }`.
- Item content writing is framed by 11 Generation Types × 7 Generation
  Modes and returns markdown only.
- Chain-of-Thought context is internal only; no transcript is stored or shown.

## Generation Types (11)

Guide, Architecture, Discussion, Lecture and Lesson, Study, Examination Helper,
Tutorial/Walkthrough, Reference/Cheat Sheet, Project Roadmap,
Research/Literature Review, Workshop/Lab.

## Generation Modes (7)

Sequential/Full-map, Chain-of-Thought, Control (standalone vs referencing),
Parallel/Independent batch, Iterative Refine, Critique/Gap review,
Consolidate/Merge.

## Files

- `src/modules/bunny-ai/src/modules/topics/*`
- `src/modules/bunny-ai/src/modules/outlines/*`
- `src/app/modules/bunny-ai/topics/page.tsx`
- `src/app/modules/bunny-ai/outlines/page.tsx`
- `src/app/modules/bunny-ai/outlines/[id]/page.tsx`
- `src/app/modules/bunny-ai/layout.tsx` (nav section "Outline")
- `src/app/modules/bunny-ai/dashboard/bui.dashboard.tsx` (Outlines stat)
- `src/modules/bunny-ai/src/database/bui.database.ts` (v8 `topics`)
- `src/modules/bunny-ai/src/modules/books/bui.book.entity.ts` + `.repository.ts`

## Validation

1. `bun run lint`
2. `npx tsc --noEmit`
3. Manual: Dexie upgrades to v8; legacy books/chapters intact; Books list and
   dashboard exclude outlines; create + AI-generate a Topic; attach it to an
   outline; generate the structure; write item content across modes;
   Prompt Viewer lists the Topics / Outlines groups.
