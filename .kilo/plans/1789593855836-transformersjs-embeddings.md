# Plan — Transformers.js embeddings for Bunny Studio (Knowledge Base + Chat)

## Goal

Add `@huggingface/transformers` (Transformers.js) as a **local, browser-side embedding
engine** for the Bunny Studio Knowledge Base RAG pipeline, make it the **default** for
new knowledge groups (indexing **and** chat retrieval), and keep the existing LLM
embedding providers (SiliconFlow / DeepInfra via the server route) as an explicit,
per-group alternative.

## Decisions (confirmed with user)

1. **Package**: `bun add @huggingface/transformers` (current latest `4.3.0`).
2. **Default model**: `Xenova/bge-small-en-v1.5` — English, **384 dimensions**.
3. **Runtime**: browser, in a **Web Worker** (ONNX/WASM). No API key; fully offline after
   the model is cached by the library.
4. **Where the option lives**: per **Knowledge Group** (create/edit form) — engine +
   model. The group owns its Orama index, so indexing and retrieval stay consistent.
5. **Existing data**: a Dexie migration pins each existing group to its current LLM
   engine so its persisted 1024-d index keeps working. **New groups default to
   Transformers.js.** Changing a group's engine/model **invalidates** its index and
   offers a one-click **Re-index group** action.
6. **Dimension is dynamic per group** (384 / 768 / 1024 …), replacing the hardcoded
   `KNOWLEDGE_VECTOR_DIMENSION = 1024`.

## Non-goals

- No server-side (Node/`onnxruntime-node`) inference. The existing server embed route is
  only used when the group's engine is `siliconFlow` / `deepinfra`.
- No global/default embedding setting in Configurations (per-group only).
- No automatic background re-embedding of existing groups (user triggers re-index).
- No change to how chat streams answers; only the embedding engine used by RAG retrieval.

## Key files

| File | Role |
| --- | --- |
| `package.json`, `bun.lock` | add `@huggingface/transformers` |
| `next.config.ts` | only if bundling requires it (worker/onnx) |
| `src/modules/helix/src/HelixConfig.Embedding.ts` | engine type, Transformers model catalog + dimensions, resolvers |
| `src/modules/helix/index.ts` | re-export new config |
| `src/modules/helix/src/HelixEmbedding.Transformers.ts` **(new)** | client worker client: `embedTextsLocal` / `embedTextLocal`, pipeline cache |
| `src/modules/helix/src/workers/HelixEmbedding.worker.ts` **(new)** | Web Worker running `pipeline("feature-extraction", model)` |
| `src/modules/bunny-studio/src/modules/knowledge-base/BSKnowledge.Types.ts` | `embeddingEngine`, `embeddingDimensions`, snapshot metadata |
| `src/modules/bunny-studio/src/BSMigration.ts` | Dexie **version 9** backfill |
| `src/modules/bunny-studio/src/modules/knowledge-base/BSKnowledgeBase.Embedding.ts` | route by engine: local worker vs server route |
| `src/modules/bunny-studio/src/modules/knowledge-base/BSKnowledgeBase.Orama.ts` | per-group dimension, engine-aware embed, invalidate/validate |
| `src/modules/bunny-studio/src/modules/knowledge-base/BSKnowledgeGroup.Module.ts` | engine + model form fields |
| `src/modules/bunny-studio/src/modules/knowledge-base/BSEmbeddingModelPicker.tsx` **(new)** | custom form field: model list scoped to selected engine |
| `src/modules/bunny-studio/src/modules/knowledge-base/BSKnowledge.Component.tsx` | engine/model selector, invalidate on change, Re-index button |
| `src/modules/bunny-studio/src/modules/knowledge-base/BSKnowledge.Hooks.ts` | re-index helper + status |
| `src/modules/bunny-studio/src/modules/knowledge-base/index.ts` | export new helpers/types |

## Implementation steps (ordered)

