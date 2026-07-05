# Plan: Improve File Tree Usability for Brand-Prefixed Filenames

## Problem

Files use a `{BrandName}{Filename}.{FileType}` naming convention. In the file tree, `text-truncate` clips the name, and since all files start with the same brand prefix, it's hard to tell which file you're selecting.

## Solution (Revised)

Three independent enhancements, all in [`LCSidebar.tsx`](src/modules/lemon-coder/src/LCSidebar.tsx) and [`LCFileTree.tsx`](src/modules/lemon-coder/src/LCFileTree.tsx):

---

### 1. Rich Tooltip on Hover

**File: [`LCFileTree.tsx`](src/modules/lemon-coder/src/LCFileTree.tsx:90-101)**

Currently the tooltip shows only `item.path`:
```tsx
title={item.path}
```

Enhance it to show a formatted tooltip block that clearly separates the path components:

```tsx
title={`${item.isDirectory ? "📁" : "📄"} ${item.name}\n${item.path}`}
```

Or better, since native HTML `title` supports only single-line and line-wrapping (no rich formatting), use a **custom tooltip component** that appears on hover (or a `title` attribute with a well-formatted string).

**Option A — Native `title` attribute** (simplest):
```tsx
title={`${item.path}\nClick to ${item.isDirectory ? "expand" : "open"}`}
```

**Option B — Custom hover popover** (richer UX):
Show a small popover on hover with:
- File icon + full filename
- Full path
- "Click to open" hint

---

### 2. Resizable Left Sidebar

**File: [`LCSidebar.tsx`](src/modules/lemon-coder/src/LCSidebar.tsx:118-119)**

The sidebar panel is currently fixed at `w-56` (224px). Make it a resizable panel using a drag handle.

**Approach:**
- Replace `w-56` with a dynamic width state (e.g. `sidebarWidth`)
- Add a thin vertical drag handle on the right edge of the panel
- On drag, update `sidebarWidth` within min/max bounds (e.g. 180px – 400px)
- Persist the width in localStorage or Dexie so it remembers across sessions

**Implementation sketch:**
```tsx
const [sidebarWidth, setSidebarWidth] = useState(() => {
  // Restore from localStorage
  if (typeof window !== "undefined") {
    return parseInt(localStorage.getItem("lc_sidebar_width") ?? "224");
  }
  return 224;
});

// On mouse drag:
const handleMouseDown = () => { /* track mousemove, update width */ };
const handleMouseUp = () => {
  localStorage.setItem("lc_sidebar_width", String(sidebarWidth));
};
```

```tsx
<div
  className="bg-[#252526] border-r border-[#333333] flex flex-col overflow-hidden"
  style={{ width: sidebarWidth }}
>
  {/* ... existing content ... */}
  
  {/* Drag handle */}
  <div
    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#e5c07b] active:bg-[#e5c07b] transition-colors"
    onMouseDown={handleResizeStart}
  />
</div>
```

---

### 3. (Optional) Dynamic Brand Prefix Highlighting

If the above two aren't enough, add a subtle visual cue: detect PascalCase boundaries within the filename and render the brand prefix portion with slightly muted styling. But this is secondary — the resizable sidebar + tooltip should solve the core issue.

---

## Files to Modify

| File | Change |
|------|--------|
| [`src/modules/lemon-coder/src/LCFileTree.tsx`](src/modules/lemon-coder/src/LCFileTree.tsx) | Lines 90-101: Enhance tooltip with full path and filename info |
| [`src/modules/lemon-coder/src/LCSidebar.tsx`](src/modules/lemon-coder/src/LCSidebar.tsx) | Lines 118-119: Replace fixed `w-56` with resizable width + drag handle |

## Files NOT Modified

- [`LCInterface.ts`](src/modules/lemon-coder/src/LCInterface.ts) — no interface changes needed
- [`useLCFileSystem.ts`](src/modules/lemon-coder/src/useLCFileSystem.ts) — no logic changes needed
- [`LCFileView.tsx`](src/modules/lemon-coder/src/LCFileView.tsx) — unaffected
- All other files — unaffected

## Edge Cases

1. **Sidebar width persists** — saved to localStorage and restored on reload
2. **Min/max bounds** — prevent collapsing below 180px or extending beyond 500px
3. **Drag handle is thin** — 4-6px wide so it's easy to grab but not visually obtrusive
4. **Tooltip works on all tree items** — directories get folder icon, files get file icon
