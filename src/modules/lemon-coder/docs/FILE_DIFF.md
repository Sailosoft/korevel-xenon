# File Diff & Hot Replacement

> How Lemon Coder computes, previews, and applies file changes from AI responses.

---

## Architecture Overview

When the AI modifies files, the data flows through three phases:

```
AI Response ──► Normalisation ──► Diff Preview ──► Apply (Hot Replace)
                     │                  │
                SEARCH/REPLACE     Monaco / Inline / Modal
                Edits → Content        display
```

---

## 1. Data Model

### [`LCFileActionResult`](../src/LCInterface.ts:91) — A single file change

```typescript
interface LCFileActionResult {
  FileName: string;        // e.g. "Button.tsx"
  ExistingFile: boolean;   // true = update, false = create
  FileDirectory: string;   // e.g. "components/ui"
  Description: string;     // human-readable summary
  Content: string;         // full file content (NEW files) OR empty (Edits-only files)
  Edits?: LCFileEdit[];    // SEARCH/REPLACE blocks (existing files)
}
```

Two modes:

| Mode | `ExistingFile` | `Content` | `Edits` |
|------|---------------|-----------|---------|
| **New file** | `false` | Full file content | `undefined` |
| **Existing file** | `true` | `""` (empty) | `SEARCH/REPLACE[]` |

### [`LCFileEdit`](../src/LCInterface.ts:111) — A single SEARCH/REPLACE block

```typescript
interface LCFileEdit {
  Description?: string;  // "Added variant prop"
  Search: string;        // exact lines to find (must match character-for-character)
  Replace: string;       // new lines to write in place of Search
}
```

---

## 2. SEARCH/REPLACE Algorithm

The core engine is [`applySearchReplace()`](../src/useLCChat.ts:240).

It applies edits **sequentially** — each edit searches in the result of the previous edit.

### Progressive fallback strategies

```
Strategy 1: Exact match (indexOf)
    └─ Fail? → Strategy 2: Whitespace-agnostic (fuzzyIndexOf)
        └─ Fail? → Strategy 3: Trailing-whitespace-agnostic
            └─ Fail? → Strategy 4: Partial-block match
                └─ Fail? → Strategy 5: Multiple-match detection
                    └─ Fail? → Error with context
```

### Strategy 3 — Trailing-whitespace-agnostic

```typescript
// [`useLCChat.ts:269-285`](../src/useLCChat.ts:269)
const trimTrailing = (s: string) =>
  s.split("\n").map(l => l.trimEnd()).join("\n");

const trimmedContent = trimTrailing(content);
const trimmedSearch = trimTrailing(search);
const trimmedIdx = trimmedContent.indexOf(trimmedSearch);

if (trimmedIdx !== -1) {
  // Validate position maps back to original content
  const candidate = trimTrailing(
    content.slice(trimmedIdx, trimmedIdx + search.length)
  );
  if (candidate === trimmedSearch) {
    idx = trimmedIdx; // matched!
  }
}
```

Handles: AI adds/removes trailing spaces on lines during generation.

### Strategy 4 — Partial-block match

```typescript
// [`useLCChat.ts:291-318`](../src/useLCChat.ts:291)
const searchLines = search.split("\n");
if (searchLines.length >= 4) {
  // Try without the first line
  const withoutFirst = searchLines.slice(1).join("\n");
  // Try without the last line
  const withoutLast = searchLines.slice(0, -1).join("\n");
}
```

Handles: AI includes an extra adjacent context line that no longer matches the current file.

### The edit application

```typescript
// [`useLCChat.ts:349-351`](../src/useLCChat.ts:349)
content = content.slice(0, idx)    // everything before match
       + edit.Replace              // insert replacement
       + content.slice(idx + search.length); // everything after match
```

---

## 3. Three Diff Display Paths

### Path A — Inline Chat Diff (expandable rows)

**File:** [`LCChatView.FileDiff.tsx`](../src/LCChatView.FileDiff.tsx)

Triggered by clicking the chevron on a file action row in a chat message.

