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
    return this.listWhere("projectId", projectId);
  }

  /** Create a board plus its three default columns. */
  async createWithDefaultColumns(
    projectId: string,
    name = "Board",
  ): Promise<{ board: BDBoard; columns: BDBoardColumn[] }> {
    const board = await this.create({ projectId, name, type: "kanban" });
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
  ): Promise<void> {
    await this.update(task.id, {
      columnId: column.id,
      status: column.status.name,
      rank: Date.now(),
    });
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
