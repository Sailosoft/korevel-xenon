// BDTask.Repository.ts — board, column, task, and comment repositories.

import { bdDB } from "../../BDDatabase";
import type {
  BDBoard,
  BDBoardColumn,
  BDBoardTask,
  BDTaskComment,
} from "../../BDDomain.Types";
import { BDRepository } from "../../BDRepository";
import { createBoardColumn } from "./BDTask.Types";

export class BDBoardRepository extends BDRepository<BDBoard> {
  constructor() {
    super(bdDB.boards);
  }

  async listByProject(projectId: string): Promise<BDBoard[]> {
    const rows = await this.listWhere("projectId", projectId);
    return rows.sort(
      (a, b) =>
        (a.position ?? 0) - (b.position ?? 0) ||
        a.name.localeCompare(b.name),
    );
  }

  /** Create a board plus its three default columns. */
  async createWithDefaultColumns(
    projectId: string,
    name = "Board",
  ): Promise<{ board: BDBoard; columns: BDBoardColumn[] }> {
    const existing = await this.listByProject(projectId);
    const position =
      existing.reduce((max, board) => Math.max(max, board.position ?? 0), -1) +
      1;
    const board = await this.create({ projectId, name, type: "kanban", position });
    const names = ["To Do", "In Progress", "Done"];
    const columns: BDBoardColumn[] = [];
    for (let index = 0; index < names.length; index++) {
      columns.push(
        await bdBoardColumnRepository.create(
          createBoardColumn(board.id, names[index], index),
        ),
      );
    }
    return { board, columns };
  }
}

export class BDBoardColumnRepository extends BDRepository<BDBoardColumn> {
  constructor() {
    super(bdDB.boardColumns);
  }

  async listByBoard(boardId: string): Promise<BDBoardColumn[]> {
    const rows = await this.listWhere("boardId", boardId);
    return rows.sort((a, b) => a.position - b.position);
  }
}

export class BDBoardTaskRepository extends BDRepository<BDBoardTask> {
  constructor() {
    super(bdDB.boardTasks);
  }

  async listByBoard(boardId: string): Promise<BDBoardTask[]> {
    const rows = await this.listWhere("boardId", boardId);
    return rows.sort((a, b) => a.rank - b.rank);
  }

  async listByProject(projectId: string): Promise<BDBoardTask[]> {
    return this.listWhere("projectId", projectId);
  }

  /** Move a task into a column, updating its status + column id. */
  async moveToColumn(
    task: BDBoardTask,
    column: BDBoardColumn,
    beforeTaskId?: string,
  ): Promise<void> {
    await this.reorder(task.id, column, beforeTaskId);
  }

  /**
   * Move a task into `column`, inserting it before `beforeTaskId` when given
   * (or appending within the column when omitted), then reindex the whole
   * board with sequential ranks so ordering stays deterministic and tie-free.
   */
  async reorder(
    taskId: string,
    column: BDBoardColumn,
    beforeTaskId?: string,
  ): Promise<void> {
    const task = await this.get(taskId);
    if (!task) return;
    if (beforeTaskId === taskId) return;
    const all = await this.listByBoard(task.boardId);
    const inColumn = (t: BDBoardTask) =>
      t.columnId === column.id || t.status === column.status.name;

    const moved: BDBoardTask = {
      ...task,
      columnId: column.id,
      status: column.status.name,
    };
    const rest = all.filter((t) => t.id !== taskId);

    let insertIndex: number;
    if (beforeTaskId) {
      const index = rest.findIndex((t) => t.id === beforeTaskId);
      insertIndex = index === -1 ? rest.length : index;
    } else {
      let lastIndex = -1;
      for (let i = 0; i < rest.length; i++) {
        if (inColumn(rest[i])) lastIndex = i;
      }
      insertIndex = lastIndex === -1 ? rest.length : lastIndex + 1;
    }

    const ordered = [
      ...rest.slice(0, insertIndex),
      moved,
      ...rest.slice(insertIndex),
    ];
    await this.bulkPut(ordered.map((t, index) => ({ ...t, rank: index + 1 })));
  }
}

export class BDTaskCommentRepository extends BDRepository<BDTaskComment> {
  constructor() {
    super(bdDB.taskComments);
  }

  async listByTask(taskId: string): Promise<BDTaskComment[]> {
    const rows = await this.listWhere("taskId", taskId);
    return rows.sort((a, b) =>
      (a.createdAt ?? "").localeCompare(b.createdAt ?? ""),
    );
  }
}

export const bdBoardRepository = new BDBoardRepository();
export const bdBoardColumnRepository = new BDBoardColumnRepository();
export const bdBoardTaskRepository = new BDBoardTaskRepository();
export const bdTaskCommentRepository = new BDTaskCommentRepository();
