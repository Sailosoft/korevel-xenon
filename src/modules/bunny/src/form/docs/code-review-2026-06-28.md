# Code Review: Bunny Form & Header Action Form Module

**Review Date:** 2026-06-28  
**Reviewer:** Architecture Review  
**Scope:** [`BunnyForm.Interface.ts`](../BunnyForm.Interface.ts), [`BunnyFormBuilder.tsx`](BunnyFormBuilder.tsx), [`BunnyFormDisplayField.tsx`](BunnyFormDisplayField.tsx), [`BunnyHeader.Action.Form.tsx`](../../header/BunnyHeader.Action.Form.tsx)

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

### 1.2 Commented-Out Validation Property

```typescript
// validation?: (value: unknown, formData?: unknown) => string | boolean | undefined;
rules?: BunnyValidationRule[];
```

**Observation:** The commented-out `validation` property and the active `rules` array appear to offer two parallel validation mechanisms. The `BunnyValidationRule` interface uses a discriminated `rule` field with an optional `validate` callback for `"custom"` rules.

```typescript
export interface BunnyValidationRule {
  rule: "required" | "minLength" | "maxLength" | "email" | "custom";
  message: string;
  value?: unknown;
  validate?: (value: unknown, formData: unknown) => boolean;
}
```

**Issue:** There are **two conceptual paths** for custom validation:
1. The commented `validation` callback — a single function with full control
2. `BunnyValidationRule.rule === "custom"` with a `.validate` function

**Recommendation:** Choose one canonical path and remove/deprecate the other. If the `rules` array with `BunnyValidationRule` is the primary mechanism, remove the commented code. Additionally, the `validate` function in `BunnyValidationRule` returns `boolean`, which provides no error message — yet the `rules` entry already has a `message` field. This is fine for simple validators but limits expressiveness. Consider allowing `validate` to return `string | boolean` where a string overrides `message`.

### 1.3 `BunnyDisplayFieldConfig` — Good Separation of Concerns

The `BunnyDisplayFieldConfig` is cleanly separated with:
- `mode`: Visual presentation (`"card" | "badge" | "text" | "custom"`)
- `title` / `subtitle`: Dynamic resolution via `string | ((formData) => string)`
- `render`: Full custom render for `"custom"` mode

**No issues found.** The overloaded `title`/`subtitle` pattern (static string or function) is idiomatic and follows existing patterns in the codebase.

---

## 2. `BunnyFormBuilder.tsx` — Field Rendering Engine

### 2.1 CRITICAL: Select Value Type Mismatch

```typescript
// Line 153 — converting stored value to string for HeroUI Select
value={value != null ? String(value) : null}

// Lines 87-94 — converting the string back to number on change
const handleChange = (val: unknown) => {
  const sanitizedValue =
    field.type === "select" && typeof val === "string" && !isNaN(Number(val))
      ? Number(val)
      : val;
  onChange(field.name, sanitizedValue);
};
```

**The problem:** `BunnySelectOption.value` is typed as `string | number`. The HeroUI `Select` component coerces *everything* to string internally because:
- `value` prop is set as `String(value)` 
- The `onChange` returns a string value

The sanitization attempt `!isNaN(Number(val))` has a **false positive**: the string `"123"` (which should remain a string) gets converted to `123` (number), corrupting the data type.

**Concrete example of the bug:**
```typescript
// Option definition
{ label: "Room 123", value: "123" }  // string "123"

// User selects it
// onChange receives "123" (string) 
// isNaN(Number("123")) → false → converts to 123 (number)
// Now formData has 123 (number) instead of "123" (string) ✗
```

**Recommendation (immediate fix):** You cannot reliably round-trip the HeroUI Select's string coercion. The cleanest solution is to **store all select values as strings** in the form data and let consumers parse them when needed. Alternatively, use a custom comparator or rely on the `id` prop instead of `value` if HeroUI supports typed values.

**Better alternative:** Wrap the Select to strip the type round-trip:

```typescript
// Store the original option's value type alongside the selection
// Or simply accept the string coercion and document it:
// "Select field values are stored as strings in form data"
```

### 2.2 `handleChange` Not Wrapped in `useCallback` (Performance)

```typescript
const FieldRenderer = memo(function FieldRenderer({...}: FieldRendererProps) {
  const handleChange = (val: unknown) => { // ← Created every render
    const sanitizedValue = ...
    onChange(field.name, sanitizedValue);
  };
  // ...
});
```

**Issue:** `FieldRenderer` is wrapped in `React.memo`, but `handleChange` is a new function reference on every render. Since `handleChange` is passed as the `onChange` prop to child components (`Input`, `Select`, `Switch`, etc.), those children will **always re-render** even when nothing has changed, defeating the memoization.

