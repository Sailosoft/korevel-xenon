# Code Review: Bunny Form & Header Action Form Module

**Review Date:** 2026-06-28  
**Reviewer:** Architecture Review  
**Scope:** [`BunnyForm.Interface.ts`](../BunnyForm.Interface.ts), [`BunnyFormBuilder.tsx`](../builder/BunnyFormBuilder.tsx), [`BunnyFormDisplayField.tsx`](../builder/BunnyFormDisplayField.tsx), [`BunnyHeader.Action.Form.tsx`](../../header/BunnyHeader.Action.Form.tsx)

---

## 1. `BunnyForm.Interface.ts` — Type Definitions

### 1.1 `defaultValue` Type Is Broad but Acceptable

```typescript
export interface BunnyFormField<TForm = Record<string, unknown>> {
  // ...
  defaultValue?: TForm[keyof TForm];
```

**Observation:** `TForm[keyof TForm]` resolves to the **union of all property value types** in `TForm`, not the specific type of *this* field. For example, if `TForm = { name: string; age: number }`, then `defaultValue` accepts `string | number` for *every* field.

**Impact:** Low. In practice, the consumer manually types the config and will naturally pass a compatible default value. The looseness doesn't cause runtime issues because the form state merge handles any value.

**Recommendation:** No change needed — this is a pragmatic trade-off. A more precise type would require mapping `TForm` keys to their value types per field, which adds considerable complexity without meaningful safety gains.

### 1.2 Removed Commented-Out Validation Property

**Status:** ✅ **Fixed.** The commented-out `validation` property was removed. The `rules` array with `BunnyValidationRule` is the single canonical validation path.

```typescript
rules?: BunnyValidationRule[];
```

The `BunnyValidationRule` interface uses a discriminated `rule` field with an optional `validate` callback for `"custom"` rules. When `rule === "custom"`, the `validate` function returns `boolean` and the error message comes from the `message` field. This is clean for simple validators but limits expressiveness — consider allowing `validate` to return `string | boolean` where a string overrides `message` if richer error feedback is needed in the future.

### 1.3 `BunnyDisplayFieldConfig` — Good Separation of Concerns

The `BunnyDisplayFieldConfig` is cleanly separated with:
- `mode`: Visual presentation (`"card" | "badge" | "text" | "custom"`)
- `title` / `subtitle`: Dynamic resolution via `string | ((formData) => string)`
- `render`: Full custom render for `"custom"` mode

**No issues found.** The overloaded `title`/`subtitle` pattern (static string or function) is idiomatic and follows existing patterns in the codebase.

---

## 2. `BunnyFormBuilder.tsx` — Field Rendering Engine

### 2.1 ~~CRITICAL: Select Value Type Mismatch~~ ✅ **Fixed**

The select value round-trip issue has been resolved with a **lookup-based approach** that preserves the original option's value type:

```typescript
const handleChange = useCallback((val: unknown) => {
  if (field.type === "select") {
    const stringVal = String(val);
    const matchedOption = computedOptions.find(
      (o) => String(o.value) === stringVal,
    );
    const preservedValue =
      matchedOption !== undefined
        ? typeof matchedOption.value === "number"
          ? Number(stringVal)
          : stringVal
        : val;
    onChange(field.name, preservedValue);
  } else {
    onChange(field.name, val);
  }
}, [field.type, field.name, onChange, computedOptions]);
```

The handler looks up the original `BunnySelectOption` from `computedOptions` and preserves whether the value was originally `string` or `number`, preventing type corruption.

### 2.2 ~~`handleChange` Not Wrapped in `useCallback` (Performance)~~ ✅ **Fixed**

`handleChange` is now correctly wrapped in `useCallback` with `[field.type, field.name, onChange, computedOptions]` as dependencies. The `React.memo` on `FieldRenderer` is no longer defeated by a new function reference on every render.

### 2.3 ~~Unnecessary Type Cast on `field`~~ ✅ **Fixed**

All redundant `as BunnyFormField<Record<string, unknown>>` casts have been **removed** from:
- Slug field (`BunnyFormSlugField` invocation)
- Custom field (`CustomComponent` invocation)
- Render field (`renderFn` invocation)

The `field` parameter in `FieldRenderer` is already typed as `BunnyFormField<Record<string, unknown>>` in the component props, so these casts were no-ops.

### 2.4 ~~Switch `onChange` Type Mismatch~~ ✅ **Fixed**

The Switch `onChange` now uses an explicit boolean parameter:

```typescript
<Switch
  id={fieldId}
  isDisabled={field.disabled}
  isSelected={Boolean(value)}
  onChange={(isSelected: boolean) => handleChange(isSelected)}
/>
```

This makes the type contract explicit: the `Switch` passes `boolean`, which gets correctly routed to `onChange(field.name, boolean)` without entering the select numeric coercion branch.

### 2.5 ~~Select Options Loading — Error State~~ ✅ **Fixed**

The async select options error handling is now complete:

