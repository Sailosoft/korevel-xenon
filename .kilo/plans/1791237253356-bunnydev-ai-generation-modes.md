# BunnyDev AI Generation — create / append / update / replace across all modules

## Goal

Make every BunnyDev AI-generation panel support four modes consistently:

- **create** — generate and create brand-new record(s).
- **append** — pick an existing target record; add generated children to it (existing children untouched).
- **update** — pick an existing target record; AI receives its current content and merge/upserts children by name, preserving items not returned.
- **replace** — pick an existing target record; AI receives its current content and the target's existing children/content are deleted, then the generated set is written. The target record/identity is always kept.

For `append`/`update`/`replace` the panel must show a **second selector** to choose the target record. `create` shows no target selector.

## Decisions (confirmed with user)

1. **Container model** semantics for schema / app / api / diagram / outline / architecture / board.
2. **Full target serialized** and sent to the AI for non-create modes.
3. **Generic selector** implemented once in `BDGenerationPanel`.
4. **Agent** subsystem is a list, not a container: `append` adds generated agents to the project (no target required — selector hidden); `update`/`replace` operate on a selected agent.

## Subsystems in scope

Generation panels exist for: schema, app, api, diagram, outline, architecture, board (`project-management`), agent. `files` has no AI generation — **out of scope**. The legacy `BDOutlineGenerationMode` enum in `docs/BunnyDev.ts` is unrelated — leave it.

## Mode → target → children

| Subsystem | Target record | "Children" mutated by append/update/replace |
|---|---|---|
| schema | `BDSchemaGroup` | models (upsert by `name`), relations resolved by model name |
| app | `BDApp` | `resources` (upsert by `slug`) |
| api | `BDApiGroup` | APIs (upsert by `method`+`path`) |
| diagram | `BDDiagramRecord` | nodes (upsert by `id`), edges (upsert by `source`+`target`) |
| outline | `BDOutline` | top-level topics (upsert by `title`) |
| architecture | `BDArchitectureRecord` | sections (upsert by `title`); also update `summary`/`status` |
| board | `BDBoard` | tasks (upsert by `name`) |
| agent | `BDAgent` (update/replace only) | agent fields + `capabilities` (upsert by `name`) |

When a mode is non-create, only the **first** generated container's children are used (one target). Extra generated containers are ignored for apply (or, where the module already supports variants, left as-is).

---

## Changes

### 1. Domain: add `update` mode + target tracking

`modules/agent-manager/BDAgent.Domain.ts`
- `export type BDGenerationMode = "create" | "append" | "update" | "replace";`
- Add `targetId?: string;` to `BDGenerationRun` and `BDBatchProposal`.

`modules/agent-manager/BDBatch.Repository.ts`
- Add optional `targetId?: string` to `BDCreateRunInput` and `BDCreateProposalInput`; persist it in `createGenerationRun` / `createBatchProposal`.

No Dexie migration needed (new fields are optional plain properties; no index changes in `BDMigration.ts`).

### 2. New client-safe helper `modules/agent-manager/BDGeneration.Mode.ts`

A non-`"use server"` module importable by both server actions and components:

```ts
import type { BDGenerationMode } from "../../BDDomain.Types";

export const BD_GENERATION_MODE_LABELS: Record<BDGenerationMode, string> = {
  create: "Create", append: "Append", update: "Update", replace: "Replace",
};

export function bdModeGuidance(mode: BDGenerationMode): string { /* see below */ }

/** Pretty-print a target record for the prompt, capped to maxChars. */
export function bdSerializeTarget(record: unknown, maxChars = 12000): string { ... }
```

`bdModeGuidance` text:
- create — "Create brand-new records from scratch; ignore existing records."
- append — "Existing target content is provided. Add ONLY new items; do not repeat or modify existing items. Return only the new items."
- update — "Existing target content is provided. Modify it per the instruction. Return ONLY items that are new or changed; do not repeat unchanged items."
- replace — "Existing target content is provided. Return the COMPLETE replacement set for the target; it will fully replace the existing contents."

### 3. Shared UI: `modules/agent-manager/BDGenerationPanel.tsx`

