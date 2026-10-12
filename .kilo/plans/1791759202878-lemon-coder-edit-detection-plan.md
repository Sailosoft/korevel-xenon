# Lemon Coder — Harden SEARCH/REPLACE Detection + Cut Output Tokens

## Goal

In `src/modules/lemon-coder`, make AI-produced `Edits[]` (SEARCH/REPLACE) apply
more reliably and consume fewer tokens (input **and** output), **without
regressing wrong-edit safety** and **without a stored-schema change**.

## Confirmed decisions (from prior Q&A)

- Target: lemon-coder `Edits[]` SEARCH/REPLACE path (not bunny-dev patches).
- Keep the `Search`/`Replace` schema; add an **anchor** strategy. Backward compatible.
- Anchors = first `<=30` chars of the first and last non-empty `Search` lines (prefix anchors).
- **Sequencing:** the `Search` = 1-3 line rule ships with the anchor matcher. Phase 0
  keeps moderate line guidance so it cannot cause a detection dip.
- **Overshoot policy (uniqueness-first):** when both anchors are unique (single
  line-leading occurrence, end after start) any span is allowed; the bounded-span cap
  and middle-line disambiguation apply only when anchors are non-unique.
- Provider call-param changes (temperature/`max_tokens`) and streaming are **out of
  scope** for this plan and captured in the Deferred backlog.

## Current implementation (verified)

- Engine `applySearchReplace()` — `useLCChat.ts:240-355`. Order: exact → `fuzzyIndexOf`
  (whitespace-collapsed, `:138`) → trailing-ws → partial-block (**only when
  `searchLines.length >= 4`**, `:293`) → multiple-match (prefers **`lastIndexOf`**, `:321-332`).
- Empty `Search` currently matches at index 0 (no guard).
- Stash builder reads each file **in full, uncapped** and embeds it: `useLCChat.ts:604-633`.
- Agent/Plan/Ask resend **all** previous messages each turn: `useLCChat.ts:696-703`.
- Edit rule "3-10 lines per block" duplicated: `LCPromptMode.Code.ts:44`, `LCPromptMode.Agent.ts:40`.
- Both system messages demand the **complete file**: `actions.ts:48-50`, `useLCChat.ts:688-690`.
- Apply-to-disk writes directly after accept: `LCApp.tsx:572-598` (and `LCStudio.tsx:585`).
- `response.usage` is discarded; no token logging (`actions.ts`).
- Consumers of `applySearchReplace` (signature must stay stable): `LCChatView.FileDiff.tsx`,
  `LCMainContent.tsx`, `LCApp.tsx`, `LCStudio.tsx`.
- No test runner (`package.json` has only `lint`); `tsx` is available for scratch checks.

## Success metrics

Measure after Phase 0 and again after Phase 1 (use the T4 log):
- **Output tokens per existing-file edit** — target: majority reduction vs baseline.
- **Apply rate** on a small drift test set (exact / trailing-ws / drifted-edge cases) — must not decrease.
- **Silent wrong-region writes = 0** (guarded by T9 + anchor guards).

---

## Phase 0 — Token + context wins, no detection risk (ship first)

### T1. Extract a shared edit-rules builder

- New file `src/modules/lemon-coder/src/LCPromptMode.EditRules.ts` exporting
  `buildEditOutputRules(): string[]`.
- Use it from `LCPromptMode.Code.ts` and `LCPromptMode.Agent.ts`, deleting their
  duplicated `### OUTPUT RULES`…`### Summary` blocks. No other prompt sections change.

### T2. Rules text (keep moderate line guidance in this phase)

- A) NEW file: `ExistingFile=false`, full file in `Content`.
- B) EXISTING file: `ExistingFile=true`, `Edits[]`, `Content=""`.
- `Search`: **3-6 lines** for now (the unchanged matcher handles this length).
  Keep the FIRST and LAST lines short — `<=30` characters where possible.
- `Replace`: the new lines written in place of `Search`.
- `Description`: `<=6` words.
- Keep existing JSON-escaping rules; shrink the JSON example (fewer, shorter lines).

> Do **not** switch to "1-3 lines" here. Short `Search` without the anchor matcher
> loses the `>=4`-line partial-block fallback and can reduce the apply rate.

### T3. Fix both system messages (the largest output-token win)

Replace the "always output the COMPLETE file…" sentence in `actions.ts:48-50`
and the conversation copy at `useLCChat.ts:688-690` with:

> For NEW files return the complete file in Content. For EXISTING files return
> Edits and set Content to "". Never restate unchanged lines or the whole file.

Keep the JSON-escaping text as-is.

### T4. Log token usage (measurement — do first)

- In both used server actions (`callHelixAI`, `callHelixAIWithConversation` in
  `actions.ts`), read `response.usage` and log `prompt_tokens` / `completion_tokens`
  (plus provider/model). Non-invasive; no behaviour change.