```typescript
const [optionsError, setOptionsError] = useState<string | null>(null);

// In the useEffect catch:
.catch((err) => {
  console.error(`Failed to load options for field "${field.name}":`, err);
  if (isMounted) {
    setOptionsError("Failed to load options");
  }
})

// In the render:
{optionsError ? (
  <p className="px-3 py-2 text-sm text-red-500">{optionsError}</p>
) : ( /* ListBox */ )}
```

An `optionsError` state is set on failure, and the error message is rendered inside the `Select.Popover` instead of leaving the UI stuck on "Loading...".

### 2.6 ~~Grid Column Classes Use Dynamic String Concatenation~~ ✅ **Fixed**

The dynamic Tailwind class concatenation `` `col-span-${field.colSpan}` `` has been replaced with a static lookup map to ensure Tailwind JIT picks up all classes:

```typescript
const colSpanMap: Record<1 | 2 | 3 | 4 | 6 | 8 | 12, string> = {
  1: "col-span-1",
  2: "col-span-2",
  3: "col-span-3",
  4: "col-span-4",
  6: "col-span-6",
  8: "col-span-8",
  12: "col-span-12",
};

// Usage:
field.colSpan ? colSpanMap[field.colSpan] : "",
```

---

## 3. `BunnyFormDisplayField.tsx` — Display Field Component

### 3.1 ~~Custom Mode Receives `formData` as `value`~~ ✅ **Fixed**

The custom mode render now correctly passes `formData[field.name]` as `value` (consistent with other field types):

```typescript
const fieldValue = (formData as Record<string, unknown>)[field.name];
if (mode === "custom" && displayConfig?.render) {
  return <>{displayConfig.render({ field, value: fieldValue, formData, onChange: () => {} })}</>;
}
```

### 3.2 ~~Missing `useMemo` Dependencies — `displayConfig` Object~~ ✅ **Fixed**

The `displayConfig` object reference has been added to both `useMemo` dependency arrays:

```typescript
const title = useMemo(
  () => resolveValue(displayConfig?.title, formData),
  [displayConfig?.title, formData, displayConfig],
);

const subtitle = useMemo(
  () => resolveValue(displayConfig?.subtitle, formData),
  [displayConfig?.subtitle, formData, displayConfig],
);
```

This ensures the memo recomputes when the `displayConfig` object itself changes, not just when `title`/`subtitle` references change.

---

## 4. `BunnyHeader.Action.Form.tsx` — Header Action Form

### 4.1 Good Patterns to Keep

- **`useRef` for state in closures:** The `actionStateRef` pattern (lines 238-239) correctly solves the stale closure problem that `handleSubmit` would otherwise face.
- **`handleChange` is wrapped in `useCallback`:** Unlike `BunnyFormBuilder`, the form change handler here is properly memoized.
- **Config ref pattern:** `configRef.current = config` (line 443) ensures the modal always reads the latest config without re-creating the render callback.

### 4.2 `renderModal` Depends on `config.id` — OK, But Fragile

```typescript
const renderModal = useCallback(
  (ctx?: BunnyKernel<unknown, unknown>) => (
    <BunnyHeaderActionFormModal<TForm, TData>
      key={config.id}
      config={configRef.current}
      ...
    />
  ),
  [config.id, kernel, isModalOpen, handleClose],
);
```

**Observation:** The `key={config.id}` on the modal component means if `config.id` changes, React fully unmounts and remounts the modal — losing all internal state (form data, errors, action state). This is **intentional** — it ensures a fresh form when the action config changes. But it could surprise consumers who change `id` expecting a seamless update.

**Recommendation:** Document this behavior: "Changing `config.id` will reset all form state as the modal is fully remounted."

### 4.3 `config` in `useMemo` Dependency — Risk of Recalculation

```typescript
const config = useMemo<BunnyHeaderActionFormConfig<TForm, TData>>(() => {
  if (typeof configure === "function") {
    const builder = new BunnyHeaderActionFormBuilder<TForm, TData>("");
    configure(builder);
    return builder.build();
  }
  return configure;
}, [configure]);
```

**Issue:** If `configure` is an **inline arrow function** (as shown in all examples), it's a new reference on every render, causing the `useMemo` to recompute on every render. This creates a new `BunnyHeaderActionFormBuilder` and new config on every render.

**Impact:** Medium — for inline builders, the config is rebuilt every render. This means all `useMemo`/`useCallback` hooks downstream that depend on `config` will also recompute.

**Recommendation:** Document that consumers should stabilize their builder callback with `useCallback`:

```typescript
const generateAction = useBunnyHeaderActionForm(
  useCallback((builder) => {
    builder.setLabel("Generate");
    // ...
  }, []),
);
```

Alternatively, memoize the config internally by serializing the configure function's behavior — but this is complex and not worth the overhead for typical usage.

### 4.4 Modal Stays in DOM When Closed

The `render` function always returns the modal component, even when `isModalOpen` is `false`. The modal is hidden via `Modal.Backdrop isOpen={isOpen}`. This is fine for HeroUI modals but means the modal's internal state persists across open/close cycles.