```typescript
// [`LCChatView.FileDiff.tsx:189-212`](../src/LCChatView.FileDiff.tsx:189)
if (!modified && hasEdits && diffState) {
  try {
    modified = applySearchReplace(diffState, file.Edits!).content;
  } catch {
    // ── Fallback: show Replace blocks as raw preview ──
    showWarning = true;
    modified = buildReplaceBlockPreview(file.Edits!);
  }
}
```

- Renders [`LCDiffDisplay`](../src/LCDiffDisplay.tsx) — a custom line-by-line unified diff
- Uses the [`diff`](https://www.npmjs.com/package/diff) package (`diffLines`)
- Color-coded: green = added, red = removed

### Path B — Full-Page Monaco Diff

**File:** [`LCMainContent.tsx`](../src/LCMainContent.tsx)

Triggered by clicking the **Diff** button next to a file action.

```typescript
// [`LCMainContent.tsx:114-191`](../src/LCMainContent.tsx:114)
const handlePreviewDiff = useCallback(
  async (fileAction: LCFileActionResult) => {
    // 1. Read original content from disk
    let originalContent = "";
    if (onReadFileContent && fileAction.ExistingFile) {
      originalContent = await onReadFileContent(filePath);
    }

    // 2. Try SEARCH/REPLACE
    let resolvedContent = fileAction.Content;
    if (!resolvedContent && hasEdits && originalContent) {
      try {
        const result = applySearchReplace(originalContent, fileAction.Edits);
        resolvedContent = result.content;
      } catch (err) {
        // ── Fallback: raw preview ──
        resolvedContent = buildReplaceBlockPreview(fileAction.Edits!);
      }
    }

    // 3. Open Monaco DiffEditor
    setDiffPreview({
      fileAction: { ...fileAction, Content: resolvedContent },
      originalContent,
      filePath,
    });
    setViewMode("diff");
  },
  [onReadFileContent],
);
```

Renders [`LCFileView`](../src/LCFileView.tsx) with Monaco's `DiffEditor`:

```typescript
// [`LCFileView.tsx:373-406`](../src/LCFileView.tsx:373)
<MonacoDiffEditor
  original={normalisedContent}
  modified={normalisedDiffContent}
  renderSideBySide={true}
  keepCurrentOriginalModel
  keepCurrentModifiedModel
/>
```

### Path C — View All Changes Modal

**File:** [`LCChatView.FileDiff.tsx`](../src/LCChatView.FileDiff.tsx) (same file, different component)

Triggered by the "View All Changes" button in chat.

Shares the same SEARCH/REPLACE + fallback logic as Path A, but rendered inside a modal with expand/collapse-all controls.

### The unified fallback (all 3 paths)

When SEARCH/REPLACE fails to match, instead of showing **original vs blank**, we construct a raw preview:

```typescript
// [`useLCChat.ts:157-170`](../src/useLCChat.ts:157) (also in LCChatView.FileDiff.tsx)
function buildReplaceBlockPreview(edits: LCFileEdit[]): string {
  const replaceBlocks = edits.map((e, i) => {
    const desc = e.Description || `Edit ${i + 1}`;
    return `// === AI: ${desc} ===\n${e.Replace}`;
  }).join("\n\n");

  return [
    "// ═══════════════════════════════════════════════════════════",
    `// ⚠ SEARCH/REPLACE could not match the current file content.`,
    `// Below are the AI's intended replacements as a raw preview.`,
    "// ═══════════════════════════════════════════════════════════",
    "",
    replaceBlocks,
  ].join("\n");
}
```

---

## 4. Hot Replacement (Apply to Disk)

**File:** [`useLCChat.ts:832-904`](../src/useLCChat.ts:832)

When the user clicks **Apply** or **Accept Changes**, [`applyFileChanges()`](../src/useLCChat.ts:832) writes the modified content to disk.

```typescript
const applyFileChanges = useCallback(
  async (fileActions: LCFileActionResult[], options?) => {
    for (const action of fileActions) {
      const filePath = resolveFilePath(action);
      let outputContent = action.Content;

      // ── SEARCH/REPLACE: re-read file from disk and patch ──
      if (hasEdits && options?.readFileContent) {
        const currentContent = await options.readFileContent(filePath);
        const result = applySearchReplace(currentContent, action.Edits!);
        outputContent = result.content;
      }

      // ── Write to disk ──
      if (options?.writeFileContent) {
        await options.writeFileContent(filePath, outputContent);
      } else {
        // Fallback: browser download
        const blob = new Blob([outputContent], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = action.FileName;
        a.click();
        URL.revokeObjectURL(url);
      }
    }
  },
  [],
);
```

Key details:

- **Existing file + Edits:** Re-reads the file from disk (not from cache), applies SEARCH/REPLACE, writes result. This ensures the latest on-disk content is patched, even if the user edited the file since the stash was captured.
- **New file:** Writes `Content` directly.
- **Browser fallback:** If no `writeFileContent` callback is provided, falls back to a Blob download.

---

## 5. AI Output Sanitisation

**File:** [`useLCChat.ts:75-128`](../src/useLCChat.ts:75)

Before SEARCH/REPLACE runs, [`sanitiseEscapedContent()`](../src/useLCChat.ts:75) cleans up common AI JSON generation errors:

| Issue | Fix |
|-------|-----|
| `\\n` (double-escaped) → real newlines | `replace(/\\n/g, "\n")` |
| `\\"` (double-escaped quotes) → `"` | `replace(/\\"/g, '"')` |
| `\\t` / `\\r` → tab / carriage return | `replace(/\\t/g, "\t")` |
| `</style>` → `/style>` (broken closing tag) | Regex: `(^|[\n}])\/(tagName)>` → `$1<\/$2>` |

The broken closing tag fix addresses a subtle JSON escaping issue:

```typescript
// [`useLCChat.ts:111-125`](../src/useLCChat.ts:111)
// AI writes in JSON:  "<\/style>"
// JSON.parse interprets: \/ → /
// Result: "/style>"  ← missing "<" !
//
// Fix: restore "<" when /tagName> appears after }, newline, or start-of-line
result = result.replace(
  /(^|[\n}])\/([a-zA-Z]\w*)\s*>/gm,
  (_, before, tagName) => `${before}</${tagName}>`,
);
```

---

## 6. Data Flow Diagram

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  AI Response │────►│  normaliseFile   │────►│  DB Storage     │
│  (JSON)      │     │  Edits()         │     │  (IndexedDB)    │
└─────────────┘     │  - sanitise       │     └────────┬────────┘
                    │  - merge Edits    │              │
                    └──────────────────┘              │
                                                      ▼
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ Hot Replace │◄────│  applyFile       │◄────│  Chat Message   │
│ (disk write)│     │  Changes()       │     │  (with files)   │
└─────────────┘     │  - re-read disk  │     └────────┬────────┘
                    │  - applySearch   │              │
                    │    Replace()     │              ▼
                    │  - write to disk │     ┌─────────────────┐
                    └──────────────────┘     │  Preview Diff   │
                                             │  (3 display     │
                                             │   paths)        │
                                             └─────────────────┘
```

---

## 7. Key Files Reference

| File | Purpose |
|------|---------|
| [`LCInterface.ts`](../src/LCInterface.ts) | `LCFileActionResult`, `LCFileEdit` types |
| [`useLCChat.ts`](../src/useLCChat.ts) | `applySearchReplace()`, `sanitiseEscapedContent()`, `applyFileChanges()` |
| [`LCMainContent.tsx`](../src/LCMainContent.tsx) | Monaco full-page diff preview (`handlePreviewDiff`) |
| [`LCFileView.tsx`](../src/LCFileView.tsx) | Monaco `DiffEditor` wrapper |
| [`LCChatView.FileDiff.tsx`](../src/LCChatView.FileDiff.tsx) | Inline diff + View All Changes modal |
| [`LCDiffDisplay.tsx`](../src/LCDiffDisplay.tsx) | Custom line-by-line unified diff renderer |
