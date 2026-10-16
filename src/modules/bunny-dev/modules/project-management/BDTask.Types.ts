// BDTask.Types.ts — board/task defaults, factories, and option lists.

import type {
  BDBoard,
  BDBoardColumn,
  BDBoardTask,
  BDBoardTaskStatusType,
  BDPriority,
  BDTaskComment,
  BDTimeTracking,
} from "./BDTask.Domain";
import {
  BDBoardType,
  BDPriority as Priority,
  BDResolution,
  BDTaskStatusType,
} from "./BDTask.Domain";
import type { BDIssueType } from "../core/BDProject.Domain";
import { BDBoardTaskStatusCategory } from "../core/BDProject.Domain";

export const BD_TASK_TYPE_OPTIONS: { label: string; value: BDIssueType }[] = [
  "epic",
  "story",
  "task",
  "bug",
  "subtask",
  "spike",
].map((value) => ({ label: value, value: value as BDIssueType }));

export const BD_TASK_PRIORITY_OPTIONS: { label: string; value: BDPriority }[] = [
  "lowest",
  "low",
  "medium",
  "high",
  "highest",
  "blocker",
].map((value) => ({ label: value, value: value as BDPriority }));

export const BD_TASK_RESOLUTION_OPTIONS = [
  "unresolved",
  "fixed",
  "done",
  "duplicate",
  "wontDo",
  "cannotReproduce",
].map((value) => ({ label: value, value: value as BDResolution }));

export const BD_BOARD_TYPE_OPTIONS = [
  { label: "Scrum", value: BDBoardType.scrum },
  { label: "Kanban", value: BDBoardType.kanban },
];

// ── Board templates ────────────────────────────────────────────────────────

export interface BDBoardSectionSeed {
  name: string;
  category: BDBoardTaskStatusCategory;
  color: string;
  status?: BDTaskStatusType;
}

export interface BDBoardTemplate {
  id: string;
  label: string;
  type: BDBoardType;
  sections: BDBoardSectionSeed[];
}

const TODO = BDBoardTaskStatusCategory.todo;
const IN_PROGRESS = BDBoardTaskStatusCategory.inProgress;
const DONE = BDBoardTaskStatusCategory.done;

export const BD_BOARD_TEMPLATES: BDBoardTemplate[] = [
  {
    id: "kanban",
    label: "Kanban",
    type: BDBoardType.kanban,
    sections: [
      { name: "To Do", category: TODO, color: "gray", status: BDTaskStatusType.start },
      { name: "In Progress", category: IN_PROGRESS, color: "blue", status: BDTaskStatusType.onGoing },
      { name: "Done", category: DONE, color: "green", status: BDTaskStatusType.finished },
    ],
  },
  {
    id: "scrum",
    label: "Scrum",
    type: BDBoardType.scrum,
    sections: [
      { name: "Backlog", category: TODO, color: "slate", status: BDTaskStatusType.start },
      { name: "To Do", category: TODO, color: "gray", status: BDTaskStatusType.start },
      { name: "In Progress", category: IN_PROGRESS, color: "blue", status: BDTaskStatusType.onGoing },
      { name: "In Review", category: IN_PROGRESS, color: "purple", status: BDTaskStatusType.onGoing },
      { name: "Done", category: DONE, color: "green", status: BDTaskStatusType.finished },
    ],
  },
  {
    id: "bug",
    label: "Bug tracking",
    type: BDBoardType.kanban,
    sections: [
      { name: "New", category: TODO, color: "gray", status: BDTaskStatusType.start },
      { name: "Triage", category: TODO, color: "amber", status: BDTaskStatusType.start },
      { name: "In Progress", category: IN_PROGRESS, color: "blue", status: BDTaskStatusType.onGoing },
      { name: "Resolved", category: DONE, color: "teal", status: BDTaskStatusType.finished },
      { name: "Closed", category: DONE, color: "green", status: BDTaskStatusType.finished },
    ],
  },
  { id: "blank", label: "Blank", type: BDBoardType.kanban, sections: [] },
];

export function boardTemplateById(id: string): BDBoardTemplate | undefined {
  return BD_BOARD_TEMPLATES.find((template) => template.id === id);
}

// ── Board keys + task numbering ────────────────────────────────────────────

/** Normalize a user-supplied board key (uppercase, alnum + hyphen). */
export function sanitizeBoardKey(value: string): string {
  const cleaned = value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .slice(0, 10);
  return cleaned || "BOARD";
}