### 1. Install
- `bun add @huggingface/transformers`.
- The package hard-depends on `onnxruntime-node` + `sharp` (native, postinstall). It is
  used **only in the browser**, so if install tries to download native binaries, add
  `"onnxruntime-node"` (and verify `sharp`) to `ignoreScripts` in `package.json` and
  confirm `bun install` completes. Never import the Node entry point.

### 2. Helix embedding catalog (pure data — safe on the server)
In `HelixConfig.Embedding.ts` add, without changing the existing LLM providers:
- `export type HelixEmbeddingEngine = "transformers" | HelixEmbeddingProvider;`
- `export const HELIX_TRANSFORMERS_EMBEDDING_MODELS = ["Xenova/bge-small-en-v1.5","Xenova/bge-base-en-v1.5","Xenova/all-MiniLM-L6-v2","Xenova/paraphrase-multilingual-MiniLM-L12-v2","Xenova/nomic-embed-text-v1.5","Xenova/bge-m3"] as const;`
- `DEFAULT_TRANSFORMERS_EMBEDDING_MODEL = "Xenova/bge-small-en-v1.5"`,
  `DEFAULT_EMBEDDING_ENGINE: HelixEmbeddingEngine = "transformers"`.
- `HELIX_TRANSFORMERS_EMBEDDING_MODEL_DIMENSIONS` (bge-small 384, bge-base 768,
  MiniLM 384, paraphrase-multilingual 384, nomic 768, bge-m3 1024) and merge it into
  `HELIX_EMBEDDING_MODEL_DIMENSIONS`.
- Resolvers: `isTransformersEmbeddingModel(model)`,
  `getEmbeddingModelEngine(model): HelixEmbeddingEngine`,
  `getEmbeddingModelDimensions(model): number`,
  `getProviderDefaultEmbeddingModelForEngine(engine)`.
- Re-export all new symbols from `src/modules/helix/index.ts`.

### 3. Local Transformers.js service (browser only)
- `HelixEmbedding.Transformers.ts` (`"use client"`):
  - Lazy singleton worker: `new Worker(new URL("./workers/HelixEmbedding.worker.ts", import.meta.url), { type: "module" })`.
  - `embedTextsLocal(inputs, { model, isQuery })` → `number[][]`; batches inputs
    (~8–16), awaits worker responses by request id, forwards progress events.
  - `embedTextLocal(input, opts)` convenience wrapper.
  - Caches loaded models in the worker; results are `Float32Array` → `number[]` via
    `.tolist()`-style conversion.
- `workers/HelixEmbedding.worker.ts`:
  - `import { pipeline, env } from "@huggingface/transformers";`
  - `env.allowLocalModels = false; env.useBrowserCache = true;`
  - Cache `pipeline("feature-extraction", model)` per model id.
  - Embed with `{ pooling: "mean", normalize: true }` (matches the `Xenova/bge-small-en-v1.5`
    model card); post `{ type: "progress" }` during load and `{ type: "result" }` after.
  - Optional offline hardening (note, not required): copy ORT wasm to `public/ort/` and set
    `env.backends.onnx.wasm.wasmPaths`.

### 4. Type + migration
- `BSKnowledge.Types.ts`:
  - `embeddingEngine?: HelixEmbeddingEngine;`
  - `embeddingDimensions?: number;`
  - `BSKnowledgeIndexSnapshot` gains optional `engine`, `model`, `dimensions`.
- `BSMigration.ts` — add Dexie **version 9** (`config.update("knowledgeGroups", …)`) with a
  synchronous `.modify` backfill:
  - if `embeddingEngine` is missing: `isTransformersEmbeddingModel(model) ? "transformers"`
    else if model is an LLM model → `getEmbeddingModelProvider(model)`
    else → `"siliconFlow"` (legacy default; keeps existing 1024-d indexes valid).
  - set `embeddingDimensions` from the resolved model.
  - No table/index changes needed (Dexie persists non-indexed fields).

### 5. Engine-aware BS embedding shim
`BSKnowledgeBase.Embedding.ts`:
- Replace the two-arg helpers with an options object
  `embedTexts(inputs, { engine, model, isQuery? })` / `embedText(input, opts)`.
