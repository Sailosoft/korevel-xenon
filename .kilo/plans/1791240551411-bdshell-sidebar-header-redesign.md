# BDShell — Dark-Dot Sidebar + Blue Gradient Header

## Goal

Restyle the BunnyDev shell (`src/modules/bunny-dev/modules/shell`) so that:

- The **sidebar** uses a dotted texture over a blue→deep-navy gradient, with light (white/blue-100) content that stays legible on the dark surface.
- The **header** is a striking blue gradient bar with a subtle texture, white labels/icons, and white-translucent controls.

Both shells (outer `src/app/modules/bunny-dev/layout.tsx` and inner `projects/[projectId]/layout.tsx`) consume `BD_SHELL_THEME` and the shared components, so all changes are centralized — no page or layout edits required.

Decisions locked: deep-navy palette (`#1976d2 → #0f3d75 → #0b2545`); header = gradient + subtle texture (`#1976d2 → #1565c0`).

## Scope

Only these files change:

- `src/modules/bunny-dev/BDStyle.css` — add surface classes + tokens.
- `src/modules/bunny-dev/modules/shell/BDShell.config.ts` — rework theme tokens; add new sidebar/header tokens.
- `src/modules/bunny-dev/modules/shell/BDShell.sidebar.tsx` — apply new tokens + fix hardcoded light-on-light classes.
- `src/modules/bunny-dev/modules/shell/BDShell.header.tsx` — apply new surface + white text/icons + white-translucent buttons.

No changes to `BDShell.tsx`, layouts, `index.ts`, nav/route logic, or behavior (width transitions, mobile overlay, active-link detection stay intact).

## Implementation Steps

### 1. `BDStyle.css` — add CSS surfaces

Keep existing tokens. Add a sidebar token `--bd-sidebar-dot: rgba(255,255,255,0.14);` and two classes (place near `.bd-glass-header`):

```css
/* BDShell sidebar: deep-navy gradient with a faint dot grid. */
.bd-shell-sidebar {
  background-color: #0b2545;
  background-image:
    radial-gradient(circle at center, rgba(255, 255, 255, 0.14) 1px, transparent 1.5px),
    linear-gradient(160deg, #1976d2 0%, #0f3d75 55%, #0b2545 100%);
  background-size: 18px 18px, 100% 100%;
  background-position: 0 0, 0 0;
  background-attachment: local, local;
}

/* BDShell header: blue gradient with a soft glow + faint dot texture. */
.bd-shell-header {
  background-image:
    radial-gradient(140px 64px at 82% 50%, rgba(255, 255, 255, 0.20), transparent 70%),
    radial-gradient(circle at center, rgba(255, 255, 255, 0.10) 1px, transparent 1.5px),
    linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
  background-size: auto, 16px 16px, 100% 100%;
  color: #ffffff;
  box-shadow: 0 6px 20px -8px rgba(21, 101, 192, 0.6);
}
```

Notes:
- Two `background-image` layers, dot layer listed before the gradient layer so dots render on top.
- `.bd-glass-header` is only referenced by the header (verified via grep); it can be left in place (unused) or removed. Prefer leaving it to minimize blast radius.
- Keep the existing `@media (prefers-reduced-motion)` behavior untouched (none currently applies here).

### 2. `BDShell.config.ts` — rework tokens

Update `BDShellTheme` values so the same token names produce the new look. Replace the `BD_SHELL_THEME` body with:

```ts
export const BD_SHELL_THEME: BDShellTheme = {
  bgWindow: "bg-[#f4f7fb]",
  bgSidebar: "bd-shell-sidebar",
  border: "border-white/10",
  textPrimary: "text-white",
  textMuted: "text-blue-200/80",
  gradient: "from-white to-blue-200",
  shadow: "shadow-blue-900/30",
  btnPrimary: "bg-white/15 text-white border border-white/20 hover:bg-white/25 backdrop-blur-sm",
  btnSecondary: "text-white bg-white/15 hover:bg-white/25 backdrop-blur-sm",
  navActive: "bg-white/15 text-white font-semibold ring-1 ring-white/20 shadow-sm",
  navHover: "text-blue-100 hover:bg-white/10 hover:text-white transition-colors",
  avatarBg: "bg-white/15",
  avatarText: "text-white",
};
```

Add two new optional token fields to the interface and provide a default so the header can be independently themed later. Because `BDShellHeader` only receives `theme`, add:

```ts
headerSurface: string;   // "bd-shell-header"
headerText: string;      // "text-white"
headerMuted: string;     // "text-blue-100"
headerBtn: string;       // "bg-white/15 text-white hover:bg-white/25 backdrop-blur-sm"
```

Set defaults in `BD_SHELL_THEME`:
```ts
headerSurface: "bd-shell-header",
headerText: "text-white",
headerMuted: "text-blue-100",
headerBtn: "bg-white/15 text-white hover:bg-white/25 backdrop-blur-sm",
```
Keep `BDNavItem`, `BDShellWizard`, `BDShellProfile`, `BDShellConfig` unchanged. `config.theme` remains `Partial<BDShellTheme>`, so layouts need no edits.