**Recommendation:** Wrap `handleChange` in `useCallback`:

```typescript
const handleChange = useCallback((val: unknown) => {
  const sanitizedValue =
    field.type === "select" && typeof val === "string" && !isNaN(Number(val))
      ? Number(val)
      : val;
  onChange(field.name, sanitizedValue);
}, [field.type, field.name, onChange]);
```

This also fixes a secondary issue: every render creates new inline arrow functions in the JSX (e.g., `onChange={(e) => handleChange(e.target.value)}` in `textarea` and `default` cases). These inline functions also break memoization. Use the stable `handleChange` directly where possible, or memoize them too.

### 2.3 Unnecessary Type Cast on `field.rows`

```typescript
// Line 219 — BunnyFormBuilder.tsx
style={{
  height: `${Math.max(4, (field as BunnyFormField<Record<string, unknown>>).rows ?? 4) * 1.5}rem`,
}}
```

**Issue:** The `field` parameter in `FieldRenderer` is already typed as `BunnyFormField<Record<string, unknown>>` in the component props (line 73). The `as` cast is a no-op.

**Recommendation:** Remove the cast:

```typescript
style={{
  height: `${Math.max(4, field.rows ?? 4) * 1.5}rem`,
}}
```

Ditto for line 280 (`code-editor` language fallback) and line 348 (`display` case — `field as BunnyFormField<Record<string, unknown>>`). In the `display` case, the cast is also unnecessary.

### 2.4 Switch `onChange` Type Mismatch

```typescript
<Switch
  isSelected={Boolean(value)}
  onChange={handleChange}
/>
```

**Issue:** The HeroUI `Switch`'s `onChange` callback signature is `(isSelected: boolean) => void`, but `handleChange` expects `(val: unknown) => void`. The Switch passes a raw boolean, which skips the `field.type === "select"` branch — so it works, but only coincidentally.

**Impact:** Low. It works because:
1. The `field.type === "select"` guard prevents the number coercion
2. `onChange(field.name, boolean)` stores the boolean correctly

**Recommendation:** Add a dedicated handler or handle the boolean type explicitly in `handleChange`:

```typescript
const handleChange = useCallback((val: unknown) => {
  if (field.type === "select" && typeof val === "string" && !isNaN(Number(val))) {
    onChange(field.name, Number(val));
  } else {
    onChange(field.name, val);
  }
}, [field.type, field.name, onChange]);
```

### 2.5 Select Options Loading — Edge Case: Empty Options from Async Function

```typescript
Promise.resolve(field.options())
  .then((resolvedData) => {
    if (isMounted) {
      setComputedOptions(resolvedData || []);
    }
  })
```

**Issue:** If `field.options()` resolves to `null` or `undefined`, the fallback `|| []` is correct. However, there's no user-facing error state if the API fails (the `.catch` only logs). The select remains disabled with "Loading..." placeholder.

**Recommendation:** Consider adding an error state that renders a meaningful message instead of getting stuck:

```typescript
const [optionsError, setOptionsError] = useState<string | null>(null);

// In the useEffect catch:
.catch((err) => {
  console.error(...);
  if (isMounted) {
    setOptionsError("Failed to load options");
    setIsLoadingOptions(false);
  }
});

// In the render:
{optionsError ? (
  <p className="text-sm text-red-500">{optionsError}</p>
) : ( /* ListBox */ )}
```

### 2.6 Grid Column Classes Use Dynamic String Concatenation

```typescript
field.colSpan ? `col-span-${field.colSpan}` : "",
```

**Issue:** Tailwind CSS uses **static analysis** to generate its classes. Dynamic class names like `` `col-span-${field.colSpan}` `` may not be picked up by the Tailwind JIT compiler if the full string `"col-span-1", "col-span-2"` etc. doesn't appear literally somewhere in the source.

**Recommendation:** If you notice missing column spans in production, add a safelist entry in `tailwind.config.js` or use a lookup map:

```typescript
const colSpanMap = { 1: "col-span-1", 2: "col-span-2", 3: "col-span-3", 4: "col-span-4", 6: "col-span-6", 8: "col-span-8", 12: "col-span-12" } as const;
field.colSpan ? colSpanMap[field.colSpan] : "",
```

---

## 3. `BunnyFormDisplayField.tsx` — Display Field Component

### 3.1 Custom Mode Receives `formData` as `value`

```typescript
if (mode === "custom" && displayConfig?.render) {
  return <>{displayConfig.render({
    field,
    value: formData,  // ← Entire formData, not the field's value
    formData,
    onChange: () => {},
  })}</>;
}
```