**Recommendation:** This is acceptable for the modal pattern. If consumers want a fresh form each time they open the modal, they should handle this externally (e.g., by using the `key` prop trick mentioned in 4.2).

---

## 5. Cross-Cutting Concerns

### 5.1 No Loading State for Initial Form Data

In `BunnyHeader.Action.Form.tsx`, form data is initialized synchronously from `config.initialData` (line 213). If `initialData` ever becomes async (e.g., fetching from an API), the form will render empty before data arrives.

**Recommendation:** If async initial data is a future requirement, add an `isLoading` state and a loading skeleton.

### 5.2 ~~Accessibility: `htmlFor` / `id` Mismatch~~ ✅ **Fixed**

The `fieldId` now uses a unique `instanceId` prefix generated by React's `useId()` hook:

```typescript
const instanceId = useId();
// ...
const fieldId = `${instanceId}-field-${field.name}`;
```

The `instanceId` is created once per `BunnyFormBuilder` instance and passed down to `FieldRenderer`. This prevents ID collisions when multiple forms exist on the same page (e.g., in modals). React's `useId()` is SSR-safe and guaranteed unique within the React tree.

### 5.3 ~~Missing Dev Warning for "display" Type Validation~~ ✅ **Fixed**

Dev-mode warnings are emitted when a `"display"` field has semantically invalid configuration:

```typescript
if (process.env.NODE_ENV === "development") {
  if (field.required) {
    console.warn(
      `[BunnyForm] Field "${field.name}" has type "display" but is marked required — this has no effect.`,
    );
  }
  if (field.rules && field.rules.length > 0) {
    console.warn(
      `[BunnyForm] Field "${field.name}" has type "display" but has validation rules — these will be ignored.`,
    );
  }
}
```

---

## 6. Summary of Action Items

| # | Severity | File | Issue | Status |
|---|----------|------|-------|--------|
| 1 | **High** | [`BunnyFormBuilder.tsx`](../builder/BunnyFormBuilder.tsx) | Select value type round-trip corrupts `"123"` (string → number) | ✅ **Fixed** — Lookup-based approach preserves original option type |
| 2 | **Medium** | [`BunnyFormBuilder.tsx`](../builder/BunnyFormBuilder.tsx) | `handleChange` not wrapped in `useCallback` breaks memoization | ✅ **Fixed** — Wrapped in `useCallback` with proper deps |
| 3 | **Low** | [`BunnyFormBuilder.tsx`](../builder/BunnyFormBuilder.tsx) | Unnecessary `as` type casts on `field` | ✅ **Fixed** — Removed redundant casts |
| 4 | **Low** | [`BunnyFormBuilder.tsx`](../builder/BunnyFormBuilder.tsx) | Switch `onChange` type implicitly works but is untyped | ✅ **Fixed** — Explicit `(isSelected: boolean) => handleChange(isSelected)` |
| 5 | **Low** | [`BunnyFormBuilder.tsx`](../builder/BunnyFormBuilder.tsx) | Async select options error leaves UI stuck on "Loading..." | ✅ **Fixed** — User-facing error state added |
| 6 | **Low** | [`BunnyFormBuilder.tsx`](../builder/BunnyFormBuilder.tsx) | Tailwind dynamic class `col-span-${n}` may not be picked up | ✅ **Fixed** — Static `colSpanMap` lookup |
| 7 | **Medium** | [`BunnyFormDisplayField.tsx`](../builder/BunnyFormDisplayField.tsx) | Custom mode passes `formData` as `value` (inconsistent API) | ✅ **Fixed** — Passes `formData[field.name]` as `value` |
| 8 | **Low** | [`BunnyHeader.Action.Form.tsx`](../../header/BunnyHeader.Action.Form.tsx) | Inline builder callback creates new config on every render | ⚠️ **Documented** — Consumers should use `useCallback` |
| 9 | **Low** | [`BunnyFormBuilder.tsx`](../builder/BunnyFormBuilder.tsx) | Accessible `id` may collide across multiple forms | ✅ **Fixed** — Added `instanceId` prefix via `useId()` |
| 10 | **Low** | [`BunnyFormBuilder.tsx`](../builder/BunnyFormBuilder.tsx) | "display" fields accept `required`/`rules` silently | ✅ **Fixed** — Dev-mode warnings added |

---

## 7. Architecture Verdict

**Overall quality is good.** The core architecture is sound:

- ✅ Clear separation of concerns (interfaces → builder → component → hook)
- ✅ Proper use of TypeScript generics throughout
- ✅ Builder pattern aligns with existing `BunnyFeature` configurator APIs
- ✅ `BunnyKernel` integration via `useBunnyKernel` is correctly wired
- ✅ HeroUI Modal usage follows the reference pattern correctly
- ✅ `display` field type is a well-designed addition with clear modes
- ✅ All naming follows the `{verb}Bunny{noun}` convention

**All actionable items from the original review have been addressed.** The only remaining concern (Item #8) is a documentation-level recommendation — consumers should stabilize builder callbacks with `useCallback` to avoid unnecessary config recomputation.
