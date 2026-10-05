# Bot Jobs — Agent Manager "hands-off" redesign

## Goal
Replace the one-way **Handoffs** record (pick agent + task + instruction, then click raw
state buttons) with a conversational **Bots** experience: each bot (agent) handles **Jobs**
(task-linked or standalone), and you talk to the bot in a persisted thread, iterating on its
output. Bots call their model through Helix and can push a good reply back into the linked
board task.

Scope is the `src/modules/bunny-dev/modules/agent-manager` module plus one small host change
in `project-management` (bot-authored comments).

## Locked decisions
- Bot replies are **real AI calls** (Helix), iterated over multiple turns.
- Conversation lives in the **Agent Manager hub** (not the task drawer). Task drawer is untouched except rendering bot comments.
- A **Job = one conversation thread with one bot**, optionally linked to **one** board task. Standalone jobs allowed.
- v1 output = **chat + board task writes** (post to comments, append/replace description). No sub-module artifact or virtual-FS writes.
- UI/code naming: **Bots** + **Jobs** with `BDAgentJob` / `BDAgentMessage`. Legacy handoffs are migrated.
- Job starts with a first message and the bot replies immediately. Simple status: `open | working | done | failed`.

## Out of scope (v1)
- Sub-module artifact generation (schema/app/diagram/outline) from a bot turn.
- Virtual file system deliverables.
- Token streaming (Helix `doChat`/`doChatWithHistory` is non-streaming). Show a "working…" state instead.
- Enforcing `agentSettings.concurrent`; multi-bot swarms; scheduled/autonomous runs.
- Knowledge/embedding retrieval.

---

## Data model (add to `BDAgent.Domain.ts`)

```ts
export const BDAgentJobStatus = { open, working, done, failed } as const;
export const BDAgentMessageRole = { user, bot, system } as const;

export interface BDAgentJob extends BDEntity {
  projectId: string;
  agentId: string;
  taskId?: string;          // optional board task link
  title: string;
  status: BDAgentJobStatus;
  lastMessageAt?: string;
  messageCount: number;
  tokensUsed?: number;
}

export interface BDAgentMessage extends BDEntity {
  projectId: string;
  jobId: string;
  agentId: string;
  role: BDAgentMessageRole; // "user" | "bot" | "system"
  content: string;
  error?: string;           // set when the bot turn failed
}
```

- Keep existing `BDAgentHandoff` / `BDAgentTask` / `BDAgentRun` types but mark them **legacy/deprecated** (still referenced by the old repositories and migration).
- Add bot fields to shared task comment (`BDTask.Domain.ts`):
  `BDTaskComment { authorId?: string; authorName?: string; agentId?: string; ... }` (all optional, no index change).

## Migration (`BDMigration.ts`, add version 4)
Dexie `.stores()` is a delta, so only list the new tables; unlisted tables are retained.

```ts
db.version(4)
  .stores({
    agentJobs: "id, projectId, agentId, taskId, status, updatedAt",
    agentMessages: "id, projectId, jobId, agentId, createdAt",
  })
  .upgrade(async (tx) => {
    // Idempotent: copy each agentHandoffs row -> one BDAgentJob + first user message.
    // status map: requested/running/waitingInput -> open, returned -> done, rejected/failed -> failed, accepted -> open.
    // title: instruction.slice(0, 60) || taskId || "Job".
  });
```
- Non-destructive: legacy `agentHandoffs` / `agentTasks` tables remain (readable), just unused.

## Database (`BDDatabase.ts`)
- Add `agentJobs!: Table<BDAgentJob, string>` and `agentMessages!: Table<BDAgentMessage, string>` + `agentJobsRepo` / `agentMessagesRepo`.
- Cascades: `agents.hook("deleting")` also delete `agentJobs.where("agentId")` and their `agentMessages`; add `agentJobs.hook("deleting")` → delete `agentMessages.where("jobId")`.
- Add both tables to `PROJECT_SCOPED_TABLES`.
- Table init + repo init in `constructor`.

## Repositories (`BDAgent.Repository.ts`)
- `BDAgentJobRepository extends BDRepository<BDAgentJob>`: `listByProject(projectId)` (sort by `updatedAt` desc), `listByAgent(agentId)`, `setStatus(id, status)`.
- `BDAgentMessageRepository extends BDRepository<BDAgentMessage>`: `listByJob(jobId)` (sort `createdAt` asc).
- Export singletons `bdAgentJobRepository`, `bdAgentMessageRepository`.
- Leave legacy handoff/task repos in place (still exported) but stop using them in UI.

