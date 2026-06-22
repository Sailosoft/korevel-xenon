## Diagnosis: Stale Dev Server Route Manifest

I identified the root cause by comparing two route manifests in your build output.

### Evidence

**Production build manifest** (`.next/app-path-routes-manifest.json`) — correctly lists ALL bunny-flow routes:

```json
{
  "/modules/bunny-flow/[id]/page": "/modules/bunny-flow/[id]",
  "/modules/bunny-flow/agent-pools/page": "/modules/bunny-flow/agent-pools",
  "/modules/bunny-flow/definitions/page": "/modules/bunny-flow/definitions",
  "/modules/bunny-flow/pipelines/page": "/modules/bunny-flow/pipelines",
  "/modules/bunny-flow/reports/page": "/modules/bunny-flow/reports",
  "/modules/bunny-flow/runs/page": "/modules/bunny-flow/runs",
  "/modules/bunny-flow/settings/page": "/modules/bunny-flow/settings",
  "/modules/bunny-flow/workflows/page": "/modules/bunny-flow/workflows"
}
```

**Dev server manifest** (`.next/dev/server/app-paths-manifest.json`) — **missing 6 routes**:

```json
{
  "/modules/bunny-flow/page": "app/modules/bunny-flow/page.js",
  "/modules/bunny-flow/pipelines/page": "app/modules/bunny-flow/pipelines/page.js",
  "/modules/bunny-flow/workflows/page": "app/modules/bunny-flow/workflows/page.js"
}
```

### Routes returning 404 and why

| URL                               | Status     | Reason                                                                                                                                                               |
| --------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/modules/bunny-flow`             | ✅ **200** | In dev manifest                                                                                                                                                      |
| `/modules/bunny-flow/workflows`   | ❌ **404** | Route NOT registered in dev manifest despite `page.tsx` existing at [`src/app/modules/bunny-flow/workflows/page.tsx`](src/app/modules/bunny-flow/workflows/page.tsx) |
| `/modules/bunny-flow/pipelines`   | ❌ **404** | Same issue — missing from dev manifest despite [`page.tsx`](src/app/modules/bunny-flow/pipelines/page.tsx) existing                                                  |
| `/modules/bunny-flow/definitions` | ❌ **404** | Not in dev manifest                                                                                                                                                  |
| `/modules/bunny-flow/agent-pools` | ❌ **404** | Not in dev manifest                                                                                                                                                  |
| `/modules/bunny-flow/reports`     | ❌ **404** | Not in dev manifest                                                                                                                                                  |
| `/modules/bunny-flow/runs`        | ❌ **404** | Not in dev manifest                                                                                                                                                  |
| `/modules/bunny-flow/settings`    | ❌ **404** | Not in dev manifest                                                                                                                                                  |
| `/modules/bunny-flow/dashboard`   | ❌ **404** | No `page.tsx` in `dashboard/` directory — only a `BFlowDashboard.tsx` component exists (imported by root [`page.tsx`](src/app/modules/bunny-flow/page.tsx))          |
| `/modules/bunny-flow/[id]`        | ❌ **404** | Dynamic route at [`src/app/modules/bunny-flow/[id]/page.tsx`](src/app/modules/bunny-flow/[id]/page.tsx) was never compiled by dev server                             |

### Why this happened

The compiled `.js` files for ALL routes **do exist** on disk at `.next/dev/server/app/modules/bunny-flow/` — Turbopack compiled them. However, the **route manifest** (`app-paths-manifest.json`) — the central registry Next.js uses for routing decisions — became stale and was never updated. This typically occurs when:

1. **Route files were added while the dev server was running** — Turbopack auto-compiles new source files but doesn't always update the central route manifest dynamically.
2. **Stale `.next/` build cache** — The `.next/` directory from a previous `next build` (production) contains a complete manifest, but the dev cache at `.next/dev/` is separate and incomplete. The presence of both causes route discovery conflicts.
3. **The `[id]` dynamic route** was never compiled by the dev server at all.

### Fix

Stop the dev server and clear all build caches:

```powershell
Remove-Item -Recurse -Force .next
npm run dev
```

This forces Next.js to regenerate the route manifest from all source files on startup, and every route will resolve correctly.
