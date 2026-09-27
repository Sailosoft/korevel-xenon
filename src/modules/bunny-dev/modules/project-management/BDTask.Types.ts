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
): Omit<BDBoardColumn, "id"> {
  return {
    boardId,
    name,
    position,
    status: {
      name,
      position,
      status: BDTaskStatusType.start,
      category: BDBoardTaskStatusCategory.todo,
      color: "gray",
    },
  };
}

export function nextTaskKey(projectKey: string, existingCount: number): string {
  return `${projectKey || "TASK"}-${existingCount + 1}`;
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
    rank: Date.now(),
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