## Hooks (`BDAgent.Hooks.ts`)
- `useBDAgentJobs(projectId)`, `useBDAgentJobsByAgent(agentId)`, `useBDAgentMessages(jobId)` via `useLiveQuery` with the same sorting as the repos.

## Types/factories (`BDAgent.Types.ts`)
- `createAgentJob(projectId, agentId, { taskId?, title })`, `createAgentMessage(projectId, jobId, agentId, role, content, error?)`.
- `BD_AGENT_JOB_STATUS_OPTIONS`, `jobStatusColor(status)` for badges.
- Replace `BD_HANDOFF_STATE_OPTIONS` usage in the UI (keep the export only if `BDProjectSettings` still imports `BD_HANDOFF_POLICY_OPTIONS` — that one stays).

## Server actions
1. `BDGeneration.Server.ts` — add generic chat entry (reuses the existing private `resolveHelixService`):
```ts
export interface BDChatGenerateParams {
  system: string;
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  aiConfig?: BDAIConfigOverride;
  temperature?: number;
  maxToken?: number;
}
export async function bdGenerateChat(p: BDChatGenerateParams): Promise<string>
// resolveHelixService(p.aiConfig) -> ai.doChatWithHistory({ messages, temperature, maxToken })
```
2. `BDAgent.Server.ts` — add `bdGenerateAgentReply(params)` (`"use server"`):
```ts
params: {
  agent: { name: string; prompt: string; model?: string; provider?: string };
  job: { title: string };
  task?: { key: string; name: string; description: string; status: string; priority: string };
  project?: { name?: string; description?: string };
  messages: { role: "user" | "bot"; content: string }[]; // map bot -> assistant
  aiConfig?: BDAIConfigOverride;
}
```
- Compose the system prompt: bot identity (`agent.name` + `agent.prompt`, fallback generic BunnyDev teammate prompt), project name/description, and the linked task block (key, name, status, priority, description). Instruct Markdown output and to ask a clarifying question when ambiguous.
- Cap history to the last ~20 messages. Return the reply string; throw a clean `Error` on failure (mirror `bdGenerateStructured`).

## UI / information architecture (`BDAgentManager.Component.tsx`)
Tabs: **Bots | Jobs | Proposals | Runs** (rename `handoffs` → `jobs`/`bots`; `Proposals`/`Runs` unchanged). Header: `AI Generate` (agent-config generation, keep) + `New bot`.

### Bots tab — 3-pane master/detail (desktop)
`grid-cols-[220px_minmax(0,260px)_minmax(0,1fr)]`; on narrow screens show one pane at a time with a back affordance.
- **Left — Bots**: selectable bot list (name, enabled dot, active-job count) + `New bot`; row actions Edit/Delete (reuse `BDAgentComponent`). Only `enabled` bots are selectable for new jobs.
- **Middle — Jobs**: jobs for the selected bot (title, status badge, task chip, message count, relative last activity) + `New job` (opens `BDAgentJobComponent`).
- **Right — Thread**: `BDAgentJobThreadComponent` for the selected job.

### Jobs tab
`BDList<BDAgentJob>` across all bots: columns Bot, Task (`key · name`), Status, Messages, Last activity. Row action **Open** sets the bot+job selection and switches to the Bots tab.

### New components
- `BDAgentJob.Component.tsx` — `BDModal`: select bot (prefilled with the current bot), optional board-task select (`bdDB.boardTasks`), required first message. On submit: create job (`status: "working"`, title from first message or `task.key · task.name`) → create user message → run the chat turn.
- `BDAgentJobThread.Component.tsx` — the chat surface:
  - Header: bot name/avatar, job title, linked-task chip (`key · name`), status badge, actions (Mark done, Delete job).
  - Virtualized message list (`react-virtuoso`, like `BDTaskComments`): user messages right-aligned, bot messages left with `BDMarkdownView`; render `error` messages distinctly; show a "Bot is typing…" row while `status === "working"`.
  - Composer: `BDWysiwygEditor` (compact) + Send. Enter-to-send optional; keep the button as the primary path.
  - Enter/disable during `working`.
  - Bot-message toolbar (hover): **Copy**, and when `job.taskId` — **Post to comments**, **Append to description**, **Replace description**.