/** Uppercase board key from a name (e.g. "My Board" → "MYB"), unique in-project. */
export function deriveBoardKey(
  name: string,
  existingKeys: string[] = [],
): string {
  const words = name
    .trim()
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean);
  let base = (words[0] ?? "").slice(0, 3);
  for (let i = 1; i < words.length; i++) base += words[i][0];
  base = base.replace(/[^A-Z0-9]/g, "").slice(0, 6);
  if (!base) base = "BOARD";
  const taken = new Set(existingKeys.map((key) => key.toUpperCase()));
  if (!taken.has(base)) return base;
  for (let i = 2; i < 1000; i++) {
    const candidate = `${base}${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base}${Date.now()}`;
}

/** Next task number for a board key, derived from existing keys (collision-safe). */
export function nextBoardTaskNumber(
  boardKey: string,
  boardTasks: { key?: string }[],
): number {
  const prefix = `${boardKey}-`;
  let max = 0;
  for (const task of boardTasks) {
    if (!task.key || !task.key.startsWith(prefix)) continue;
    const n = Number(task.key.slice(prefix.length));
    if (Number.isFinite(n)) max = Math.max(max, n);
  }
  return Math.max(max + 1, boardTasks.length + 1);
}

// ── Card chips ─────────────────────────────────────────────────────────────

export interface BDBoardCardChipDef {
  id: string;
  label: string;
}

export const BD_BOARD_CARD_CHIPS: BDBoardCardChipDef[] = [
  { id: "key", label: "Key" },
  { id: "type", label: "Type" },
  { id: "priority", label: "Priority" },
  { id: "storyPoints", label: "Story points" },
  { id: "assignee", label: "Assignee" },
  { id: "dueDate", label: "Due date" },
];

export const BD_DEFAULT_CARD_CHIPS = ["type", "priority", "storyPoints"];

export function customChipId(slug: string): string {
  return `custom:${slug}`;
}

const DEFAULT_COLUMNS: BDBoardTaskStatusType[] = [
  {
    name: "To Do",
    position: 0,
    status: BDTaskStatusType.start,
    category: BDBoardTaskStatusCategory.todo,
    color: "gray",
  },
  {
    name: "In Progress",
    position: 1,
    status: BDTaskStatusType.onGoing,
    category: BDBoardTaskStatusCategory.inProgress,
    color: "blue",
  },
  {
    name: "Done",
    position: 2,
    status: BDTaskStatusType.finished,
    category: BDBoardTaskStatusCategory.done,
    color: "green",
  },
];

export function defaultTimeTracking(): BDTimeTracking {
  return { originalEstimate: 0, remainingEstimate: 0, timeSpent: 0 };
}

export function createDefaultBoard(
  projectId: string,
  name = "Board",
): { board: Omit<BDBoard, "id">; columns: (Omit<BDBoardColumn, "id">)[] } {
  return {
    board: {
      projectId,
      name,
      type: BDBoardType.kanban,
    },
    columns: DEFAULT_COLUMNS.map((status, position) => ({
      boardId: "",
      name: status.name,
      status,
      position,
    })),
  };
}

export function createBoardColumn(
  boardId: string,
  name: string,
  position: number,
  options?: {
    category?: BDBoardTaskStatusCategory;
    color?: string;
    status?: BDTaskStatusType;
  },
): Omit<BDBoardColumn, "id"> {
  return {
    boardId,
    name,
    position,
    status: {
      name,
      position,
      status: options?.status ?? BDTaskStatusType.start,
      category: options?.category ?? BDBoardTaskStatusCategory.todo,
      color: options?.color ?? "gray",
    },
  };
}

/** Format a task key from a board key and an already-computed number. */
export function nextTaskKey(boardKey: string, number: number): string {
  return `${boardKey || "TASK"}-${number}`;
}

export function createBoardTask(
  projectId: string,
  boardId: string,
  column: BDBoardColumn,
  key: string,
): Omit<BDBoardTask, "id"> {
  return {
    projectId,
    boardId,
    columnId: column.id,
    key,
    name: "New task",
    description: "",
    type: "task",
    status: column.status.name,
    priority: Priority.medium,
    resolution: BDResolution.unresolved,
    // Deterministic default; callers append using the column's current max rank.
    rank: 0,
    subtaskIds: [],
    fixVersionIds: [],
    labelIds: [],
    watcherIds: [],
    votes: 0,
    timeTracking: defaultTimeTracking(),
  };
}

export function createComment(
  taskId: string,
  comment: string,
  authorId?: string,
): Omit<BDTaskComment, "id"> {
  return { taskId, comment, authorId };
}

// ── AI artifact drafts ─────────────────────────────────────────────────────

export interface BDTaskDraft {
  key?: string;
  name: string;
  description?: string;
  type?: string;
  priority?: string;
  status?: string;
  storyPoints?: number;
}

export interface BDBoardDraft {
  name: string;
  tasks: BDTaskDraft[];
}

export interface BDTaskArtifact {
  boards: BDBoardDraft[];
}