- If resolved engine is `"transformers"`:
  `const { embedTextsLocal } = await import("@/src/modules/helix/src/HelixEmbedding.Transformers");`
  (dynamic import keeps the server route / Helix bundle free of browser ML code).
- Otherwise keep the current Helix `embedTexts` server-route call with the BS token header.
- Keep re-exporting the LLM config symbols for existing consumers.

### 6. Per-group dimension in Orama
`BSKnowledgeBase.Orama.ts`:
- Add `resolveGroupEmbedding(groupId)` → `{ engine, model, dimensions }` from the group
  record (fallbacks via the Helix resolvers; default engine `transformers`, default model
  `Xenova/bge-small-en-v1.5`).
- Replace `KNOWLEDGE_SCHEMA` with `buildKnowledgeSchema(dimensions)`
  (`embedding: \`vector[${dimensions}]\``) and `createGroupDb(dimensions)`.
- `loadOrCreateDb(groupId)`: resolve config first; restore snapshots as today; if a restored
  snapshot's dimension ≠ resolved dimension, drop it (log + rebuild empty) so the user is
  forced to re-index rather than silently mixing spaces.
- `indexKnowledge(groupId, payload, model?)`: resolve engine/model, embed, and
  **validate** every vector's length equals the resolved dimension before `insert`.
- `searchKnowledgeGroup(...)`: resolve engine/model and embed the query with
  `isQuery: true` (applies the bge retrieval prefix — see step 7).
- Keep the legacy `KNOWLEDGE_VECTOR_DIMENSION` export (deprecated) so existing imports do
  not break; mark it as the legacy default.

### 7. Query prefix / pooling consistency
- Embed documents with `{ pooling: "mean", normalize: true }` and queries the same, plus
  the bge retrieval prefix `"Represent this sentence for searching relevant passages: "`
  prepended to **queries only** for bge-family models. Keep this logic in the local
  service so index and query can never diverge. LLM engines keep their current behavior.

### 8. Knowledge Group form (explicit options)
- `BSKnowledgeGroup.Module.ts`:
  - Add `embeddingEngine`: `type: "select"`, label "Embedding Engine", `required`,
    `defaultValue: "transformers"`, options:
    `Transformers.js (Local)` → `transformers`, `SiliconFlow` → `siliconFlow`,
    `DeepInfra` → `deepinfra`.
  - Add `embeddingModel`: `type: "custom"`, `component: BSEmbeddingModelPicker`.
  - Add an "Embedding" table column rendering `engine · model` (optional but useful).
- `BSEmbeddingModelPicker.tsx` (new, `"use client"`): reads `formData.embeddingEngine`,
  renders the model list for that engine (transformers catalog or
  `HELIX_PROVIDER_EMBEDDING_MODELS`), and resets the value to the engine's default when the
  engine changes and the current model does not belong to it. Keep the module file `.ts`
  (no JSX there) by importing the component.

### 9. Knowledges page (indexing UI)
`BSKnowledge.Component.tsx`:
- Replace the flat `EMBEDDING_MODELS` select with engine + model selects scoped to the
  selected group (reuse `BSEmbeddingModelPicker` logic).
- On engine/model change: persist `embeddingEngine` + `embeddingModel` +
  `embeddingDimensions`, call `deleteGroupIndex(groupId)` (invalidate) and show
  "Index cleared — re-index this group". This fixes today's silent mismatch where the
  model is updated without touching existing vectors.
- Add a **Re-index group** button: clears the group index, then re-chunks + re-embeds every
  `BSKnowledge` of the group from its stored `content`.
- Show model-loading status in the existing ingest status area
  ("Loading local embedding model… first run downloads ~34MB").

### 10. Re-index helper
`BSKnowledge.Hooks.ts` (or a small `BSKnowledge.Reindex.ts`):
- `reindexGroup(groupId)` → `deleteGroupIndex(groupId)`; for each knowledge of the group
  run `indexKnowledge(groupId, { knowledgeId, title, source, content }, groupModel)` and
  update `chunkIds` / `chunkCount` on the record. Sequential, with progress state so the
  existing status banner can report `indexed N/M sources`.