### Chat turn (client flow inside the thread)
1. Create `BDAgentMessage{role:"user"}`; set job `status:"working"`, bump `messageCount`/`lastMessageAt`.
2. Resolve effective AI config: `agent.model`/`agent.provider` override → project override (`bdDB.aiSettings.get("project-"+projectId)`) → global `useBDAISettings()` (same precedence as `BDGenerationPanel`).
3. Load linked board task + project, build history from `useBDAgentMessages(job.id)` (last 20), call `bdGenerateAgentReply`.
4. Success → create bot message, set job `status:"open"`. Failure → create bot message with `error`, set job `status:"failed"`, toast.
5. `working` state must survive re-render; drive off the job record plus local in-flight flag.

## Board-task output actions
- **Post to comments**: `bdTaskCommentRepository.create({ taskId, comment: content, agentId: agent.id, authorName: agent.name })`.
- **Append / Replace description**: load the task, `bdBoardTaskRepository.update(taskId, { description })`.
- Update `BDTaskComments.Component.tsx`: when `comment.agentId` is set, render the bot identity (`authorName ?? "Bot"`) with a `Bot` icon/badge instead of `Member · <id>`; member comments unchanged.
- Update `agent-manager/index.ts` and `bunny-dev/index.ts` to export the new components/actions (job thread, new-job modal, job/message repos + hooks) and stop exporting removed UI-only helpers.

## Ordered task list
1. Domain types in `BDAgent.Domain.ts`; optional comment fields in `BDTask.Domain.ts`.
2. `BDMigration.ts` version 4 (new stores + handoff→job upgrade).
3. `BDDatabase.ts` tables, repos, cascades, project-scoped list.
4. `BDAgent.Repository.ts` job/message repos + singletons.
5. `BDAgent.Hooks.ts` job/message hooks.
6. `BDAgent.Types.ts` factories + status options.
7. `BDGeneration.Server.ts` `bdGenerateChat`; `BDAgent.Server.ts` `bdGenerateAgentReply`.
8. `BDAgentJobThread.Component.tsx` (thread + actions).
9. `BDAgentJob.Component.tsx` (New job modal).
10. Refactor `BDAgentManager.Component.tsx` to the Bots/Jobs IA.
11. `BDTaskComments.Component.tsx` bot-authored rendering.
12. Barrel exports (`agent-manager/index.ts`, `bunny-dev/index.ts`).
13. Adjacent cleanup: in `generateAgents` remove the extra `createGenerationRun` (the host `BDGenerationPanel` already creates a run → currently two runs per generation). Optionally honor `mode` in `applyAgentsArtifact`.
14. Docs: update `docs/BunnyDev.md` "Agent Manager" bullet from handoff wording to Bots/Jobs.

## Edge cases & failure modes
- **Empty bot prompt**: fall back to a generic teammate system prompt.
- **Job without task**: task context block omitted; task output actions hidden.
- **Deleted task/bot**: job keeps `taskId`/`agentId`; resolve defensively (show "Task removed" chip, disable task actions). Cascades delete jobs when the bot is deleted.
- **AI error/timeout**: persist a bot message with `error` and set job `failed`; user can retry by replying.
- **Long history**: cap to last 20 messages; keep the system prompt always.
- **Migration**: guard the upgrade so re-running never duplicates (skip if jobs already exist / check source count).
- **Disabled bot**: excluded from new-job selection; existing jobs still viewable.

## Validation
- `npx tsc --noEmit` and `npm run lint` (repo has no dedicated typecheck script).
- Manual (run `npm run dev`, open `/modules/bunny-dev/projects/<projectId>/agents`):
  1. Create a bot; start a job with a task and first message → bot replies.
  2. Reply again → multi-turn context retained.
  3. On a bot reply for a task-linked job: Post to comments → appears in the task drawer as a bot comment; Append/Replace description updates the task.
  4. Simulate an AI failure (bad provider) → job `failed`, error shown, retry works.
  5. Existing handoffs appear as migrated jobs after reload.
  6. Jobs tab aggregates jobs across bots; Open jumps to the thread.