- Enables the Success metrics above and any later tuning.

### T5. Cap stashed context per file (largest input-token win)

- Add `const MAX_STASH_CHARS_PER_FILE = 20000;` and truncate each stashed file's
  content in the stash builder (`useLCChat.ts:604-633`), appending a marker like
  `\n…(truncated)` — mirroring bunny-dev's `MAX_CONTENT_CHARS` (`BDFileAI.Server.ts:29`).
- Note (optional): a total-stash budget across all files can reuse the same idea later.

---

## Phase 1 — Detection: anchor matcher + shorter Search

Ship T6-T10 together. Replace semantics change here, so the prompt rule (T10) and
the matcher (T6-T8) must land in the same release.

### T6. Anchor helpers (module-level in `useLCChat.ts`)

- `const ANCHOR_MAX_CHARS = 30;`
- `const ANCHOR_MIN_CHARS = 6;`
- `const ANCHOR_MAX_SPAN_SLACK = 2;` (fallback guard only; see T7)
- `const ANCHOR_MAX_SCAN = 50;` (perf cap on enumerated occurrences)
- `lineStartAt(content, pos)` → index after the preceding `\n` (0 if none).
- `lineEndAt(content, pos)` → index of the next `\n` at/after `pos` (`content.length` if none).
- `isLineLeading(content, pos)` → every char from `lineStartAt(content,pos)` to `pos` is whitespace.
- `anchorIndexOf(content, anchor, fromPos)` → exact `indexOf` first; else reuse the
  `collapseWhitespace` position mapping (as in `fuzzyIndexOf`). **After fuzzy mapping,
  re-validate `isLineLeading(content, pos)`; if false, keep scanning.** Return offset or `-1`.
- `buildAnchors(search)`:
  - Normalise CRLF→LF, split lines, drop leading/trailing blank lines.
  - `start` = first non-blank line `.trim()`; `end` = last non-blank line `.trim()`;
    `middle` = the trimmed lines between them.
  - Truncate `start`/`end` to `ANCHOR_MAX_CHARS`; `single = (firstIndex === lastIndex)`.
  - Return `null` when no non-blank line remains.

### T7. `findAnchorRegion` — uniqueness-first

1. `buildAnchors`; bail (`null`) if `null`, or `start.length < ANCHOR_MIN_CHARS`,
   or (`!single` and `end.length < ANCHOR_MIN_CHARS`).
2. Enumerate **line-leading** occurrences of `start` (via `anchorIndexOf`, capped at
   `ANCHOR_MAX_SCAN`). None → `null`.
3. **Single-line** (`single`):
   - Exactly one occurrence → return its line: `{ rs: lineStartAt(p), re: lineEndAt(p) }`.
   - More than one → `null` (skip anchor path; existing multiple-match flow runs).
4. **Multi-line**: enumerate line-leading occurrences of `end`; build candidates
   `{ rs, re, startPos, endPos }` for each start occurrence with an end occurrence at/after
   `startPos + start.length`. No candidate → `null`.
5. **Decide (uniqueness-first):**
   - `startUnique = startOccurrences.length === 1`; `endUnique = endOccurrences.length === 1`.
   - **Both unique** → use the single candidate. **No span cap** (region is unambiguous;
     enables anchor-only large-block replacement).
   - **Either non-unique:**
     - `middle` non-empty (Search had >=3 lines) → among candidates within
       `lineCount + ANCHOR_MAX_SPAN_SLACK` lines, pick the one whose `middle` matches the
       candidate region's middle lines (whitespace-normalised). Exactly one winner → use it.
       No winner, or a tie → **throw**.
     - `middle` empty (Search = 2 lines) → **throw** (cannot disambiguate; fail loud).
6. Region boundaries: `rs = lineStartAt(content, startPos)`,
   `re = lineEndAt(content, endPos + end.length)`.

### T8. Wire into the apply loop

```
if (search.trim() === "") throw new Error(/* existing helpful wording */);

let idx = content.indexOf(search);              // Strategy 1: exact (unchanged)
let regionEnd = idx === -1 ? -1 : idx + search.length;
let matchedViaAnchor = false;

if (idx === -1) {                                // Strategy 2: anchor (NEW)
  const region = findAnchorRegion(content, search);
  if (region) { idx = region.rs; regionEnd = region.re; matchedViaAnchor = true; /* warn */ }
}
// existing fuzzy / trailing-ws / partial-block set regionEnd = idx + search.length.
// The multiple-match step is scoped to non-anchor matches only (see T9).

content = content.slice(0, idx) + edit.Replace + content.slice(regionEnd);
```

Anchor-path failures fall through to the existing strategies; if all fail, the
existing "did not match" error keeps the UI raw-preview fallbacks working
(`LCChatView.FileDiff.tsx`, `LCMainContent.tsx`).

