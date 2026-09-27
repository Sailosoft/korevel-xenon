"use client";

import { useState } from "react";
import { KanbanSquare, Plus, Trash2, LayoutDashboard, Sparkles } from "lucide-react";
import type { BDBoard, BDBoardColumn, BDBoardTask } from "../../BDDomain.Types";
import { useBDProjectContext } from "../core/BDProject.Context";
import { useBDBoardColumns, useBDBoardTasks, useBDBoards } from "./BDTask.Hooks";
import {
  bdBoardColumnRepository,
  bdBoardRepository,
  bdBoardTaskRepository,
} from "./BDTask.Repository";
import {
  createBoardTask,
  nextTaskKey,
  type BDTaskArtifact,
} from "./BDTask.Types";
import { bdGenerateTasks } from "./BDTaskBuilder.Server";
import BDBoardComponent from "./BDBoard.Component";
import BDTaskDrawerComponent from "./BDTaskDrawer.Component";
import BDPageHeader from "../../components/BDPageHeader";
import BDButton from "../../components/BDButton";
import BDEmptyState from "../../components/BDEmptyState";
import BDConfirmDialog from "../../components/BDConfirmDialog";
import BDGenerationPanel from "../agent-manager/BDGenerationPanel";
import { useBDToast } from "../../components/BDToast";
import { cn } from "@heroui/react";

