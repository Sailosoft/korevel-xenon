"use client";

// BDProjectManagementSettings.Component — project-wide board settings:
// rename and reorder the project's boards. Rendered inside project settings.

import { useEffect } from "react";
import { KanbanSquare, ArrowDown, ArrowUp } from "lucide-react";
import type { BDBoard } from "../../BDDomain.Types";
import { useBDProjectContext } from "../core/BDProject.Context";
import { useBDBoards } from "./BDTask.Hooks";
import { bdBoardRepository } from "./BDTask.Repository";
import { useBDToast } from "../../components/BDToast";
import { cn } from "@heroui/react";

const FIELD =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-blue-400";

export function BDProjectManagementSettingsComponent() {
  const { projectId } = useBDProjectContext();
  const boards = useBDBoards(projectId);
  const { toast } = useBDToast();

  // Backfill missing positions once boards load so ordering is stable.
  useEffect(() => {
    if (!boards || boards.length === 0) return;
    if (boards.every((board) => typeof board.position === "number")) return;
    void (async () => {
      for (let index = 0; index < boards.length; index++) {
        if (typeof boards[index].position !== "number") {
          await bdBoardRepository.update(boards[index].id, { position: index });
        }
      }
    })();
  }, [boards]);

  const renameBoard = async (board: BDBoard, nextName: string) => {
    const trimmed = nextName.trim();
    if (!trimmed || trimmed === board.name) return;
    await bdBoardRepository.update(board.id, { name: trimmed });
    toast({ title: "Board renamed", status: "success" });
  };

  const moveBoard = async (board: BDBoard, direction: -1 | 1) => {
    const list = [...(boards ?? [])];
    const index = list.findIndex((b) => b.id === board.id);
    const target = index + direction;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    for (let position = 0; position < list.length; position++) {
      await bdBoardRepository.update(list[position].id, { position });
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-3 flex items-center gap-2">
        <KanbanSquare className="h-4 w-4 text-blue-600" />
        <h2 className="text-sm font-semibold text-slate-800">
          Project Management
        </h2>
      </div>
      <p className="mb-3 text-xs text-slate-500">
        Rename or reorder the boards shown on the project board page.
      </p>

      {!boards || boards.length === 0 ? (
        <p className="py-2 text-xs text-slate-400">No boards in this project yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {boards.map((board, index) => (
            <div
              key={board.id}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2"
            >
              <input
                className={cn(FIELD, "flex-1")}
                defaultValue={board.name}
                onBlur={(e) => renameBoard(board, e.target.value)}
              />
              <button
                type="button"
                disabled={index === 0}
                onClick={() => moveBoard(board, -1)}
                className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                aria-label="Move board up"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={index === (boards.length ?? 0) - 1}
                onClick={() => moveBoard(board, 1)}
                className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                aria-label="Move board down"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default BDProjectManagementSettingsComponent;