### 3. `BDShell.sidebar.tsx` — legibility on dark gradient

Theme-token handlers already pick up the new values. Additionally fix the hardcoded light-on-light classes:

- Close button (line ~90): `text-slate-400 hover:bg-slate-100` → `text-blue-100 hover:bg-white/10 hover:text-white`.
- Brand icon `Rabbit` uses `theme.textPrimary` (now white). Brand text keeps `theme.gradient` (now `from-white to-blue-200`) — verify it reads on the gradient; if low contrast, switch brand span to `text-white`.
- `wizard` link keeps `theme.btnPrimary` + `theme.shadow` (now white-translucent glass) — good on dark.
- Danger nav variant (line ~155): `text-slate-600 hover:bg-red-50 hover:text-red-500` → `text-blue-100 hover:bg-red-500/20 hover:text-red-200`.
- Badge (line ~162): `bg-slate-100 ... text-slate-500` → `bg-white/15 text-blue-50`.
- Profile card (line ~177): `bg-slate-50` → `bg-white/10`.
- Profile name (line ~188): `text-slate-800` → `text-white`.
- Profile subtitle (line ~191): `text-slate-500` → `text-blue-100/80`.
- Section labels already use `theme.textMuted` (now `text-blue-200/80`).

Active-link logic, section grouping, transitions, and the outer `w-72` wrapper are unchanged.

### 4. `BDShell.header.tsx` — blue gradient bar

- `<header>` (line 24): replace `bd-glass-header` with `theme.headerSurface` (`bd-shell-header`), and drop the now-redundant `bg`; keep `sticky top-0 z-10 flex h-16 flex-shrink-0 items-center justify-between px-4 md:px-8`.
- Toggle button (line ~30): use `theme.headerBtn` (white-translucent) instead of `theme.btnSecondary`; icon becomes `text-white` automatically via inherited color (add `text-white` to be explicit).
- Logo box (line ~40): replace `bg-gradient-to-br` + `theme.gradient` + `theme.shadow` with `bg-white/15 ring-1 ring-white/25 backdrop-blur-sm shadow-inner`; keep `Rabbit` as `text-white`.
- Title span (line ~48): replace gradient/clip-text (`bg-gradient-to-r bg-clip-text text-transparent theme.gradient`) with `text-lg font-bold tracking-wide text-white` (use `theme.headerText`).
- Exit link (line ~62): use `theme.headerBtn`; label/icon `text-white` (inherit). Keep `hidden sm:inline` label behavior and `title` attr.

Header height, layout, and the `logoutHref` conditional are unchanged.

## Risks / Considerations

- **Contrast**: white/blue-100 on the deep-navy sidebar and white on the blue header meet legibility; spot-check the `text-blue-200/80` section labels and the `from-white to-blue-200` brand gradient on the darkest gradient stop.
- **Gradient under responsive collapse**: mobile sidebar uses `md:w-0 md:opacity-0`; the new background class is on the `<aside>` and fades with opacity, so no paint artifacts expected. Confirm on mobile overlay open/close.
- **`cn`/tailwind-merge**: `bd-shell-sidebar` and `bd-shell-header` are custom classes; `cn` (twMerge) passes unknown classes through, but ensure no conflicting `bg-*` utility is merged after them (remove old `bg-white`/`bd-glass-header` where replaced).
- **Dark mode (`[data-bd-theme="dark"]`)**: applies only to standalone rendered apps, not the shell — no interaction.
- **Token rename blast radius**: verified via grep that `btnPrimary`, `btnSecondary`, `navActive`, `navHover`, `bgSidebar`, `avatarBg`, `gradient`, `textPrimary`, `border`, `shadow`, `textMuted` are referenced only inside `shell/*`. No other module consumes them.

## Validation

1. `npm run lint` (eslint) — must pass.
2. `npx tsc --noEmit` — type-checks new/changed `BDShellTheme` fields and their usage.
3. `npm run build` (or `npm run dev` on port 3050) and visually verify:
   - Outer route `/modules/bunny-dev` and inner `/modules/bunny-dev/projects/{id}` both render the new sidebar + header.
   - Sidebar: dotted texture visible over the blue→navy gradient; brand/icon/labels/profile/badges legible; active item highlighted; danger item and wizard button legible.
   - Header: blue gradient with subtle texture; title, menu icon, and Exit label white; hover states on buttons.
   - Responsive: mobile sidebar open/close overlay, and header on small screens (`Exit` label hidden below `sm`).

## Out of Scope

- Any change to nav data/routes, active-link logic, providers (AI settings/toast), or rendered-app theming.
- A persisted/theme-switchable palette; `config.theme` override support is preserved but no new UI to change it.
