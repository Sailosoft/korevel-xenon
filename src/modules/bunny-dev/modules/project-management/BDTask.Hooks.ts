"use client";

// BDTask.Hooks — Dexie live queries for the project management board.

import { useLiveQuery } from "dexie-react-hooks";
import { bdDB } from "../../BDDatabase";
import type {
  BDBoard,
  BDBoardColumn,
  BDBoardTask,
  BDTaskComment,
} from "../../BDDomain.Types";

export function useBDBoards(projectId: string): BDBoard[] | undefined {
  return useLiveQuery(
    () => bdDB.boards.where("projectId").equals(projectId).toArray(),
    [projectId],
  );
}

export function useBDBoardColumns(
  boardId: string | undefined,
): BDBoardColumn[] | undefined {
  return useLiveQuery(async () => {
    if (!boardId) return [];
    const rows = await bdDB.boardColumns.where("boardId").equals(boardId).toArray();
    return rows.sort((a, b) => a.position - b.position);
  }, [boardId]);
}

export function useBDBoardTasks(
  projectId: string,
  boardId: string | undefined,
): BDBoardTask[] | undefined {
  return useLiveQuery(async () => {
    const rows = await bdDB.boardTasks
      .where("projectId")
      .equals(projectId)
      .toArray();
    const filtered = boardId ? rows.filter((t) => t.boardId === boardId) : rows;
    return filtered.sort((a, b) => a.rank - b.rank);
  }, [projectId, boardId]);
}

export function useBDTaskComments(
  taskId: string | undefined,
): BDTaskComment[] | undefined {
  return useLiveQuery(async () => {
    if (!taskId) return [];
    const rows = await bdDB.taskComments.where("taskId").equals(taskId).toArray();
    return rows.sort((a, b) =>
      (a.createdAt ?? "").localeCompare(b.createdAt ?? ""),
    );
  }, [taskId]);
}
