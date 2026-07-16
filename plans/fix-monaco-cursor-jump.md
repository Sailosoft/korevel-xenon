# Fix: Monaco Editor Cursor Jumping to End of File While Typing

## Root Cause

The cursor-jumping issue is caused by the **controlled component pattern** used with the Monaco Editor in [`LCFileViewDisplayMode`](src/modules/lemon-coder/src/LCFileView.DisplayMode.tsx:164).

### The Problematic Cycle

On every keystroke, the following sequence occurs:

```
1. User types "a" in Monaco Editor
2. Monaco fires onChange callback → calls onContentChange("...a")  [line 169]
3. Parent state updates: setSelectedFileContent("...a") in useLCFileSystem.ts [line 693]
4. React re-renders: LCFileSystem → LCApp → LCMainContent → LCFileView → LCFileViewDisplayMode
5. LCFileViewDisplayMode receives new value={content} prop [line 168]
6. @monaco-editor/react library calls editor.setValue(newContent) internally
7. ⚠️ Monaco Editor resets cursor position to end of file
```

### Why This Happens

Monaco Editor is fundamentally an **uncontrolled** text editor — it manages its own internal model (text buffer, undo stack, cursor positions, selections, view state). When the `value` prop changes, the library (`@monaco-editor/react`) calls `editor.setValue()` under the hood, which:

1. Replaces the entire model content
2. Resets the undo stack
3. Resets cursor position (typically to end of file)
4. Destroys selection state

### Why It's Intermittent ("sometimes")

The cursor jump doesn't happen on every keystroke because:

- **React batching**: React 18 batches state updates. If `onContentChange` is called synchronously within the Monaco `onChange`, React may batch the re-render and the editor may not fully process the `setValue` before the user types again.
- **Race condition with Monaco's internal model**: Monaco's internal model updates asynchronously. If the user types fast enough, a new keystroke arrives before `setValue` completes, causing the cursor to jump only occasionally.
- **Re-render cascades**: The `useLiveQuery` for word wrap in [`LCFileView`](src/modules/lemon-coder/src/LCFileView.tsx:142) can trigger additional re-renders that sometimes coincide with typing, exacerbating the issue.

---

## The Fix: Uncontrolled Pattern with Editor Ref

The standard fix in the Monaco community is to use an **uncontrolled** pattern where:

1. The editor manages its own content internally
2. `onChange` is still used to push changes **upward** to the parent
3. No `value` prop is passed — instead, use `defaultValue` for initial content
4. When the file changes externally (user clicks a different file), the `key={selectedFile.path}` prop forces a fresh editor instance
5. A `useEffect` handles the rare case where content needs to be synced from outside (e.g., "Reload from Disk")

### Changes to [`LCFileViewDisplayMode`](src/modules/lemon-coder/src/LCFileView.DisplayMode.tsx)

```diff
- Remove `value={content}` prop from `<MonacoEditor>`
+ Add `defaultValue={content}` for initial content
+ Add `editorRef` to track editor instance
+ Add `useEffect` to sync external content changes (file reload, file switch)
```

### Detailed Code Plan

#### 1. Add editor ref and content ref

```tsx
const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
const contentRef = useRef(content);
contentRef.current = content;
```

#### 2. In `onMount`, store the editor reference

```tsx
onMount={(editor, monaco) => {
  editorRef.current = editor;
  // ... existing Ctrl+S and context menu code ...
}}
```

#### 3. Replace `value={content}` with `defaultValue={content}`

```tsx
<MonacoEditor
  key={selectedFile.path}
  height="100%"
  language={getLanguage(selectedFile.name)}
  defaultValue={content}    // ← Only sets initial value
  onChange={(val) => onContentChange(val || "")}
  // ... rest of props ...
/>
```

#### 4. Add a `useEffect` to sync external content changes

```tsx
useEffect(() => {
  const editor = editorRef.current;
  if (!editor) return;
  const currentValue = editor.getValue();
  if (currentValue !== content) {
    editor.setValue(content);
  }
}, [content]);
```