### T9. Fail loud on multiple matches (close the `lastIndexOf` bias)

- In `applySearchReplace`, replace the multiple-match block (`useLCChat.ts:321-332`):
  when a **non-anchor** match has a second occurrence of `search`, **throw** the existing
  "did not match / ambiguous" style error instead of silently using `content.lastIndexOf`.
- Scope it with `matchedViaAnchor`: skip this check for anchor matches (their guards
  already resolved uniqueness). This makes the non-anchor path consistent with the
  anchor path's fail-loud policy. Behaviour change vs today (previously warn + last
  occurrence) — call out in the change description.

### T10. Switch the prompt rule to short Search (same release as T6-T8)

In the shared builder from T1:
- `Search`: **1-3 lines**. FIRST and LAST lines are anchors — keep each `<=30`
  characters where possible. Do NOT include unchanged surrounding lines.
- `Replace`: the new text for the **entire region from the first anchor line through
  the last anchor line, inclusive**. For a single-line change, `Search` is that one
  line and `Replace` is the new line.
- Keep `Description <=6` words, JSON-escaping rules, and the slim example.

---

## Phase 2 — Docs (optional)

- Update `docs/FILE_DIFF.md` §2: anchor Strategy 2, guards, new `Replace` semantics,
  and the T9 ambiguity behavior.

---

## Deferred backlog (captured, not in this plan)

- **Edit-mode temperature** drop to ~0.1-0.2 (`actions.ts`) — reverses the earlier
  "no call-param changes" decision; expect fewer drift/retry cycles.
- **`max_tokens` cap** + require a one-line `AIMessage` (bounds runaway output).
- **Conversation history windowing/summarization** (`useLCChat.ts:696-703`).
- **Retrieval** (Orama + Helix embeddings) instead of whole-file stash — structural
  input-token reduction.
- **Streaming** responses (perceived latency only).

---

## Risks & mitigations

- **Wrong-region write via anchors** — line-leading requirement, uniqueness-first
  (both unique → unambiguous), throw-on-ambiguity, exact-first + all fallbacks retained.
- **Region overshoot for large blocks** — allowed only when both anchors are unique
  (single site in file); otherwise the span cap applies.
- **T9 behaviour change** — previously-silent multiple matches now throw; safer, but
  surfaces as a loud failure where an edit used to (sometimes wrongly) apply.
- **Stash truncation (T5)** — a truncated file may hide context the model needs; the
  marker makes it visible, and `MAX_STASH_CHARS_PER_FILE` is tunable.
- **`Replace` semantics change** — stated explicitly in T10; single-line edits unaffected.
- **Backward compatibility** — full `Search` blocks still hit exact matching first; no schema/DB change.
- **No automated tests** — scratch-script + manual verification below.

## Validation

Run `npm run lint` at the end. Use a temporary `npx tsx` scratch script importing
`applySearchReplace`.

Anchor matcher checks:
- a. Exact full block still applies unchanged.
- b. Unique start+end anchors, only anchor lines given, drifted middle → whole region replaced.
- c. Trailing-whitespace differences per line → still matches.
- d. Non-unique start, end + middle lines disambiguate → correct span (within span cap).
- e. Non-unique anchors with no middle lines → **throws** (no guess).
- f. Generic anchor (`}` / `return;`, `< ANCHOR_MIN_CHARS`) → anchor skipped, no corruption.
- g. Non-unique anchors, span beyond cap → **rejected**, falls through.
- h. Empty `Search` → clear error.
- i. CRLF input → correct region.
- j. `start === end`, unique → replaces just that line.
- k. `start === end`, non-unique → anchor skipped (existing flow), then T9 → **throws**.
- l. Non-anchor match appearing twice → T9 **throws** (no `lastIndexOf` write).

Other checks:
- T4: confirm prompt/completion token logs appear for both actions.
- T5: stash a file > 20k chars → content truncated with marker.
- Prompt/system-message: confirm the three diff paths still render
  (`LCChatView.FileDiff.tsx`, `LCMainContent.tsx`, `LCApp.tsx`/`LCStudio.tsx`).
- Success metrics: A/B one edit prompt; record output-token drop and apply rate.

## Rollout / rollback

- Phase 0 and Phase 1 are separate commits; Phase 0 ships first. Each is self-contained
  and revertible with no data migration.
- T9 is the only intentional behaviour change in Phase 1; note it in the commit message.

## Open questions / tunables

- None blocking. Tunables with defaults: `ANCHOR_MIN_CHARS=6`, `ANCHOR_MAX_SPAN_SLACK=2`,
  `ANCHOR_MAX_SCAN=50`, `ANCHOR_MAX_CHARS=30`, `MAX_STASH_CHARS_PER_FILE=20000` — adjust
  after the scratch-script + metrics run.
