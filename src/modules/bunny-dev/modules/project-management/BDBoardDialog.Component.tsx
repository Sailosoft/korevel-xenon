"use client";

// BDBoardDialog — the shared "New board" dialog. Lets the user name the board,
// pick/adjust its key, choose a template, and edit the section list (add,
// remove, reorder, insert-in-between) before creating it.

import { useState } from "react";
import { v7 as uuidv7 } from "uuid";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import type { BDBoard, BDBoardType } from "../../BDDomain.Types";
import {
  BDBoardTaskStatusCategory,
  BDBoardType as BoardType,
} from "../../BDDomain.Types";
import { useBDBoards } from "./BDTask.Hooks";
import { bdBoardRepository } from "./BDTask.Repository";
import {
  BD_BOARD_TEMPLATES,
  boardTemplateById,
  deriveBoardKey,
  type BDBoardSectionSeed,
} from "./BDTask.Types";
import BDModal from "../../components/BDModal";
import BDButton from "../../components/BDButton";
import BDSortableList from "../../components/BDSortableList";
import { useBDToast } from "../../components/BDToast";
import { cn } from "@heroui/react";

export interface BDBoardDialogComponentProps {
  open: boolean;
  projectId: string;
  onClose: () => void;
  onCreated: (board: BDBoard) => void;
}

interface DraftSection extends BDBoardSectionSeed {
  id: string;
}

const FIELD =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-blue-400";

const CATEGORY_OPTIONS: {
  label: string;
  value: BDBoardTaskStatusCategory;
  color: string;
}[] = [
  { label: "To do", value: BDBoardTaskStatusCategory.todo, color: "gray" },
  {
    label: "In progress",
    value: BDBoardTaskStatusCategory.inProgress,
    color: "blue",
  },
  { label: "Done", value: BDBoardTaskStatusCategory.done, color: "green" },
];

function categoryColor(category: BDBoardTaskStatusCategory): string {
  return (
    CATEGORY_OPTIONS.find((option) => option.value === category)?.color ?? "gray"
  );
}

function seedSections(templateId: string): DraftSection[] {
  const sections = boardTemplateById(templateId)?.sections ?? [];
  return sections.map((section) => ({ ...section, id: uuidv7() }));
}