This effect only calls `setValue` when the content actually differs from what the editor has. During normal typing, the content ref and editor content are in sync, so `setValue` is **never called** — the cursor stays put.

---

## How Each Scenario Is Handled

| Scenario | Before (Broken) | After (Fixed) |
|----------|-----------------|---------------|
| **User types** | `value` prop changes → `setValue` → cursor jumps | `onChange` fires upward, but `value` prop is gone → no `setValue` → cursor stays |
| **User switches file** | `key={selectedFile.path}` creates new editor → fresh `value` prop | `key` still creates new editor → `defaultValue` sets initial content correctly |
| **User clicks "Reload from Disk"** | `content` prop changes → `setValue` → cursor jumps | `useEffect` detects content mismatch → calls `setValue` once (acceptable for external reload) |
| **Word wrap setting changes** | `useLiveQuery` re-render → `value` prop re-applied → cursor jumps | Re-render has no `value` prop → editor unaffected → cursor stays |
| **Auto-save triggers** | `useEffect` in `LCFileView` saves → parent may re-render | No `value` prop → editor unaffected |

---

## Data Flow Diagram

```mermaid
flowchart TD
    User[User Types] --> Monaco[Monaco Editor]
    Monaco -->|onChange| onContentChange[onContentChange callback]
    onContentChange --> setState[setSelectedFileContent]
    setState --> ReRender[React Re-render]
    ReRender -->|NEW: No value prop| Monaco
    Monaco -->|Cursor stays!| User
    
    FileSwitch[User clicks new file] --> keyProp[key={selectedFile.path}]
    keyProp --> NewEditor[New Monaco instance created]
    NewEditor --> defaultValue[defaultValue={content}]
    defaultValue --> CorrectContent[Correct content shown]
    
    Reload[Reload from Disk] --> contentProp[content prop changes]
    contentProp --> useEffect[useEffect compares content]
    useEffect -->|differs| setValue[editor.setValue]
    useEffect -->|same| noop[Do nothing]
```

---

## Risks and Mitigations

### Risk 1: Undo History Lost on External Sync
- **When**: The `useEffect` calls `editor.setValue()` for external reloads
- **Impact**: Undo history is reset (same as before — Monaco doesn't preserve undo across `setValue`)
- **Mitigation**: This is identical to current behavior, and external reloads are rare

### Risk 2: Content Drift
- **When**: The parent's `content` state and the editor's internal model get out of sync
- **Scenario**: If `onChange` is not fired (e.g., programmatic change), the editor's content may differ from the parent's state
- **Mitigation**: The `useEffect` comparison (`editor.getValue() !== content`) catches and corrects any drift on the next render

### Risk 3: Infinite Loop
- **Scenario**: `useEffect` → `setValue` → `onChange` fires → parent state updates → re-render → `useEffect` fires again
- **Mitigation**: The `useEffect` checks `editor.getValue() !== content` BEFORE calling `setValue`. After the first `setValue`, the editor's content matches the parent's content, so the next render's `useEffect` finds no difference and does nothing. The `onChange` from `setValue` is also suppressed by the `|| ""` fallback in the current code.

### Risk 4: Diff Mode Unaffected
- **Note**: The diff preview uses a completely separate `MonacoDiffEditor` component in [`LCFileView.tsx`](src/modules/lemon-coder/src/LCFileView.tsx:389) and does not use `value` as a controlled prop — it uses `original` and `modified` props. This fix only affects the source editor in `LCFileViewDisplayMode`, so the diff mode is unaffected.

---

## Implementation Steps

### Step 1: Modify [`LCFileViewDisplayMode`](src/modules/lemon-coder/src/LCFileView.DisplayMode.tsx)

1. Add `useRef` for `editorRef` and `contentRef`
2. Replace `value={content}` with `defaultValue={content}`
3. Store editor reference in `onMount`
4. Add `useEffect` to sync external content changes

### Step 2: Verify the fix

1. Open a file in the Monaco editor
2. Type rapidly — cursor should NOT jump
3. Switch to another file and back — content should load correctly
4. Click "Reload from Disk" — content should update
5. Toggle word wrap setting — editor should not jump