**Observation:** In `BunnyFieldRendererProps`, `value` conventionally holds the **field's own value** (i.e., `formData[field.name]`). Here it's set to the entire `formData` object. This is inconsistent with how other field types pass `value` (e.g., `custom` and `render` cases in `BunnyFormBuilder.tsx` pass the actual field value).

**Impact:** If a consumer writes a display field with `mode: "custom"` and accesses `props.value`, they'll get the entire form object instead of the field's value — a surprising API.

**Recommendation:** Either:
- Pass `formData[field.name]` as `value` (consistent with other field types)
- Or clearly document that `value` in display fields receives `formData` (and rename to make it explicit)

### 3.2 Missing `useMemo` Dependencies — `displayConfig` Object

```typescript
const title = useMemo(
  () => resolveValue(displayConfig?.title, formData),
  [displayConfig?.title, formData],  // Dependencies use optional chaining
);
```

**Issue:** `displayConfig?.title` uses optional chaining in the dependency array. If `displayConfig` itself changes (but `title` stays the same reference), the memo does not recompute. More critically, if `displayConfig.title` is a function, the function reference change is detected, but `displayConfig` object changes are missed.

**Impact:** Low — in practice, the `displayConfig` is typically stable. But the dependency array is technically less precise than it should be.

**Recommendation:** Either add `displayConfig` to the deps or accept the current trade-off with a comment explaining why.

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

### 5.2 Accessibility: `htmlFor` / `id` Mismatch

In `BunnyFormBuilder.tsx`, the `fieldId` is computed as `` `field-${field.name}` `` and used as both `id` on the input and `htmlFor` on the label. If two forms are on the same page (e.g., in modals), the IDs can collide.

**Recommendation:** Add a unique namespace or instance ID prefix:

```typescript
// Pass an instanceId prop to BunnyFormBuilder
const fieldId = `${instanceId}-field-${field.name}`;
```

### 5.3 Missing Test for "display" Type Validation

The `"display"` field type is purely informational — it doesn't accept user input. However, there's no guard preventing it from being marked `required` or having `rules`, which would be semantically meaningless.

**Recommendation:** Add a runtime warning in development:

```typescript
if (process.env.NODE_ENV === "development" && field.type === "display") {
  if (field.required) console.warn(`Field "${field.name}" has type "display" but is marked required — this has no effect.`);
  if (field.rules?.length) console.warn(`Field "${field.name}" has type "display" but has validation rules — these will be ignored.`);
}
```

---

## 6. Summary of Action Items

| # | Severity | File | Issue | Recommendation |
|---|----------|------|-------|----------------|
| 1 | **High** | `BunnyFormBuilder.tsx:87-94,153` | Select value type round-trip corrupts `"123"` (string → number) | Document the string-coercion behavior or implement a lookup-based approach using the original option's value type |
| 2 | **Medium** | `BunnyFormBuilder.tsx:87` | `handleChange` not wrapped in `useCallback` breaks memoization | Wrap in `useCallback` with `[field.type, field.name, onChange]` deps |
| 3 | **Low** | `BunnyFormBuilder.tsx:219,280,347` | Unnecessary `as` type casts on `field` | Remove redundant casts |
| 4 | **Low** | `BunnyFormBuilder.tsx:234` | Switch `onChange` type implicitly works but is untyped | Add explicit boolean handling or a dedicated handler |
| 5 | **Low** | `BunnyFormBuilder.tsx:126-131` | Async select options error leaves UI stuck on "Loading..." | Add user-facing error state |
| 6 | **Low** | `BunnyFormBuilder.tsx:51` | Tailwind dynamic class `col-span-${n}` may not be picked up | Use a static lookup map or safelist |
| 7 | **Medium** | `BunnyFormDisplayField.tsx:53` | Custom mode passes `formData` as `value` (inconsistent API) | Pass `formData[field.name]` as `value` or document the divergence |
| 8 | **Low** | `BunnyHeader.Action.Form.tsx:432-439` | Inline builder callback creates new config on every render | Document that consumers should use `useCallback` |
| 9 | **Low** | `BunnyFormBuilder.tsx:96` | Accessible `id` may collide across multiple forms | Add instance ID prefix |
| 10 | **Low** | `BunnyFormBuilder.tsx:344` | "display" fields accept `required`/`rules` silently | Add dev-mode warnings |

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

The main actionable item is **Item #1 (select value round-trip)** — this is a latent bug that will surface when consumers use string values that look like numbers. Items #2 and #7 are minor API/integrity concerns that should be addressed before production release.