- Export from `knowledge-base/index.ts`.

### 11. Chat
- No interface change: `BSChat.Hooks.ts` → `retrieveKnowledgeForChat` →
  `searchKnowledgeGroup` already resolves the group's engine, so new groups use
  Transformers.js automatically and legacy groups keep their LLM engine.
- Optional: display the active group's engine in the KB score panel header.

## Data flow (new default)

```
Add knowledge (Knowledges page)
  → BSKnowledge.Hooks.ingestKnowledge
  → BSKnowledgeBase.Orama.indexKnowledge
      → resolveGroupEmbedding(groupId)  // { engine: "transformers", model, dimensions: 384 }
      → BSKnowledgeBase.Embedding.embedTexts  → HelixEmbedding.Transformers (Web Worker, ONNX/WASM)
      → Orama insert(vector[384]) → persist snapshot (engine/model/dimensions)

Chat message with a knowledge group
  → BSChat.Hooks → retrieveKnowledgeForChat → searchKnowledgeGroup
      → resolveGroupEmbedding → embedText(query, isQuery)  (local worker)
      → Orama vector search → RAG context + hits
```

Legacy group (`embeddingEngine: "siliconFlow"`) follows the same path but
`BSKnowledgeBase.Embedding` calls the existing `/api/bunny-studio/knowledge/embed` route;
dimension is 1024 as today.

## Failure modes & handling

- **Model download fails / offline first run** — worker rejects; ingest shows the error;
  chat retrieval is already wrapped in try/catch and continues without KB context.
- **Dimension mismatch** (stale snapshot vs new model) — detected in `loadOrCreateDb`;
  snapshot dropped and the user is told to re-index instead of mixing vector spaces.
- **Worker/bundling unsupported** — fall back to a main-thread dynamic
  `import("@huggingface/transformers")` inside the client service (keeps the feature
  working, at the cost of possible UI jank during bulk indexing).
- **English-only default model** — non-English sources/answers degrade; multilingual
  models stay selectable per group.
- **Server bundle pollution** — the worker + Transformers.js are only reached through a
  dynamic import from a `"use client"` module; the server embed route must remain
  unchanged. Verify `next build` output.

## Validation

1. `bun run lint` (eslint) — no new errors.
2. `bun run build` — verifies Turbopack/Next bundles the worker and `@huggingface/transformers`
   without pulling the Node/native entry; fix `next.config.ts` (or worker import style) if not.
3. Manual, browser:
   - Create a new Knowledge Group → engine defaults to **Transformers.js (Local)** and model
     to `Xenova/bge-small-en-v1.5`.
   - Add a `.md` source; DevTools Network shows **no** call to
     `/api/bunny-studio/knowledge/embed` and shows the HF model files being fetched + cached.
   - Select the group in Chat Settings; send a message; the KB score panel shows hits and
     the answer is grounded.
   - Switch the group to SiliconFlow; the index is invalidated; **Re-index group** rebuilds
     it; DevTools shows the server embed route being used and retrieval still works.
   - Reload the page → the persisted index restores and chat retrieval still works.
4. Migration: load an existing DB (v8) with a Qwen-indexed group → opens at v9, the group's
   `embeddingEngine` is backfilled to `siliconFlow`, and its existing index still returns hits.

## Risks / open questions

- `@huggingface/transformers@4.3.0` is recent (v4 line); the `pipeline` API used here is
  stable, but confirm no SSR-time import during build.
- `onnxruntime-node` / `sharp` postinstall may need `ignoreScripts` entries; browser-only
  usage means the native runtime is never loaded.
- ORT WASM assets load from a CDN by default; full offline use needs the wasm vendored into
  `public/ort/` and `env.backends.onnx.wasm.wasmPaths` set (optional follow-up).
- `bge-small-en-v1.5` is English-only; the plan keeps multilingual models selectable.