export function BDProjectManagementComponent() {
  const { projectId, project } = useBDProjectContext();
  const { toast } = useBDToast();
  const boards = useBDBoards(projectId);

  const [activeBoardId, setActiveBoardId] = useState<string | undefined>();
  const resolvedBoardId =
    activeBoardId && boards?.some((b) => b.id === activeBoardId)
      ? activeBoardId
      : boards?.[0]?.id;
  if (resolvedBoardId !== activeBoardId) setActiveBoardId(resolvedBoardId);

  const columns = useBDBoardColumns(resolvedBoardId);
  const tasks = useBDBoardTasks(projectId, resolvedBoardId);

  const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>();
  const [deletingTask, setDeletingTask] = useState<BDBoardTask | null>(null);
  const [deletingBoard, setDeletingBoard] = useState<BDBoard | null>(null);
  const [aiOpen, setAiOpen] = useState(false);

  const selectedTask = (tasks ?? []).find((t) => t.id === selectedTaskId);

  const createBoard = async () => {
    const { board } = await bdBoardRepository.createWithDefaultColumns(
      projectId,
      "Board",
    );
    setActiveBoardId(board.id);
    toast({ title: "Board created", status: "success" });
  };

  const addTask = async (column: BDBoardColumn) => {
    if (!resolvedBoardId) return;
    const key = nextTaskKey(project?.key ?? "TASK", tasks?.length ?? 0);
    const created = await bdBoardTaskRepository.create(
      createBoardTask(projectId, resolvedBoardId, column, key),
    );
    setSelectedTaskId(created.id);
  };

  const moveTask = async (task: BDBoardTask, column: BDBoardColumn) => {
    await bdBoardTaskRepository.moveToColumn(task, column);
  };

  const saveTask = async (task: BDBoardTask) => {
    await bdBoardTaskRepository.update(task.id, task);
    setSelectedTaskId(undefined);
    toast({ title: "Task saved", status: "success" });
  };

  const deleteTask = async () => {
    if (!deletingTask) return;
    await bdBoardTaskRepository.delete(deletingTask.id);
    if (selectedTaskId === deletingTask.id) setSelectedTaskId(undefined);
    setDeletingTask(null);
    toast({ title: "Task deleted", status: "success" });
  };

  const deleteBoard = async () => {
    if (!deletingBoard) return;
    await bdBoardRepository.delete(deletingBoard.id);
    setDeletingBoard(null);
    toast({ title: "Board deleted", status: "success" });
  };

  const applyArtifact = async (artifact: BDTaskArtifact) => {
    for (const boardDraft of artifact.boards) {
      const board =
        resolvedBoardId && boards && boards.length > 0
          ? boards[0]
          : (await bdBoardRepository.createWithDefaultColumns(projectId, boardDraft.name))
              .board;
      const boardColumns = await bdBoardColumnRepository.listByBoard(board.id);
      const existing = await bdBoardTaskRepository.listByBoard(board.id);
      let counter = existing.length;
      for (const taskDraft of boardDraft.tasks) {
        const column =
          boardColumns.find((c) => c.status.name === taskDraft.status) ??
          boardColumns[0];
        if (!column) continue;
        const task = createBoardTask(
          projectId,
          board.id,
          column,
          nextTaskKey(project?.key ?? "TASK", counter++),
        );
        await bdBoardTaskRepository.create({
          ...task,
          name: taskDraft.name,
          description: taskDraft.description ?? "",
          type: (taskDraft.type ?? "task") as BDBoardTask["type"],
          priority: (taskDraft.priority ?? "medium") as BDBoardTask["priority"],
          status: column.status.name,
          storyPoints: taskDraft.storyPoints,
        });
      }
      setActiveBoardId(board.id);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <BDPageHeader
        icon={KanbanSquare}
        title="Project Management"
        description="A JIRA-style kanban board with tasks, comments, and drag-and-drop status changes."
        actions={
          <>
            <BDButton
              variant="secondary"
              icon={Sparkles}
              onClick={() => setAiOpen(true)}
            >
              AI Generate
            </BDButton>
            <BDButton icon={Plus} onClick={createBoard}>
              New board
            </BDButton>
          </>
        }
      />

      <BDGenerationPanel<BDTaskArtifact>
        projectId={projectId}
        subsystem="board"
        open={aiOpen}
        onOpenChange={setAiOpen}
        title="AI Task Generation"
        placeholder="e.g. A backlog for building user authentication"
        generate={({ instruction, mode, aiConfig }) =>
          bdGenerateTasks({
            instruction,
            mode,
            statuses: columns?.map((c) => c.status.name),
            aiConfig,
          })
        }
        onApply={applyArtifact}
        defaultMode="append"
        modes={["create", "append"]}
        renderPreview={(artifact) => (
          <div className="flex flex-col gap-2">
            {artifact.boards.map((b, i) => (
              <div key={i} className="rounded-lg border border-slate-200 p-3">
                <p className="text-sm font-semibold text-slate-800">
                  {b.name} · {b.tasks.length} tasks
                </p>
                <ul className="mt-1 list-disc pl-5 text-xs text-slate-500">
                  {b.tasks.slice(0, 6).map((t, j) => (
                    <li key={j}>{t.name}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      />

      {boards && boards.length === 0 ? (
        <BDEmptyState
          icon={LayoutDashboard}
          title="No boards yet"
          description="Create a board to start organizing work."
          action={
            <BDButton icon={Plus} onClick={createBoard}>
              New board
            </BDButton>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            {(boards ?? []).map((board) => (
              <div
                key={board.id}
                className={cn(
                  "group flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm",
                  board.id === resolvedBoardId
                    ? "bg-blue-100 font-semibold text-blue-700"
                    : "text-slate-500 hover:bg-slate-100",
                )}
              >
                <button
                  type="button"
                  onClick={() => setActiveBoardId(board.id)}
                >
                  {board.name}
                </button>
                <button
                  type="button"
                  className="rounded p-0.5 text-slate-300 opacity-0 group-hover:opacity-100 hover:text-red-500"
                  onClick={() => setDeletingBoard(board)}
                  aria-label="Delete board"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          <BDBoardComponent
            columns={columns ?? []}
            tasks={tasks ?? []}
            onSelectTask={(task) => setSelectedTaskId(task.id)}
            onMoveTask={moveTask}
            onAddTask={addTask}
          />
        </div>
      )}

      <BDTaskDrawerComponent
        open={!!selectedTask}
        task={selectedTask ?? null}
        columns={columns ?? []}
        onClose={() => setSelectedTaskId(undefined)}
        onSave={saveTask}
        onDelete={(task) => setDeletingTask(task)}
      />

      <BDConfirmDialog
        open={!!deletingTask}
        title={`Delete ${deletingTask?.key ?? "task"}?`}
        confirmLabel="Delete task"
        onConfirm={deleteTask}
        onCancel={() => setDeletingTask(null)}
      />

      <BDConfirmDialog
        open={!!deletingBoard}
        title={`Delete ${deletingBoard?.name ?? "board"}?`}
        description="All tasks on this board will be removed."
        confirmLabel="Delete board"
        onConfirm={deleteBoard}
        onCancel={() => setDeletingBoard(null)}
      />
    </div>
  );
}

export default BDProjectManagementComponent;