- `ALL_MODES = ["create", "append", "update", "replace"]`.
- Extend `BDGenerationArgs` with `targetId?: string` and `targetContext?: string`.
- New props:
  - `targets?: Array<{ id: string; label: string; hint?: string }>`
  - `targetLabel?: string` (default `"Target"`)
  - `targetModes?: BDGenerationMode[]` (default `["append","update","replace"]`) — modes that show/require a target
  - `buildTargetContext?: (targetId: string) => string | undefined`
- `onApply` signature → `(artifact, mode, targetId?) => Promise<void>`; `renderPreview` unchanged.
- Behavior:
  - Add `targetId` state; render a second `<select>` next to Mode when `targetModes.includes(mode) && targets?.length`; placeholder `Select <targetLabel>…`. Provide an empty-looking disabled state/toast when `targets` is empty.
  - On mode change: if new mode not in `targetModes`, clear `targetId`.
  - Mode `<option>` labels use `BD_GENERATION_MODE_LABELS`.
  - In `handleGenerate`: if mode requires a target and none selected → `toast` warning and abort.
  - Compute `targetContext = buildTargetContext?.(targetId)`; pass `targetId`/`targetContext` to `generate` and include `targetId` when calling `createGenerationRun` / `createBatchProposal`.
  - Call `onApply(artifact, mode, targetId)`.
  - Update review modal description to reflect the mode (and target) — e.g. append adds to the selected target; replace overwrites it.

### 4. Server action prompt plumbing

Add an optional `targetContext?: string` param and mode guidance to every generator:

- `agent-manager/BDAgent.Server.ts`
- `schema-builder/BDSchemaBuilder.Server.ts`
- `app-builder/BDAppBuilder.Server.ts`
- `api-design/BDApiDesign.Server.ts`
- `diagram-builder/BDDiagramBuilder.Server.ts`
- `outline/BDOutlineBuilder.Server.ts`
- `architecture/BDArchitectureBuilder.Server.ts`
- `project-management/BDTaskBuilder.Server.ts`

In each, replace `Mode: ${params.mode}` with:

```
Mode: ${params.mode}. ${bdModeGuidance(params.mode)}
${params.targetContext ? `\n\nExisting target:\n${params.targetContext}` : ""}
\n\nInstruction: ${params.instruction}
```

Keep existing DSL schemas unchanged (they already return the right child arrays; update/append simply return fewer items).

### 5. Per-subsystem components — pass targets, context, and implement `onApply(artifact, mode, targetId)`

Replace per-module `modes={...}` restrictions so all four modes are available (default), except agent passes `targetModes={["update","replace"]}`.

For every panel, add:
- `targets={(rows ?? []).map(r => ({ id: r.id, label: <name> }))}` from the module's existing live query.
- `targetLabel`.
- `buildTargetContext={(id) => { const rec = rows.find(r => r.id === id); return rec ? bdSerializeTarget(rec) : undefined; }}` (plus related children where useful).

`generate` closure passes `targetContext` into the server action alongside `instruction`/`mode`/`aiConfig`.

Apply logic per module (`onApply`), with `targetId` resolved by `repository.get(targetId)` → throw a clear error if missing:

- **Outline** (`BDOutlineBuilder.Component.tsx`, target `outlines`):
  - create: current behavior.
  - append: `topics = [...target.topics, ...draftToTopics(artifact.outlines[0].topics)]`; `bdOutlineRepository.update`.
  - update: merge top-level topics by `title` (replace matched topic subtree, append new), update `name/title/description` from generated.
  - replace: `topics = draftToTopics(...)`; update target fields.
- **Architecture** (`BDArchitectureBuilder.Component.tsx`, target `records`):
  - append: `sections = [...target.sections, ...generatedSections]`.
  - update: merge sections by `title`; update `summary`/`status`/`type` from generated[0].
  - replace: `sections = generatedSections`; update fields.
- **Diagram** (`BDDiagramBuilder.Component.tsx`, target `diagrams`, currently `modes=["create","append"]`):
  - append: concat nodes/edges (dedupe by node `id` / edge `source+target`).
  - update: upsert nodes by `id`, edges by `source+target`.
  - replace: `nodes`/`edges` = generated.
  - update `direction`/`meta` from generated.