export function BDBoardDialogComponent({
  open,
  projectId,
  onClose,
  onCreated,
}: BDBoardDialogComponentProps) {
  const { toast } = useBDToast();
  const boards = useBDBoards(projectId);
  const existingKeys = (boards ?? []).map((board) => board.key ?? "");

  const [name, setName] = useState("Board");
  const [key, setKey] = useState("");
  const [keyTouched, setKeyTouched] = useState(false);
  const [templateId, setTemplateId] = useState("kanban");
  const [sections, setSections] = useState<DraftSection[]>(() =>
    seedSections("kanban"),
  );
  const [creating, setCreating] = useState(false);

  const dialogKey = String(open);
  const [prevKey, setPrevKey] = useState(dialogKey);
  if (dialogKey !== prevKey) {
    setPrevKey(dialogKey);
    if (open) {
      setName("Board");
      setKey("");
      setKeyTouched(false);
      setTemplateId("kanban");
      setSections(seedSections("kanban"));
      setCreating(false);
    }
  }

  const derivedKey = deriveBoardKey(name.trim() || "Board", existingKeys);
  const effectiveKey = keyTouched ? key : derivedKey;
  const template = boardTemplateById(templateId);
  const boardType: BDBoardType = template?.type ?? BoardType.kanban;
  const canCreate =
    !!name.trim() && /^[A-Za-z0-9-]+$/.test(effectiveKey.trim()) && !creating;

  const applyTemplate = (id: string) => {
    setTemplateId(id);
    setSections(seedSections(id));
  };

  const updateSection = (id: string, patch: Partial<DraftSection>) =>
    setSections((prev) =>
      prev.map((section) =>
        section.id === id ? { ...section, ...patch } : section,
      ),
    );

  const addSection = () =>
    setSections((prev) => [
      ...prev,
      {
        id: uuidv7(),
        name: "New section",
        category: BDBoardTaskStatusCategory.todo,
        color: "gray",
      },
    ]);

  const insertSectionAfter = (index: number) =>
    setSections((prev) => {
      const next = [...prev];
      next.splice(index + 1, 0, {
        id: uuidv7(),
        name: "New section",
        category: BDBoardTaskStatusCategory.todo,
        color: "gray",
      });
      return next;
    });

  const removeSection = (id: string) =>
    setSections((prev) => prev.filter((section) => section.id !== id));

  const submit = async () => {
    if (!canCreate) return;
    setCreating(true);
    try {
      const cleanSections = sections
        .filter((section) => section.name.trim())
        .map((section, position) => ({
          name: section.name.trim(),
          category: section.category,
          color: section.color,
          status: section.status,
          position,
        }));
      const { board } = await bdBoardRepository.createWithColumns(
        projectId,
        { name: name.trim(), key: effectiveKey.trim().toUpperCase(), type: boardType },
        cleanSections,
      );
      onCreated(board);
      toast({ title: "Board created", status: "success" });
      onClose();
    } finally {
      setCreating(false);
    }
  };

  return (
    <BDModal
      open={open}
      onClose={onClose}
      size="lg"
      closeOnBackdrop={false}
      title="New board"
      description="Name the board, choose a starting point, and shape its sections."
      footer={
        <>
          <BDButton variant="ghost" onClick={onClose}>
            Cancel
          </BDButton>
          <BDButton icon={Plus} disabled={!canCreate} isLoading={creating} onClick={submit}>
            Create board
          </BDButton>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">Name</span>
            <input
              className={FIELD}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Board name"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">
              Key{" "}
              <span className="font-normal text-slate-400">
                (used for task ids, e.g. {effectiveKey || "BOARD"}-1)
              </span>
            </span>
            <input
              className={cn(FIELD, "font-mono uppercase")}
              value={effectiveKey}
              onChange={(event) => {
                setKeyTouched(true);
                setKey(event.target.value.toUpperCase());
              }}
              placeholder="KEY"
            />
          </label>
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-xs font-medium text-slate-600">Template</span>
            <div className="relative">
              <select
                className={cn(FIELD, "appearance-none pr-8")}
                value={templateId}
                onChange={(event) => applyTemplate(event.target.value)}
              >
                {BD_BOARD_TEMPLATES.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </label>
        </div>

        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Sections
            </h3>
            <BDButton size="sm" variant="secondary" icon={Plus} onClick={addSection}>
              Add section
            </BDButton>
          </div>

          {sections.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-400">
              No sections yet. Add one to start.
            </p>
          ) : (
            <BDSortableList
              items={sections}
              getRowId={(section) => section.id}
              onReorder={(ordered) => setSections(ordered)}
              itemClassName="border border-slate-200 bg-white p-2"
              renderItem={(section, index) => (
                <div className="flex items-center gap-2">
                  <input
                    className={cn(FIELD, "flex-1")}
                    value={section.name}
                    placeholder="Section name"
                    onChange={(event) =>
                      updateSection(section.id, { name: event.target.value })
                    }
                  />
                  <select
                    className={cn(FIELD, "w-36")}
                    value={section.category}
                    onChange={(event) => {
                      const category = event.target
                        .value as BDBoardTaskStatusCategory;
                      updateSection(section.id, {
                        category,
                        color: categoryColor(category),
                      });
                    }}
                  >
                    {CATEGORY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => insertSectionAfter(index)}
                    className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    aria-label="Insert section below"
                    title="Insert section below"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              )}
              renderItemActions={(section) => (
                <button
                  type="button"
                  onClick={() => removeSection(section.id)}
                  className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  aria-label="Remove section"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            />
          )}
        </section>
      </div>
    </BDModal>
  );
}

export default BDBoardDialogComponent;
