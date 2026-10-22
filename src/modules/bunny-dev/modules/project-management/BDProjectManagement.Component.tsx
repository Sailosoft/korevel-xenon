"use client";

import { useState } from "react";
import {
  KanbanSquare,
  Plus,
  Trash2,
  LayoutDashboard,
  Sparkles,
  Settings2,
  Columns3,
  List,
} from "lucide-react";
import type {
  BDBoard,
  BDBoardColumn,
  BDBoardTask,
  BDGenerationMode,
} from "../../BDDomain.Types";
import { useBDProjectContext } from "../core/BDProject.Context";
import {
  useBDBoardColumns,
  useBDBoardTasks,
  useBDBoards,
  useBDProjectMembers,
} from "./BDTask.Hooks";
import {
  bdBoardColumnRepository,
  bdBoardRepository,
  bdBoardTaskRepository,
} from "./BDTask.Repository";
import {
  createBoardTask,
  nextBoardTaskNumber,
  nextTaskKey,
  type BDTaskArtifact,
} from "./BDTask.Types";
import { bdGenerateTasks } from "./BDTaskBuilder.Server";
import { bdSerializeTarget } from "../agent-manager/BDGeneration.Mode";
import BDBoardComponent from "./BDBoard.Component";
import BDBoardListComponent, {
  boardGroupByOptions,
} from "./BDBoardList.Component";
import BDBoardDialogComponent from "./BDBoardDialog.Component";
import BDBoardSettingsComponent from "./BDBoardSettings.Component";
import BDTaskDrawerComponent from "./BDTaskDrawer.Component";
import BDPageHeader from "../../components/BDPageHeader";
import BDButton from "../../components/BDButton";
import BDIconButton from "../../components/BDIconButton";
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
  const allTasks = useBDBoardTasks(projectId, undefined);
  const members = useBDProjectMembers(projectId);

  const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>();
  const [newTaskDraft, setNewTaskDraft] = useState<
    Omit<BDBoardTask, "id"> | null
  >(null);
  const [deletingTask, setDeletingTask] = useState<BDBoardTask | null>(null);
  const [deletingBoard, setDeletingBoard] = useState<BDBoard | null>(null);
  const [settingsBoardId, setSettingsBoardId] = useState<string | undefined>();
  const [createBoardOpen, setCreateBoardOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [view, setView] = useState<"board" | "list">("board");
  const [groupBy, setGroupBy] = useState("status");

  const activeBoard = (boards ?? []).find((b) => b.id === resolvedBoardId);
  const selectedTask = (tasks ?? []).find((t) => t.id === selectedTaskId);

  const createBoard = () => setCreateBoardOpen(true);

  const onBoardCreated = (board: BDBoard) => {
    setActiveBoardId(board.id);
  };

  /** Open the drawer in create mode without touching the database. */
  const addTask = (column: BDBoardColumn) => {
    if (!resolvedBoardId) return;
    setNewTaskDraft(createBoardTask(projectId, resolvedBoardId, column, ""));
    setSelectedTaskId(undefined);
  };

  /** Persist a create-mode draft with a fresh key + deterministic rank. */
  const createTask = async (draft: Omit<BDBoardTask, "id">) => {
    const boardKey = activeBoard?.key ?? project?.key ?? "TASK";
    const key = nextTaskKey(
      boardKey,
      nextBoardTaskNumber(boardKey, tasks ?? []),
    );
    const maxRank = (tasks ?? []).reduce((max, t) => Math.max(max, t.rank), 0);
    const created = await bdBoardTaskRepository.create({
      ...draft,
      key,
      rank: maxRank + 1,
    });
    setNewTaskDraft(null);
    setSelectedTaskId(created.id);
    toast({ title: "Task created", status: "success" });
  };

  const moveTask = async (
    task: BDBoardTask,
    column: BDBoardColumn,
    beforeTaskId?: string,
  ) => {
    await bdBoardTaskRepository.moveToColumn(task, column, beforeTaskId);
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

  const applyArtifact = async (
    artifact: BDTaskArtifact,
    mode: BDGenerationMode,
    targetId?: string,
  ) => {
    const taskFields = (taskDraft: BDTaskArtifact["boards"][number]["tasks"][number]) => ({
      name: taskDraft.name,
      description: taskDraft.description ?? "",
      type: (taskDraft.type ?? "task") as BDBoardTask["type"],
      priority: (taskDraft.priority ?? "medium") as BDBoardTask["priority"],
      storyPoints: taskDraft.storyPoints,
    });

    const addTasks = async (
      boardId: string,
      boardKey: string,
      boardDraft: BDTaskArtifact["boards"][number],
    ) => {
      const boardColumns = await bdBoardColumnRepository.listByBoard(boardId);
      const existing = await bdBoardTaskRepository.listByBoard(boardId);
      let number = nextBoardTaskNumber(boardKey, existing);
      let rank = existing.reduce((max, t) => Math.max(max, t.rank), 0) + 1;
      for (const taskDraft of boardDraft.tasks) {
        const column =
          boardColumns.find((c) => c.status.name === taskDraft.status) ??
          boardColumns[0];
        if (!column) continue;
        const task = createBoardTask(
          projectId,
          boardId,
          column,
          nextTaskKey(boardKey, number++),
        );
        await bdBoardTaskRepository.create({
          ...task,
          ...taskFields(taskDraft),
          status: column.status.name,
          rank: rank++,
        });
      }
    };

    if (mode !== "create") {
      if (!targetId) throw new Error("Select a board first.");
      const board = await bdBoardRepository.get(targetId);
      if (!board) throw new Error("The selected board no longer exists.");
      const boardDraft = artifact.boards[0];
      const boardKey = board.key ?? board.name;

      if (mode === "append") {
        if (boardDraft) await addTasks(targetId, boardKey, boardDraft);
      } else if (mode === "update") {
        const boardColumns = await bdBoardColumnRepository.listByBoard(targetId);
        const existing = await bdBoardTaskRepository.listByBoard(targetId);
        const byName = new Map(existing.map((t) => [t.name, t]));
        let number = nextBoardTaskNumber(boardKey, existing);
        let rank = existing.reduce((max, t) => Math.max(max, t.rank), 0) + 1;
        for (const taskDraft of boardDraft?.tasks ?? []) {
          const match = byName.get(taskDraft.name);
          const column =
            boardColumns.find((c) => c.status.name === taskDraft.status) ??
            boardColumns.find((c) => c.id === match?.columnId) ??
            boardColumns[0];
          if (match) {
            await bdBoardTaskRepository.update(match.id, {
              ...taskFields(taskDraft),
              status: column?.status.name ?? match.status,
              columnId: column?.id ?? match.columnId,
            });
          } else {
            if (!column) continue;
            const task = createBoardTask(
              projectId,
              targetId,
              column,
              nextTaskKey(boardKey, number++),
            );
            await bdBoardTaskRepository.create({
              ...task,
              ...taskFields(taskDraft),
              status: column.status.name,
              rank: rank++,
            });
          }
        }
      } else {
        await bdBoardTaskRepository.deleteWhere("boardId", targetId);
        if (boardDraft) await addTasks(targetId, boardKey, boardDraft);
      }
      setActiveBoardId(targetId);
      return;
    }

    for (const boardDraft of artifact.boards) {
      const { board } = await bdBoardRepository.createWithDefaultColumns(
        projectId,
        boardDraft.name,
      );
      await addTasks(board.id, board.key ?? board.name, boardDraft);
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
            {activeBoard && (
              <BDButton
                variant="secondary"
                icon={Settings2}
                onClick={() => setSettingsBoardId(activeBoard.id)}
              >
                Board settings
              </BDButton>
            )}
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
        generate={({ instruction, mode, aiConfig, targetContext }) =>
          bdGenerateTasks({
            instruction,
            mode,
            statuses: columns?.map((c) => c.status.name),
            targetContext,
            aiConfig,
          })
        }
        onApply={applyArtifact}
        defaultMode="append"
        targets={(boards ?? []).map((b) => ({ id: b.id, label: b.name }))}
        targetLabel="Board"
        buildTargetContext={(id) => {
          const board = (boards ?? []).find((b) => b.id === id);
          if (!board) return undefined;
          const boardTasks = (allTasks ?? []).filter((t) => t.boardId === id);
          return bdSerializeTarget({ board, tasks: boardTasks });
        }}
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
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-2">
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
                  <BDIconButton
                    icon={Trash2}
                    label="Delete board"
                    size="sm"
                    className="h-6 px-1 py-0.5 text-slate-300 group-hover:opacity-100 hover:text-red-500"
                    onClick={() => setDeletingBoard(board)}
                  />
                </div>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5">
                <button
                  type="button"
                  onClick={() => setView("board")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium",
                    view === "board"
                      ? "bg-blue-100 text-blue-700"
                      : "text-slate-500 hover:bg-slate-100",
                  )}
                >
                  <Columns3 className="h-3.5 w-3.5" />
                  Board
                </button>
                <button
                  type="button"
                  onClick={() => setView("list")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium",
                    view === "list"
                      ? "bg-blue-100 text-blue-700"
                      : "text-slate-500 hover:bg-slate-100",
                  )}
                >
                  <List className="h-3.5 w-3.5" />
                  List
                </button>
              </div>

              {view === "list" && (
                <select
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs outline-none focus:border-blue-400"
                  value={groupBy}
                  onChange={(event) => setGroupBy(event.target.value)}
                >
                  {boardGroupByOptions(activeBoard?.customFields).map(
                    (option) => (
                      <option key={option.value} value={option.value}>
                        Group by {option.label}
                      </option>
                    ),
                  )}
                </select>
              )}
            </div>
          </div>

          {view === "board" ? (
            <BDBoardComponent
              columns={columns ?? []}
              tasks={tasks ?? []}
              cardChips={activeBoard?.cardChips}
              customFields={activeBoard?.customFields}
              members={members ?? []}
              onSelectTask={(task) => setSelectedTaskId(task.id)}
              onMoveTask={moveTask}
              onAddTask={addTask}
            />
          ) : (
            <BDBoardListComponent
              columns={columns ?? []}
              tasks={tasks ?? []}
              groupBy={groupBy}
              cardChips={activeBoard?.cardChips}
              customFields={activeBoard?.customFields}
              members={members ?? []}
              onSelectTask={(task) => setSelectedTaskId(task.id)}
            />
          )}
        </div>
      )}

      <BDTaskDrawerComponent
        open={!!selectedTask || !!newTaskDraft}
        mode={newTaskDraft ? "create" : "update"}
        task={selectedTask ?? null}
        newTask={newTaskDraft}
        columns={columns ?? []}
        projectId={projectId}
        customFields={activeBoard?.customFields}
        onClose={() => {
          setNewTaskDraft(null);
          setSelectedTaskId(undefined);
        }}
        onCreate={createTask}
        onDelete={(task) => setDeletingTask(task)}
      />

      <BDBoardSettingsComponent
        open={!!settingsBoardId}
        boardId={settingsBoardId}
        onClose={() => setSettingsBoardId(undefined)}
      />

      <BDBoardDialogComponent
        open={createBoardOpen}
        projectId={projectId}
        onClose={() => setCreateBoardOpen(false)}
        onCreated={onBoardCreated}
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