- **App** (`BDAppBuilder.Component.tsx`, target `apps`):
  - append/update: upsert generated resources into `target.resources` by `slug`; re-resolve connections (include existing resources when resolving targets); `bdAppRepository.update(id, { resources })`.
  - replace: replace `resources` with generated set; for removed slugs call `bdAppRepository.deleteByResource(appId, slug)` (also `deleteResourceWithLinks` where rows exist) to avoid orphans.
- **Schema** (`BDSchemaBuilder.Component.tsx`, target `groups`, remove reliance on implicit `activeGroup`):
  - append: create generated models in target group; build `byName` from **all** group models (existing + new) before resolving relations.
  - update: upsert models by `name` (update properties/relations/indexes), preserve unmentioned models; update group name/description.
  - replace: delete target group's models (`bdSchemaModelRepository.deleteWhere("groupId", id)`), then create generated; keep group identity.
  - Remove the `activeGroup`-based branch.
- **API** (`BDApiDesign.Component.tsx`, target `groups`, remove the redundant `aiTargetGroupId` "Save into group" `extraFields` selector and use the generic target):
  - append: create generated APIs in target group.
  - update: upsert by `method`+`path`.
  - replace: `bdApiRepository.deleteWhere("groupId", targetId)` then create.
  - Keep the "Based on schema group" selector (generation context).
- **Board** (`BDProjectManagement.Component.tsx`, target `boards`, currently `modes=["create","append"]`):
  - append: add generated tasks to target board's columns (current behavior).
  - update: upsert tasks by `name` within target board.
  - replace: delete target board's tasks then add generated.
  - Resolve target via `boards`/`bdBoardRepository.get`; use `bdBoardColumnRepository.listByBoard`.
- **Agent** (`BDAgentManager.Component.tsx`, target `agents`, `targetModes={["update","replace"]}`):
  - create and append: create generated agents (append uses no target).
  - update: merge fields (name/prompt/description) + upsert `capabilities` by name into selected agent.
  - replace: overwrite selected agent's fields and capabilities.
  - Fix the inline `generateAgents` arg type `"create" | "append" | "replace"` → use `BDGenerationMode`.

---

## Data flow

```
Panel (mode + target select + instruction)
  → createGenerationRun({ ..., mode, targetId })
  → generate({ mode, instruction, targetId, targetContext, aiConfig })
      → bdGenerateX({ mode, instruction, targetContext, aiConfig })
          → bdGenerateStructured (Helix)
  → createBatchProposal({ ..., mode, targetId, artifact })
  → review preview
  → onApply(artifact, mode, targetId)  // all-or-nothing write into target
  → resolveBatchProposal(applied | rejected)
```

## Validation

- `npx tsc --noEmit` (no `typecheck` script; `npm run build` also type-checks).
- `npm run lint`.
- Manual matrix per subsystem: create / append / update / replace.
  - Selector appears for append/update/replace (board/diagram/api included; agent append hidden).
  - Generate is blocked with a warning when a target is required but unselected.
  - Apply writes only to the selected target; `replace` clears prior children; `update` preserves unmentioned children; `append` leaves existing children untouched.
  - Review/Reject leaves local tables unchanged.
  - Generation runs/proposals persist `mode` and `targetId`.

## Risks / notes

- **Prompt size**: full target serialization can be large; cap via `bdSerializeTarget` (default 12000 chars, append "…(truncated)"). Architecture docs are the largest — consider a smaller cap there.
- **Diagram merge** (`update`) is best-effort across nodes/edges; document that ids should be stable from the model.
- **App `replace`** must scrub rows for removed resources to avoid orphans.
- **Schema `replace`** deletes models that app resources may reference by name; acceptable, note in review text.
- **Single-target assumption**: append/update/replace use the first generated container only.
- No persistence migration required.

## Open questions

- None blocking. Optional follow-up: allow selecting multiple targets, or per-child pickers — out of scope for this change.
